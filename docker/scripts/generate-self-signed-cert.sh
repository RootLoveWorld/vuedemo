#!/bin/bash
# Generate self-signed SSL certificates for development
# Usage: ./generate-self-signed-cert.sh [domain]

set -e

DOMAIN=${1:-localhost}
SSL_DIR="./ssl"
DAYS=365

echo "Generating self-signed SSL certificate for: $DOMAIN"

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/privkey.pem" -out "$SSL_DIR/cert.csr" \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -days $DAYS -in "$SSL_DIR/cert.csr" \
    -signkey "$SSL_DIR/privkey.pem" -out "$SSL_DIR/fullchain.pem" \
    -extfile <(printf "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,DNS:localhost")

# Copy fullchain as chain for OCSP stapling
cp "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"

# Clean up CSR
rm "$SSL_DIR/cert.csr"

# Set proper permissions
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/fullchain.pem"
chmod 644 "$SSL_DIR/chain.pem"

echo "✓ Self-signed certificate generated successfully!"
echo "  Private key: $SSL_DIR/privkey.pem"
echo "  Certificate: $SSL_DIR/fullchain.pem"
echo "  Chain: $SSL_DIR/chain.pem"
echo ""
echo "Note: This is a self-signed certificate for development only."
echo "For production, use Let's Encrypt with the init-letsencrypt.sh script."
