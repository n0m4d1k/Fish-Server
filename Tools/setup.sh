#!/bin/bash

# Update and upgrade the system
sudo apt update && sudo apt upgrade -y

# Install necessary packages
sudo apt install -y python3 python3-venv python3-pip git certbot unattended-upgrades

# Enable unattended upgrades with automatic reboot
sudo dpkg-reconfigure --priority=low unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "true";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# Set up the project directory
PROJECT_DIR="/root/fakepal"
LOG_DIR="${PROJECT_DIR}/log"
SCRIPT_DIR="${PROJECT_DIR}/Tools"
DOMAIN="yourdomain.com"
EMAIL="youremail@example.com"

# Clone your project repository (replace with your repository URL)
# git clone https://your-repository-url.git ${PROJECT_DIR}

# Create necessary directories
mkdir -p ${LOG_DIR}
mkdir -p ${SCRIPT_DIR}
cd ${PROJECT_DIR}

# Set up a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install required Python packages
pip install -r requirements.txt

# Obtain SSL certificate from Let's Encrypt
sudo certbot certonly --standalone -d ${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

# Update the capture-server.py script with the new certificate paths
sed -i "s|context.load_cert_chain(certfile=.*|context.load_cert_chain(certfile=\"/etc/letsencrypt/live/${DOMAIN}/fullchain.pem\", keyfile=\"/etc/letsencrypt/live/${DOMAIN}/privkey.pem\")|" ${SCRIPT_DIR}/capture-server.py

# Create a systemd service file
cat <<EOF | sudo tee /etc/systemd/system/fakepal.service
[Unit]
Description=Web Server for Logging Service
After=network.target

[Service]
ExecStart=${PROJECT_DIR}/venv/bin/python ${SCRIPT_DIR}/capture-server.py
WorkingDirectory=${PROJECT_DIR}
StandardOutput=inherit
StandardError=inherit
User=root
Group=root
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable fakepal.service
sudo systemctl start fakepal.service

# Set up a cron job for log cleanup
(crontab -l 2>/dev/null; echo "0 0 * * * ${PROJECT_DIR}/venv/bin/python ${SCRIPT_DIR}/log_cleanup.py") | crontab -

echo "Setup complete. The service is running, logs will be cleaned up daily, and unattended upgrades with automatic reboot are enabled."
