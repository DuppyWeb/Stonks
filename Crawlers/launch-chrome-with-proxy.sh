#!/bin/bash

# Launch Chrome with proxy configuration
# Usage: ./launch-chrome-with-proxy.sh <proxy_host:port> [username:password]

PROXY_SERVER=proxy.packetstream.io:31112
PROXY_AUTH=duppyweb:c0a26128da050453_country-UnitedKingdom

if [ -z "$PROXY_SERVER" ]; then
    echo "Usage: $0 <proxy_host:port> [username:password]"
    echo "Example: $0 proxy.example.com:8080 user:pass"
    exit 1
fi

# Chrome executable path (adjust if needed)
CHROME_PATH="/usr/bin/chromium-browser"

# Remote debugging port
DEBUG_PORT=9222

# Build Chrome arguments
CHROME_ARGS=(
    --remote-debugging-port=$DEBUG_PORT
    --no-first-run
    --no-default-browser-check
    --proxy-server="$PROXY_SERVER"
)

# Add proxy authentication if provided
if [ -n "$PROXY_AUTH" ]; then
    echo "Proxy authentication will be handled by the crawler"
fi

echo "Starting Chrome with proxy: $PROXY_SERVER"
echo "Remote debugging on port: $DEBUG_PORT"

# Launch Chrome
"$CHROME_PATH" "${CHROME_ARGS[@]}" &

echo "Chrome launched. WebSocket endpoint will be available at ws://127.0.0.1:$DEBUG_PORT"
