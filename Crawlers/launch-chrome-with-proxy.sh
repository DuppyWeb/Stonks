#!/bin/bash

# Launch Chrome with proxy configuration
# Usage: ./launch-chrome-with-proxy.sh <proxy_host:port> [username:password]

# Optional proxy configuration (uncomment to enable)
#PROXY_SERVER=proxy.packetstream.io:31112
#PROXY_AUTH=duppyweb:c0a26128da050453_country-UnitedKingdom

# Allow running without proxy
if [ -z "$PROXY_SERVER" ]; then
    echo "No proxy configured. Chrome will use direct connection."
    PROXY_SERVER="none"
fi

# Chrome executable path (adjust if needed)
CHROME_PATH="/usr/bin/chromium-browser"

# Remote debugging port
DEBUG_PORT=9222

# Chrome data directory
DATA_DIR="../_ChromeDataDir"

# Build Chrome arguments
CHROME_ARGS=(
    --remote-debugging-port=$DEBUG_PORT
    --no-first-run
    --no-default-browser-check
#    --proxy-server="$PROXY_SERVER"
    --start-maximized
    --user-data-dir="$DATA_DIR"
)

# create a small script run_chrome.sh
# x11vnc -display :80 -shared -forever -noxrecord -noxdamage -rfbport 5950 
export DISPLAY=:80
# lightweight window manager so Chromium can be managed (optional)
openbox &> /tmp/openbox.log &



# Add proxy authentication if provided
if [ -n "$PROXY_AUTH" ]; then
    echo "Proxy authentication will be handled by the crawler"
fi

echo "Starting Chrome with proxy: $PROXY_SERVER"
echo "Remote debugging on port: $DEBUG_PORT"
echo "Using DISPLAY: $DISPLAY"
export DISPLAY=:80
# Launch Chrome
"$CHROME_PATH" "${CHROME_ARGS[@]}" &

echo "Chrome launched. WebSocket endpoint will be available at ws://127.0.0.1:$DEBUG_PORT"
