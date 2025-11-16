#!/bin/bash
# Initialize Let's Encrypt SSL certificates
# Usage: ./init-letsencrypt.sh

set -e

# Load environment variables
if [ -f .env.nginx ]; then
    export $(cat .env.nginx | grep -v '^#' | xargs)
else
    echo "Error: .env.nginx file not found"
    echo "Please copy .env.nginx.example to .env.nginx and configure it"
    exit 1
fi

DOMAIN=${DOMAIN_NAME:-localhost}
EMAIL=${CERTBOT_EMAIL:-admin@example.com}
STAGING=${LETSENCRYPT_STAGING:-0}
SSL_DIR="./ssl"
CERTBOT_DIR="./certbot"

echo "Initializing Let's Encrypt for: $DOMAIN"
echo "Email: $EMAIL"

# Validate domain
if [ "$DOMAIN" = "localhost" ]; then
    echo "Error: Cannot use Let's Encrypt with localhost"
    echo "Use generate-self-signed-cert.sh for local development"
    exit 1
fi

# Create directories
mkdir -p "$SSL_DIR"
mkdir -p "$CERTBOT_DIR/www"
mkdir -p "$CERTBOT_DIR/conf"

# Download recommended TLS parameters
if [ ! -f "$SSL_DIR/options-ssl-nginx.conf" ]; then
    echo "Downloading recommended TLS parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$SSL_DIR/options-ssl-nginx.conf"
fi

if [ ! -f "$SSL_DIR/ssl-dhparams.pem" ]; then
    echo "Downloading recommended DH parameters..."
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$SSL_DIR/ssl-dhparams.pem"
fi

# Create dummy certificate for nginx to start
if [ ! -f "$SSL_DIR/fullchain.pem" ]; then
    echo "Creating dummy certificate for $DOMAIN..."
    mkdir -p "$SSL_DIR/live/$DOMAIN"

    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN"

    cp "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"
fi

# Start nginx with dummy certificate
echo "Starting nginx..."
docker-compose -f docker-compose.nginx.yml up -d nginx

# Wait for nginx to start
echo "Waiting for nginx to start..."
sleep 5

# Delete dummy certificate
echo "Removing dummy certificate..."
rm -rf "$SSL_DIR/live/$DOMAIN"

# Request Let's Encrypt certificate
echo "Requesting Let's Encrypt certificate..."

STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
    STAGING_ARG="--staging"
    echo "Using Let's Encrypt staging environment"
fi

docker-compose -f docker-compose.nginx.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Copy certificates to SSL directory
echo "Copying certificates..."
docker-compose -f docker-compose.nginx.yml run --rm certbot \
    sh -c "cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/letsencrypt/fullchain.pem && \
           cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/letsencrypt/privkey.pem && \
           cp /etc/letsencrypt/live/$DOMAIN/chain.pem /etc/letsencrypt/chain.pem"

# Reload nginx
echo "Reloading nginx..."
docker-compose -f docker-compose.nginx.yml exec nginx nginx -s reload

echo "✓ Let's Encrypt certificate initialized successfully!"
echo ""
echo "Certificate will auto-renew every 12 hours."
echo "To manually renew: docker-compose -f docker-compose.nginx.yml run --rm certbot renew"
