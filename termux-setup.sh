#!/data/data/com.termux/files/usr/bin/bash
# ============================================
# Marketplace Scanner — Termux (Android) setup
# ============================================
# 1. Install Termux from F-Droid (NOT Google Play — the Play version is outdated)
#    https://f-droid.org/en/packages/com.termux/
# 2. Open Termux and paste this entire script, or run:
#    curl -sL <your-raw-github-url>/termux-setup.sh | bash
# ============================================

set -e

echo "=== Marketplace Scanner — Android Setup ==="

# Update and install system packages
pkg update -y
pkg install -y python git libxml2 libxslt

# Clone or update the repo
if [ -d "$HOME/marketplace-scanner" ]; then
    echo "Updating existing installation..."
    cd "$HOME/marketplace-scanner"
    git pull || true
else
    echo "Cloning repository..."
    # Replace with your actual repo URL:
    git clone https://github.com/YOUR_USERNAME/djty05.git "$HOME/marketplace-scanner"
    cd "$HOME/marketplace-scanner"
fi

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install Python dependencies (no Playwright on Android)
pip install --upgrade pip
pip install flask requests beautifulsoup4 lxml python-dotenv fake-useragent 'pushbullet.py'

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To run the scanner:"
echo "  cd ~/marketplace-scanner"
echo "  source venv/bin/activate"
echo "  python webapp.py"
echo ""
echo "Then open Chrome and go to: http://localhost:5000"
echo "Tap Chrome menu → 'Add to Home screen' to install as an app"
echo ""
echo "To run in the background (keeps running when Termux is closed):"
echo "  pkg install termux-services"
echo "  nohup python webapp.py > scanner.log 2>&1 &"
echo ""
echo "To get notifications, create a .env file:"
echo "  echo 'PUSHBULLET_API_KEY=your-key' > .env"
echo "  echo 'DISCORD_WEBHOOK_URL=your-url' >> .env"
