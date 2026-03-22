#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== claw-visual pm2 setup ==="

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing pm2..."
    npm install -g pm2
fi

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Warning: .env file not found at $PROJECT_ROOT/.env"
    echo "Please create it before starting the service."
fi

# Install dependencies if needed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$PROJECT_ROOT"
    bun install
fi

# Start with pm2
echo "Starting claw-visual with pm2..."
cd "$PROJECT_ROOT/deploy"
pm2 start ecosystem.config.cjs

# Save pm2 process list
pm2 save

# Setup pm2 startup script for auto-restart on boot
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "=== Setup complete ==="
echo "Service status:"
pm2 status claw-visual

echo ""
echo "Useful commands:"
echo "  pm2 status           # Check status"
echo "  pm2 logs claw-visual # Follow logs"
echo "  pm2 restart claw-visual # Restart"
echo "  pm2 stop claw-visual    # Stop"
