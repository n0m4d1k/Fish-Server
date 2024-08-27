import os
import subprocess
import logging
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from bs4 import BeautifulSoup
import shutil
import requests
from urllib.parse import urljoin, urlparse
import mimetypes
import time
import argparse

def setup_logging(debug):
    """Set up logging based on the debug option."""
    log_level = logging.DEBUG if debug else logging.INFO
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        level=log_level
    )

def install_chromium_and_chromedriver():
    """Install Chromium and ChromeDriver if they are not already installed."""
    try:
        logging.info("Checking for Chromium...")
        subprocess.check_call(["sudo", "apt-get", "install", "-y", "chromium-browser"])
        logging.info("Chromium installed successfully.")
        
        logging.info("Checking for ChromeDriver...")
        subprocess.check_call(["sudo", "apt-get", "install", "-y", "chromium-chromedriver"])
        logging.info("ChromeDriver installed successfully.")

    except subprocess.CalledProcessError as e:
        logging.error(f"An error occurred while installing Chromium or ChromeDriver: {e}")
        return False
    
    return True

def get_chromium_version():
    """Get the installed version of Chromium."""
    try:
        output = subprocess.check_output(["chromium-browser", "--version"])
        version = output.decode("utf-8").strip().split()[-1]
        logging.debug(f"Chromium version detected: {version}")
        return version
    except Exception as e:
        logging.error(f"Could not determine Chromium version: {e}")
        return None

def get_chromedriver_path():
    """Check if ChromeDriver is installed and return its path."""
    try:
        output = subprocess.check_output(["which", "chromedriver"])
        path = output.decode("utf-8").strip()
        logging.debug(f"ChromeDriver path detected: {path}")
        return path
    except subprocess.CalledProcessError:
        logging.warning("ChromeDriver not found.")
        return None

def clone_login_page(url, output_dir, interactive, debug):
    setup_logging(debug)
    
    # Create the output directory if it doesn't exist
    if not os.path.exists(output_dir):
        logging.info(f"Creating output directory: {output_dir}")
        os.makedirs(output_dir)
    
    # Check and install Chromium and ChromeDriver if needed
    if not get_chromedriver_path() or not get_chromium_version():
        if not install_chromium_and_chromedriver():
            logging.critical("Failed to install Chromium or ChromeDriver. Exiting.")
            return

    # Get the installed ChromeDriver path
    chromedriver_path = get_chromedriver_path()

    options = webdriver.ChromeOptions()
    options.binary_location = "/usr/bin/chromium-browser"  # Point to Chromium binary
    user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{get_chromium_version()} Safari/537.36"
    options.add_argument(f"user-agent={user_agent}")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")  # Optional: Run headless if you don't need to see the browser UI

    logging.info("Starting ChromeDriver...")
    driver = webdriver.Chrome(service=ChromeService(chromedriver_path), options=options)

    try:
        logging.info(f"Navigating to URL: {url}")
        driver.get(url)

        if interactive:
            input("Press Enter after the page has fully loaded and you have completed any necessary interactions...")
        else:
            logging.debug("Waiting for the page to load completely...")
            time.sleep(10)

        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')

    except Exception as e:
        logging.error(f"An error occurred during page load: {e}")
    finally:
        logging.info("Closing ChromeDriver.")
        driver.quit()

    # Remove meta refresh tags
    logging.debug("Removing meta refresh tags...")
    for meta in soup.find_all('meta'):
        if meta.get('http-equiv') == 'refresh':
            logging.debug(f"Removing meta tag: {meta}")
            meta.decompose()

    # Remove or modify JavaScript redirections
    logging.debug("Checking for JavaScript redirections...")
    for script in soup.find_all('script'):
        if script.string:
            if 'window.location' in script.string or 'location.href' in script.string:
                logging.debug(f"Removing script tag: {script}")
                script.decompose()

    # Save HTML content
    html_file = os.path.join(output_dir, 'index.html')
    logging.info(f"Saving main HTML file as '{html_file}'")
    with open(html_file, 'w') as f:
        f.write(str(soup))

    # Download and update asset references
    def download_asset(asset_url, tag, attribute):
        if asset_url.startswith('data:'):
            logging.debug(f"Embedding data URL directly: {asset_url}")
            tag[attribute] = asset_url  # Embed the data URL directly
            return
        try:
            logging.info(f"Downloading asset from: {asset_url}")
            asset_response = requests.get(asset_url, stream=True, headers={"User-Agent": user_agent})
            asset_response.raise_for_status()  # Raise an error for bad status codes
            content_type = asset_response.headers.get('content-type')
            file_extension = mimetypes.guess_extension(content_type) or ''
            asset_file_name = os.path.basename(urlparse(asset_url).path)
            if not asset_file_name:  # If the asset file name is empty
                asset_file_name = 'asset_' + str(len(os.listdir(output_dir)))
            asset_file = os.path.join(output_dir, asset_file_name + file_extension)
            logging.debug(f"Saving asset as '{asset_file}'")
            with open(asset_file, 'wb') as f:
                asset_response.raw.decode_content = True
                shutil.copyfileobj(asset_response.raw, f)
            tag[attribute] = asset_file_name + file_extension
        except requests.exceptions.RequestException as e:
            logging.error(f"Failed to download asset {asset_url}: {e}")

    # Find and download assets from the parsed HTML
    logging.info("Processing and downloading assets...")
    for tag in soup.find_all(['link', 'script', 'img']):
        asset_url = tag.get('href') or tag.get('src')
        if asset_url:
            asset_url = urljoin(url, asset_url)
            attribute = 'href' if tag.name == 'link' else 'src'
            download_asset(asset_url, tag, attribute)

    # Save the updated HTML with correct asset paths
    logging.info(f"Saving updated HTML file as '{html_file}'")
    with open(html_file, 'w') as f:
        f.write(str(soup))

    logging.info("Login page cloned successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Clone a login page for educational purposes using Selenium with Chromium",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("url", help="URL of the target login page (e.g., https://www.example.com/login)")
    parser.add_argument("output_dir", help="Output directory to save cloned files")
    parser.add_argument("--interactive", action="store_true", help="Enable interactive mode for manual navigation")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode for verbose output")
    args = parser.parse_args()

    clone_login_page(args.url, args.output_dir, args.interactive, args.debug)
