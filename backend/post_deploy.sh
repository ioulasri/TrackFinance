#!/bin/bash
# Post-deploy script for DigitalOcean
# This runs database migrations after deployment

set -e  # Exit on error

echo "Setting up database permissions..."
python setup_permissions_admin.py

echo ""
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "Seeding achievements..."
python -m app.scripts.seed_achievements

echo ""
echo "✅ Deployment complete!"
