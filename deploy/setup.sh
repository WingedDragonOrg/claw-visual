#!/bin/bash
set -e

SERVICE_FILE="/home/ubuntu/apps/claw-visual/deploy/claw-visual.service"

echo "=== claw-visual systemd setup ==="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

# Copy service file
cp "$SERVICE_FILE" /etc/systemd/system/claw-visual.service

# Reload systemd
systemctl daemon-reload

# Enable and start
systemctl enable claw-visual
systemctl restart claw-visual

echo "=== Setup complete ==="
echo "Service status: $(systemctl is-active claw-visual)"
echo ""
echo "Useful commands:"
echo "  systemctl status claw-visual   # Check status"
echo "  journalctl -u claw-visual -f  # Follow logs"
echo "  systemctl restart claw-visual  # Restart"
echo "  systemctl stop claw-visual     # Stop"
