#!/bin/bash
# Piano Key Learning — Launcher
# Double-click this file to start the app in your browser

cd "$(dirname "$0")"

# Start server in background
python3 -m http.server 8000 &
SERVER_PID=$!

# Wait for server to be ready
sleep 1

# Open in default browser
open http://localhost:8000

echo "Server running at http://localhost:8000"
echo "Press Ctrl+C to stop"

# Keep running until Ctrl+C
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM
wait $SERVER_PID
