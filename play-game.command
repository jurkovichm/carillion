#!/bin/bash
# Double-click to play: serves this folder at http://localhost:8000 and opens the game.
# Keep this file next to index.html. Close this window (or press Ctrl+C) to stop the server.
cd "$(dirname "$0")" || exit 1

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python 3 was not found. Install it from https://www.python.org/downloads/"
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "Starting the game at http://localhost:8000/index.html"
echo "Close this window to stop the server."
echo
( sleep 1; open "http://localhost:8000/index.html" ) &
"$PY" -m http.server 8000 --bind 127.0.0.1

echo
echo "The server stopped. If it failed to start, port 8000 may already be in use."
read -n 1 -s -r -p "Press any key to close..."
