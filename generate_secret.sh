#!/bin/bash
# Generate a secure random SECRET_KEY for production

echo "Generating secure SECRET_KEY for DigitalOcean..."
echo ""
echo "Use this value in your .do/app.yaml or DigitalOcean dashboard:"
echo ""
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
echo ""
echo "Copy this value and paste it in DigitalOcean as the SECRET_KEY environment variable"
