#!/usr/bin/env bash
set -e

pip3 install -r requirements.txt

# Create instance directory for SQLite
mkdir -p instance

# Seed database with sample data if it doesn't exist yet
python3 seed_data.py
