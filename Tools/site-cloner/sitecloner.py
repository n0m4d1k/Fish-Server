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

def setup_logging(debug, log_to_file, log_file_path):
    log_level = logging.DEBUG if debug else logging.INFO
    handlers = [logging.StreamHandler()]
    if log_to_file:
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)
        handlers.append(logging.FileHandler(log_file_path))
    logging.basicConfig(
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # Fixed format string
        level=log_level,
        handlers=handlers
    )

def install_chromium_and_chromedriver():
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
    try:
        output = subprocess.check_output(["chromium-browser", "--version"])
        version = output.decode("utf-8").strip().split()[-1]
        logging.debug(f"Chromium version detected: {version}")
        return version
    except Exception as e:
        logging.error(f"Could not determine Chromium version: {e}")
        return None

def get_chromedriver_path():
    try:
        output = subprocess.check_output(["which", "chromedriver"])
        path = output.decode("utf-8").strip()
        logging.debug(f"ChromeDriver path detected: {path}")
        return path
    except subprocess.CalledProcessError:
        logging.warning("ChromeDriver not found.")
        return None

def add_doctype(html):
    """Add <!DOCTYPE html> if missing."""
    if not html.lower().startswith('<!doctype html>'):
        html = '<!DOCTYPE html>\n' + html
    return html

def clean_html(soup, selective_js_removal=False):
    """Remove or selectively remove JavaScript and other security-related elements."""
    if selective_js_removal:
        for script in soup.find_all('script'):
            if 'recaptcha' in str(script) or 'analytics' in str(script):
                logging.debug(f"Removing selective JS tag: {script}")
                script.decompose()
    else:
        for script in soup.find_all('script'):
            logging.debug(f"Removing JS tag: {script}")
            script.decompose()

    for tag in soup(['meta', 'iframe', 'link']):
        if 'recaptcha' in str(tag) or 'crossorigin' in str(tag):
            logging.debug(f"Removing security-related tag: {tag}")
            tag.decompose()
        elif 'CORS' in str(tag).upper():
            logging.debug(f"Removing CORS-related tag: {tag}")
            tag.decompose()

    return soup

def update_html_references(soup, output_dir):
    """Update asset references in HTML to point to local files."""
    for tag in soup.find_all(['link', 'script', 'img', 'a']):
        attribute = 'src' if tag.name in ['script', 'img'] else 'href'
        asset_url = tag.get(attribute)
        if asset_url:
            asset_file = os.path.join(output_dir, os.path.basename(urlparse(asset_url).path))
            logging.debug(f"Updating asset URL from '{asset_url}' to '{asset_file}'")
            tag[attribute] = asset_file
    return soup

def download_asset(asset_url, tag, attribute, output_dir, user_agent):
    if asset_url.startswith('data:'):
        logging.debug(f"Embedding data URL directly: {asset_url}")
        tag[attribute] = asset_url
        return
    try:
        logging.info(f"Downloading asset from: {asset_url}")
        asset_response = requests.get(asset_url, stream=True, headers={"User-Agent": user_agent})
        asset_response.raise_for_status()
        content_type = asset_response.headers.get('content-type')
        file_extension = mimetypes.guess_extension(content_type) or ''
        asset_file_name = os.path.basename(urlparse(asset_url).path)
        if not asset_file_name:
            asset_file_name = 'asset_' + str(len(os.listdir(output_dir)))
        asset_file = os.path.join(output_dir, asset_file_name + file_extension)
        logging.debug(f"Saving asset as '{asset_file}'")
        with open(asset_file, 'wb') as f:
            asset_response.raw.decode_content = True
            shutil.copyfileobj(asset_response.raw, f)
        return asset_file
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to download asset {asset_url}: {e}")

def clone_login_page(url, output_dir, interactive, debug, log_to_file, disable_js, selective_js_removal):
    setup_logging(debug, log_to_file, os.path.join(output_dir, 'sitecloner.log'))
    
    if not os.path.exists(output_dir):
        logging.info(f"Creating output directory: {output_dir}")
        os.makedirs(output_dir)
    
    if not get_chromedriver_path() or not get_chromium_version():
        if not install_chromium_and_chromedriver():
            logging.critical("Failed to install Chromium or ChromeDriver. Exiting.")
            return

    chromedriver_path = get_chromedriver_path()

    options = webdriver.ChromeOptions()
    options.binary_location = "/usr/bin/chromium-browser"
    user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{get_chromium_version()} Safari/537.36"
    options.add_argument(f"user-agent={user_agent}")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")

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

    soup = clean_html(soup, selective_js_removal=selective_js_removal)

    for tag in soup.find_all(['link', 'script', 'img', 'a']):
        asset_url = tag.get('href') or tag.get('src')
        if asset_url:
            asset_url = urljoin(url, asset_url)
            attribute = 'href' if tag.name == 'link' else 'src'
            asset_file = download_asset(asset_url, tag, attribute, output_dir, user_agent)
            if asset_file:
                tag[attribute] = asset_file

    updated_soup = update_html_references(soup, output_dir)
    updated_html = add_doctype(str(updated_soup))

    html_file = os.path.join(output_dir, 'index.html')
    logging.info(f"Saving updated HTML file as '{html_file}'")
    with open(html_file, 'w') as f:
        f.write(updated_html)

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
    parser.add_argument("--log-to-file", action="store_true", help="Log debug output to a file in the output directory")
    parser.add_argument("--disable-js", action="store_true", help="Completely remove all JavaScript from the page")
    parser.add_argument("--selective-remove-js", action="store_true", help="Remove only specific JavaScript scripts")
    args = parser.parse_args()

    clone_login_page(args.url, args.output_dir, args.interactive, args.debug, args.log_to_file, args.disable_js, args.selective_remove_js)
