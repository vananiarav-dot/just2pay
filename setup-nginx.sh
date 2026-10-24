#!/bin/bash
set -e

echo ">>> 1. Configuring Nginx for Just2Pay..."
rm -f /etc/nginx/sites-enabled/*

cat > /etc/nginx/sites-available/just2pay << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

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

echo ">>> 2. Testing Nginx configuration..."
nginx -t

echo ">>> 3. Restarting Nginx service..."
systemctl restart nginx

echo ">>> 4. Verifying PM2 process..."
pm2 restart just2pay || pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "========================================================"
echo "🎉 SUCCESS: Just2Pay Nginx Reverse Proxy is configured!"
echo "🌐 Open in browser: http://168.144.157.240"
echo "========================================================"
