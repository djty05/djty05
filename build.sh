#!/usr/bin/env bash
set -e

pip install -r requirements.txt

# Create instance directory for SQLite
mkdir -p instance

# Seed database with sample data if it doesn't exist yet
python seed_data.py
