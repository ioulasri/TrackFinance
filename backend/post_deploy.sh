#!/bin/bash
# Post-deploy script for DigitalOcean
# This runs database migrations after deployment

set -e  # Exit on error

echo "Checking database permissions..."
python diagnose_db.py

echo ""
echo "Attempting to fix permissions if needed..."
python fix_db_permissions.py || echo "Warning: Could not automatically fix permissions"

echo ""
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "Seeding achievements..."
python -m app.scripts.seed_achievements

echo ""
echo "✅ Deployment complete!"
