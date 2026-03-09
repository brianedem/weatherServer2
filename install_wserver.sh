#!/bin/bash
set -e

# Configuration - Modify these variables for your service
SERVICE_NAME="wserver"
SERVICE_USER="wserver"
INSTALL_DIR="/opt/${SERVICE_NAME}"
SOURCE_DIR=$PWD
CONFIG_FILE="wserver.ini"
CONFIG_DIR="/usr/local/etc"
PYTHON_SCRIPT="app.py"
REQUIREMENTS_FILE="requirements.txt"
PYTHON_VERSION="python3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}Installing Python service: ${SERVICE_NAME}${NC}"

# Create service user (if doesn't exist)
echo -e "${YELLOW}Creating service user...${NC}"
if ! id -u ${SERVICE_USER} > /dev/null 2>&1; then
    useradd --system --no-create-home --shell /bin/false ${SERVICE_USER}
    echo "User ${SERVICE_USER} created"
else
    echo "User ${SERVICE_USER} already exists"
fi

# Create installation directory
echo -e "${YELLOW}Setting up installation directory...${NC}"
mkdir -p ${INSTALL_DIR}
cd ${INSTALL_DIR}

# Create virtual environment
echo -e "${YELLOW}Creating Python virtual environment...${NC}"
${PYTHON_VERSION} -m venv venv
source venv/bin/activate

# Copy application files
echo -e "${YELLOW}Copying application files...${NC}"
# Assuming your Python script is in the current directory where you run this installer
# Modify this section based on where your source files are located
if [ -f "${SOURCE_DIR}/${PYTHON_SCRIPT}" ]; then
    cp ${SOURCE_DIR}/${PYTHON_SCRIPT} ${INSTALL_DIR}/
    cp -r ${SOURCE_DIR}/static ${INSTALL_DIR}/
    echo "Copied ${PYTHON_SCRIPT}, static"
else
    echo -e "${RED}Warning: ${PYTHON_SCRIPT} not found in current directory"
    echo "Please manually copy your Python script to ${INSTALL_DIR}/"
fi

# Copy configuration file
echo -e "${YELLOW}Copying ${CONFIG_FILE}...${NC}"
if [ -f "${SOURCE_DIR}/${CONFIG_FILE}" ]; then
    cp ${SOURCE_DIR}/${CONFIG_FILE} ${CONFIG_DIR}/
else
    echo -e "${RED}Warning: ${CONFIG_FILE} not found in current directory${NC}"
    echo "Please create file and manually copy to ${CONFIG_DIR}/${CONFIG_FILE}"
fi

# Install Python dependencies
if [ -f "${SOURCE_DIR}/${REQUIREMENTS_FILE}" ]; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    cp ${SOURCE_DIR}/${REQUIREMENTS_FILE} ${INSTALL_DIR}/
    pip install --upgrade pip
    pip install -r ${REQUIREMENTS_FILE}
else
    echo -e "${YELLOW}Skipping dependencies (no requirements.txt found)${NC}"
fi

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chown -R ${SERVICE_USER}:${SERVICE_USER} ${INSTALL_DIR}
chmod -R 755 ${INSTALL_DIR}

# Create systemd service file
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=${SERVICE_NAME} Python Service
After=network.target influxdb.service mariadb.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
Environment="PATH=${INSTALL_DIR}/venv/bin"
ExecStart=${INSTALL_DIR}/venv/bin/gunicorn app:app --bind=0.0.0.0:8080
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo -e "${YELLOW}Enabling service...${NC}"
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}.service

echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Service management commands:"
echo "  Start service:   sudo systemctl start ${SERVICE_NAME}"
echo "  Stop service:    sudo systemctl stop ${SERVICE_NAME}"
echo "  Restart service: sudo systemctl restart ${SERVICE_NAME}"
echo "  Check status:    sudo systemctl status ${SERVICE_NAME}"
echo "  View logs:       sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "To start the service now, run:"
echo "  sudo systemctl start ${SERVICE_NAME}"
