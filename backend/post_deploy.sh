#!/bin/bash
# Post-deploy script for DigitalOcean
# This runs database migrations after deployment

echo "Running database migrations..."
alembic upgrade head

echo "Seeding achievements..."
python -m app.scripts.seed_achievements

echo "Deployment complete!"
