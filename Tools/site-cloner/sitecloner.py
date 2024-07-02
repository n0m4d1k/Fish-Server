import undetected_chromedriver as uc
from seleniumwire import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import shutil
import os
import argparse
import requests
from urllib.parse import urljoin, urlparse
import mimetypes
import time

def get_chrome_version():
    """Get the installed version of Google Chrome."""
    try:
        version = subprocess.check_output(['google-chrome', '--version']).decode('utf-8')
        version = version.strip().split(' ')[-1]
        return version
    except Exception as e:
        print(f"Could not determine Chrome version: {e}")
        return None

def clone_login_page(url, output_dir, interactive):
    chrome_version = get_chrome_version()
    if not chrome_version:
        print("Failed to get Chrome version. Make sure Google Chrome is installed.")
        return
    
    # Set up undetected Chrome WebDriver
    options = uc.ChromeOptions()
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager(version=chrome_version).install()), options=options)
    
    try:
        # Load the page
        driver.get(url)
        
        if interactive:
            # Wait until the user confirms that the page is fully loaded and ready
            input("Press Enter after the page has fully loaded and you have completed any necessary interactions...")
        else:
            # Wait for the page to load completely
            time.sleep(10)

        # Capture network requests
        network_requests = driver.requests
    except Exception as e:
        print(f"Failed to load the page: {e}")
        driver.quit()
        return

    # Parse HTML content
    page_source = driver.page_source
    soup = BeautifulSoup(page_source, 'html.parser')
    driver.quit()

    # Remove meta refresh tags
    for meta in soup.find_all('meta'):
        if meta.get('http-equiv') == 'refresh':
            meta.decompose()

    # Remove or modify JavaScript redirections
    for script in soup.find_all('script'):
        if script.string:
            if 'window.location' in script.string or 'location.href' in script.string:
                script.decompose()

    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
        except OSError as e:
            print(f"Error creating directory {output_dir}: {e}")
            return

    # Save HTML content
    html_file = os.path.join(output_dir, 'index.html')
    with open(html_file, 'w') as f:
        f.write(str(soup))
    print(f"Main HTML file saved as '{html_file}'")

    # Download and update asset references
    def download_asset(asset_url, tag, attribute):
        if asset_url.startswith('data:'):
            print(f"Embedding data URL: {asset_url}")
            tag[attribute] = asset_url  # Embed the data URL directly
            return
        try:
            asset_response = requests.get(asset_url, stream=True)
            asset_response.raise_for_status()  # Raise an error for bad status codes
            content_type = asset_response.headers.get('content-type')
            file_extension = mimetypes.guess_extension(content_type) or ''
            asset_file_name = os.path.basename(urlparse(asset_url).path)
            if not asset_file_name:  # If the asset file name is empty
                asset_file_name = 'asset_' + str(len(os.listdir(output_dir)))
            asset_file = os.path.join(output_dir, asset_file_name + file_extension)
            with open(asset_file, 'wb') as f:
                asset_response.raw.decode_content = True
                shutil.copyfileobj(asset_response.raw, f)
            tag[attribute] = asset_file_name + file_extension
            print(f"Asset saved as '{asset_file}'")
        except requests.exceptions.RequestException as e:
            print(f"Failed to download asset {asset_url}: {e}")

    # Find and download assets from captured network requests
    for request in network_requests:
        if request.response and 'text/css' in request.response.headers.get('Content-Type', ''):
            download_asset(request.url, request)

    # Find and download assets from the parsed HTML
    for tag in soup.find_all(['link', 'script', 'img']):
        asset_url = tag.get('href') or tag.get('src')
        if asset_url:
            asset_url = urljoin(url, asset_url)
            attribute = 'href' if tag.name == 'link' else 'src'
            download_asset(asset_url, tag, attribute)

    # Save the updated HTML with correct asset paths
    with open(html_file, 'w') as f:
        f.write(str(soup))
    print(f"Updated HTML file saved as '{html_file}'")

    print("Login page cloned successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clone a login page for educational purposes using undetected Chrome",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("url", help="URL of the target login page (e.g., https://www.example.com/login)")
    parser.add_argument("output_dir", help="Output directory to save cloned files")
    parser.add_argument("--interactive", action="store_true", help="Enable interactive mode for manual navigation")
    args = parser.parse_args()

    clone_login_page(args.url, args.output_dir, args.interactive)
