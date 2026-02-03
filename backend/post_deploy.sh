#!/bin/bash
# Post-deploy script for DigitalOcean
# This runs database migrations after deployment

echo "Setting up database..."
python setup_database.py

echo "Deployment complete!"
