#!/usr/bin/env bash
set -e

# Activate the Render venv where pip installed our packages
if [ -f /opt/render/project/src/.venv/bin/activate ]; then
    source /opt/render/project/src/.venv/bin/activate
fi

echo "Using Python: $(which python)"
python --version
python -c "import flask; print(f'Flask {flask.__version__} loaded')"

exec python run.py
