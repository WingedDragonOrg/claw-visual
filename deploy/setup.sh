#!/bin/bash
set -e

echo "=== claw-visual systemd setup ==="

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

cp "$(dirname "$0")/claw-visual.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable claw-visual
systemctl restart claw-visual

echo "=== Setup complete ==="
echo "Status: $(systemctl is-active claw-visual)"
echo ""
echo "Commands:"
echo "  systemctl status claw-visual   # Check status"
echo "  journalctl -u claw-visual -f  # Follow logs"
echo "  systemctl restart claw-visual # Restart"
