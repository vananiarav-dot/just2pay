#!/bin/bash
set -e

echo ">>> 1. Updating Nginx server_name for just2pay.in..."
cat > /etc/nginx/sites-available/just2pay << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name just2pay.in www.just2pay.in;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/just2pay /etc/nginx/sites-enabled/just2pay
nginx -t
systemctl reload nginx

echo ">>> 2. Installing Certbot for Free SSL..."
apt update
apt install -y certbot python3-certbot-nginx

echo ">>> 3. Generating and configuring Let's Encrypt SSL Certificate..."
certbot --nginx -d just2pay.in -d www.just2pay.in --non-interactive --agree-tos -m admin@just2pay.in --redirect

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: SSL Certificate is installed and active!"
echo "🔒 Your website is now secured at: https://just2pay.in"
echo "=========================================================="
