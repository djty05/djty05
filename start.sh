#!/usr/bin/env bash
set -e

# Find whichever python is available
if command -v python &> /dev/null; then
    PY=python
elif command -v python3 &> /dev/null; then
    PY=python3
else
    # Try the venv python directly
    PY=/opt/render/project/src/.venv/bin/python
fi

echo "Using Python: $PY"
echo "Python location: $(which $PY 2>/dev/null || echo $PY)"
$PY --version

exec $PY run.py
