#!/bin/bash
set -e

DOMAIN="aqi.shaxbozaka.cc"
EMAIL="admin@shaxbozaka.cc"  # Change this to your email

echo "🔐 Initializing SSL certificate for $DOMAIN..."

# Create required directories
mkdir -p certbot/conf certbot/www

# Create a temporary nginx config for initial certificate
cat > nginx/nginx-init.conf << 'INITCONF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name aqi.shaxbozaka.cc;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'Setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
INITCONF

# Start nginx with init config
echo "📦 Starting nginx for certificate verification..."
docker run -d --name nginx-init \
    -p 80:80 \
    -v $(pwd)/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot \
    nginx:alpine

# Wait for nginx to start
sleep 3

# Get the certificate
echo "🔑 Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Stop and remove init nginx
docker stop nginx-init && docker rm nginx-init
rm nginx/nginx-init.conf

echo "✅ SSL certificate obtained successfully!"
echo ""
echo "Now run: docker-compose up -d"
