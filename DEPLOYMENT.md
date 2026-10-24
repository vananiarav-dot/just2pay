# DigitalOcean Droplet Deployment Guide for Just2Pay

આ ગાઈડ Just2Pay પ્રોજેક્ટને DigitalOcean Ubuntu 22.04 / 24.04 Droplet પર Nginx, Node.js, PM2 અને SSL સાથે લાઈવ કરવા માટેના તમામ સ્ટેપ્સ આપે છે.

---

## 1. Droplet Create કરવું
1. DigitalOcean કંટ્રોલ પેનલમાં જાઓ ➡️ **Create** ➡️ **Droplets** પર ક્લિક કરો.
2. **OS**: Ubuntu 22.04 LTS અથવા 24.04 LTS પસંદ કરો.
3. **Plan**: Basic (Shared CPU) - $4 અથવા $6/month (1GB / 2GB RAM).
4. **Authentication**: Password અથવા SSH Key સેટ કરો.
5. Droplet બની ગયા પછી તેનો **Public IPv4 Address** કોપી કરો.

---

## 2. Server પર SSH દ્વારા Login કરવું
તમારા કમ્પ્યુટરના Terminal / PowerShell માંથી Droplet માં કનેક્ટ કરો:
```bash
ssh root@YOUR_DROPLET_IP
```

---

## 3. Server Update & Swap Memory સેટઅપ (મહત્વપૂર્ણ)
જો તમારું Droplet 1GB RAM વાળું હોય, તો બિલ્ડ સમયે મેમરી ખૂટે નહીં તે માટે 2GB Swap Memory બનાવવી જરૂરી છે:
```bash
# સિસ્ટમ અપડેટ
sudo apt update && sudo apt upgrade -y

# 2GB Swap બનાવવું
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 4. Node.js 20, Git, PM2 અને Nginx ઇન્સ્ટોલ કરવું
```bash
# Node.js 20 LTS ઇન્સ્ટોલ કરવું
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# વર્ઝન ચેક કરો
node -v
npm -v

# PM2 ઇન્સ્ટોલ કરવું (24/7 સર્વર ચાલુ રાખવા માટે)
sudo npm install -g pm2
```

---

## 5. પ્રોજેક્ટ ક્લોન અને સેટઅપ
```bash
# /var/www ડિરેક્ટરીમાં જવું
cd /var/www

# પ્રોજેક્ટ ક્લોન કરવો
git clone https://github.com/vananiarav-dot/just2pay.git

# ફોલ્ડરમાં જવું
cd just2pay

# Dependencies ઇન્સ્ટોલ કરવી
npm install

# .env ફાઇલ બનાવવી
nano .env
```

`.env` ફાઇલમાં નીચે મુજબની ડિટેલ્સ પેસ્ટ કરો (Ctrl + O અને Enter દબાવીને Save કરો, Ctrl + X થી Exit કરો):
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# UsePay B2B Credentials (જો લાગુ પડતું હોય તો)
USEPAY_BASE_URL=https://www.usepay.in/api/v1/b2b
USEPAY_API_KEY=your_key
USEPAY_SECRET_KEY=your_secret
```

---

## 6. Frontend Build કરવું અને PM2 શરૂ કરવું
```bash
# Frontend બિલ્ડ કરવું (dist ફોલ્ડર બનશે)
npm run build

# PM2 વડે બેકએન્ડ શરૂ કરવું
pm2 start ecosystem.config.cjs

# PM2 સેવ કરવું જેથી રીબૂટ વખતે આપોઆપ શરૂ થાય
pm2 save
pm2 startup
# (જે કમાન્ડ સ્ક્રીન પર દેખાય તે કોપી કરીને રન કરો)
```

PM2 સ્ટેટસ ચેક કરવા માટે:
```bash
pm2 status
pm2 logs just2pay
```

---

## 7. Nginx Reverse Proxy કન્ફિગર કરવું
```bash
# ડિફોલ્ટ સાઈટ હટાવવી
sudo rm /etc/nginx/sites-enabled/default

# Just2Pay માટે Nginx કોન્ફિગ ફાઈલ બનાવવી
sudo nano /etc/nginx/sites-available/just2pay
```

નીચેનું કન્ફિગરેશન પેસ્ટ કરો (જો તમારી પાસે Domain ન હોય તો `server_name` માં Droplet નો IP લખો):
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

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
```

Nginx સાઈટ સક્રિય કરો અને રીસ્ટાર્ટ કરો:
```bash
sudo ln -s /etc/nginx/sites-available/just2pay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. ફ્રી SSL Certificate (HTTPS) સેટઅપ (Optional - જો Domain હોય તો)
જો તમે તમારું Domain પોઇન્ટ કર્યું હોય, તો મફત SSL સેટ કરવા માટે:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 9. ભવિષ્યમાં નવો કોડ અપડેટ કરવા માટે (Update Workflow)
જ્યારે પણ તમે કોડ GitHub પર પુશ કરો, ત્યારે Droplet પર માત્ર નીચેના કમાન્ડ્સ રન કરવાના રહેશે:
```bash
cd /var/www/just2pay
git pull
npm install
npm run build
pm2 restart just2pay
```
