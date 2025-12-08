#!/bin/bash
# Find the active display
export DISPLAY=$(who | grep -oP ':\d+' | head -1)
echo $DISPLAY
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0
fi
export XAUTHORITY=/run/user/$(id -u)/gdm/Xauthority
chromium --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir=./_ChromeDataDir --no-first-run --no-default-browser-check &