# 🚀 Deployment Guide - Expense AI Chatbot

Hướng dẫn deploy ứng dụng lên VPS sử dụng Docker và Nginx.

---

## 📑 Mục lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
3. [Chuẩn bị VPS](#-bước-1-chuẩn-bị-vps)
4. [Chuyển domain từ Vercel/Render](#-bước-2-chuyển-domain-từ-vercelrender)
5. [Clone Repository](#-bước-3-clone-repository)
6. [Cấu hình Environment](#️-bước-4-cấu-hình-environment)
7. [Cấu hình SSL](#-bước-5-cấu-hình-ssl-lets-encrypt)
8. [Build và Deploy](#-bước-6-build-và-deploy)
9. [Verify Deployment](#-bước-7-verify-deployment)
10. [Commands thường dùng](#-commands-thường-dùng)
11. [CI/CD với GitHub Actions](#-cicd-với-github-actions)
12. [Backup & Restore](#-backup--restore)
13. [Monitoring & Logging](#-monitoring--logging)
14. [Troubleshooting](#-troubleshooting)
15. [Security Best Practices](#-security-best-practices)

---

## 📋 Yêu cầu hệ thống

### VPS Requirements

| Resource | Minimum | Khuyến nghị | Ghi chú |
|----------|---------|-------------|---------|
| RAM | 2 GB | 4 GB | Dưới 2GB cần thêm swap |
| CPU | 1 vCPU | 2 vCPU | Build Docker cần CPU |
| Storage | 20 GB SSD | 40 GB SSD | Docker images chiếm ~2-3GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | Hoặc Debian 11+ |
| Network | Public IP | Public IP | Cần cho SSL certificate |

### Chuẩn bị trước

- [ ] VPS đã được tạo và có thể SSH vào
- [ ] Domain đã mua (mimichatbot.fun)
- [ ] Database PostgreSQL đã setup và có connection string
- [ ] API keys: HYPERBOLIC_API_KEY

---

## 🏗️ Kiến trúc hệ thống

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                         VPS                              │
                          │  ┌─────────────────────────────────────────────────────┐ │
    Internet              │  │              Docker Network                         │ │
        │                 │  │                                                     │ │
        ▼                 │  │   ┌─────────────┐      ┌─────────────┐             │ │
  ┌──────────┐            │  │   │   Nginx     │      │   Certbot   │             │ │
  │  Users   │───────────────▶│  │ (Port 80/443)│      │  (SSL Cert) │             │ │
  └──────────┘            │  │   └──────┬──────┘      └─────────────┘             │ │
                          │  │          │                                          │ │
                          │  │    ┌─────┴─────┐                                    │ │
                          │  │    │           │                                    │ │
                          │  │    ▼           ▼                                    │ │
                          │  │ ┌─────┐    ┌─────────┐                             │ │
                          │  │ │ Web │    │   API   │                             │ │
                          │  │ │React│    │ NestJS  │                             │ │
                          │  │ │:80  │    │ :4000   │                             │ │
                          │  │ └─────┘    └────┬────┘                             │ │
                          │  │                 │                                   │ │
                          │  └─────────────────┼───────────────────────────────────┘ │
                          └────────────────────┼─────────────────────────────────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  External Database  │
                                    │    PostgreSQL       │
                                    └─────────────────────┘
```

### Các components

| Component | Image | Port | Mô tả |
|-----------|-------|------|-------|
| **nginx** | nginx:alpine | 80, 443 | Reverse proxy, SSL termination |
| **web** | Custom (Nginx) | 80 (internal) | Serve React static files |
| **api** | Custom (Node.js) | 4000 (internal) | NestJS REST API |
| **certbot** | certbot/certbot | - | SSL certificate renewal |

---

## 🔧 Bước 1: Chuẩn bị VPS

### 1.1 Kết nối SSH

```bash
# Kết nối với password
ssh root@YOUR_VPS_IP

# Hoặc với SSH key (khuyến nghị)
ssh -i ~/.ssh/your_key root@YOUR_VPS_IP
```

### 1.2 Tạo user mới (khuyến nghị, không dùng root)

```bash
# Tạo user mới
adduser deploy

# Thêm vào sudo group
usermod -aG sudo deploy

# Chuyển sang user mới
su - deploy
```

### 1.3 Cài đặt Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Cài đặt dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Thêm Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Thêm user vào docker group (không cần sudo)
sudo usermod -aG docker $USER

# Áp dụng group mới (hoặc logout và login lại)
newgrp docker

# Verify cài đặt
docker --version
docker compose version
```

### 1.4 Cấu hình Firewall

```bash
# Enable UFW
sudo ufw enable

# Cho phép SSH (QUAN TRỌNG - làm trước!)
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Kiểm tra status
sudo ufw status
```

**Output mong đợi:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### 1.5 Cài đặt tools bổ sung

```bash
# Git, htop, nano
sudo apt install -y git htop nano

# Cài đặt fail2ban (bảo mật SSH)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 🌐 Bước 2: Chuyển domain từ Vercel/Render

> ⚠️ **Quan trọng**: Thực hiện bước này sau khi VPS đã sẵn sàng để giảm downtime.

### 2.1 Xóa domain khỏi Vercel

1. Đăng nhập [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project → **Settings** → **Domains**
3. Click **Remove** cho `mimichatbot.fun` và `www.mimichatbot.fun`
4. Xác nhận xóa

### 2.2 Xóa domain khỏi Render

1. Đăng nhập [Render Dashboard](https://dashboard.render.com)
2. Chọn service → **Settings** → **Custom Domains**
3. Click **Delete** cho domain
4. Xác nhận xóa

### 2.3 Cập nhật DNS Records

Truy cập DNS provider của bạn (Cloudflare, Namecheap, GoDaddy, etc.)

**Xóa records cũ:**
- Xóa CNAME trỏ về `cname.vercel-dns.com`
- Xóa CNAME trỏ về `*.onrender.com`

**Thêm records mới:**

| Type | Name | Value | TTL | Proxy |
|------|------|-------|-----|-------|
| **A** | `@` | `YOUR_VPS_IP` | Auto/300 | DNS only |
| **A** | `www` | `YOUR_VPS_IP` | Auto/300 | DNS only |

> **Lưu ý cho Cloudflare**: Tắt Proxy (chuyển về "DNS only" - biểu tượng màu xám) để SSL của Let's Encrypt hoạt động đúng.

### 2.4 Kiểm tra DNS propagation

```bash
# Trên máy local hoặc VPS
nslookup mimichatbot.fun

# Hoặc dùng dig
dig mimichatbot.fun +short
dig www.mimichatbot.fun +short
```

**Online tools:**
- https://dnschecker.org/#A/mimichatbot.fun
- https://www.whatsmydns.net/#A/mimichatbot.fun

DNS propagation thường mất **5 phút - 24 giờ**. Chờ đến khi các server đều hiển thị IP VPS của bạn.

---

## 📥 Bước 3: Clone Repository

```bash
# Tạo thư mục
cd /opt
sudo mkdir expense-ai
sudo chown $USER:$USER expense-ai
cd expense-ai

# Clone repository
git clone https://github.com/YOUR_USERNAME/expense-ai-chatbot.git .

# Kiểm tra files
ls -la
```

**Cấu trúc thư mục sau khi clone:**
```
/opt/expense-ai/
├── apps/
│   ├── api/        # NestJS backend
│   └── web/        # React frontend
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── web.nginx.conf
│   └── env.production.example
├── prisma/
├── docker-compose.yml
├── DEPLOYMENT.md
└── ...
```

---

## ⚙️ Bước 4: Cấu hình Environment

### 4.1 Tạo file .env

```bash
# Copy template
cp docker/env.production.example .env

# Edit với nano (hoặc vim)
nano .env
```

### 4.2 Cập nhật các giá trị

```env
# ================================
# Production Environment Variables
# ================================

# --------------------------------
# Database
# --------------------------------
DATABASE_URL=postgresql://username:password@db-host:5432/expense?schema=public

# --------------------------------
# API Configuration
# --------------------------------
NODE_ENV=production
JWT_SECRET=your_super_secret_key_at_least_32_characters
JWT_EXPIRES_IN=7d
PORT=4000
APP_TIMEZONE=Asia/Ho_Chi_Minh

# AI Service
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=your_actual_api_key_here
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking

# --------------------------------
# Frontend
# --------------------------------
VITE_API_BASE_URL=https://mimichatbot.fun/api

# CORS
WEB_ORIGIN=https://mimichatbot.fun,https://www.mimichatbot.fun

# --------------------------------
# SSL
# --------------------------------
DOMAIN=mimichatbot.fun
CERTBOT_EMAIL=your_email@example.com
```

### 4.3 Generate JWT Secret

```bash
# Generate random 32-byte secret
openssl rand -base64 32
```

Copy output và paste vào `JWT_SECRET`.

### 4.4 Kiểm tra kết nối database

```bash
# Test connection từ VPS
sudo apt install -y postgresql-client

psql "postgresql://username:password@db-host:5432/expense"
```

Nếu không kết nối được, kiểm tra:
- Database server có cho phép remote connections không
- Firewall của database server có mở port 5432 không
- IP của VPS có được whitelist không

---

## 🔒 Bước 5: Cấu hình SSL (Let's Encrypt)

### 5.1 Tạo thư mục certbot

```bash
mkdir -p certbot/conf certbot/www
```

### 5.2 Tạo nginx config tạm thời

```bash
cat > docker/nginx/nginx-init.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name mimichatbot.fun www.mimichatbot.fun;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 200 'Expense AI Chatbot - Setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

### 5.3 Chạy nginx tạm thời

```bash
docker run -d --name nginx-init \
  -p 80:80 \
  -v $(pwd)/docker/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/certbot/www:/var/www/certbot \
  nginx:alpine
```

### 5.4 Kiểm tra nginx đang chạy

```bash
# Kiểm tra container
docker ps

# Test từ VPS
curl http://localhost

# Test từ internet (thay YOUR_EMAIL)
curl http://mimichatbot.fun
```

### 5.5 Lấy SSL certificate

```bash
# Thay YOUR_EMAIL@example.com bằng email thật
docker run --rm \
  -v $(pwd)/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --no-eff-email \
  -d mimichatbot.fun \
  -d www.mimichatbot.fun
```

**Output thành công:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/mimichatbot.fun/fullchain.pem
Key is saved at: /etc/letsencrypt/live/mimichatbot.fun/privkey.pem
```

### 5.6 Dọn dẹp nginx tạm

```bash
# Stop và remove nginx tạm
docker stop nginx-init && docker rm nginx-init

# Xóa config tạm
rm docker/nginx/nginx-init.conf
```

### 5.7 Xác nhận certificate

```bash
ls -la certbot/conf/live/mimichatbot.fun/
```

**Files cần có:**
- `fullchain.pem` - Certificate + intermediate
- `privkey.pem` - Private key
- `cert.pem` - Certificate
- `chain.pem` - Intermediate certificate

---

## 🐳 Bước 6: Build và Deploy

### 6.1 Build Docker images

```bash
# Build tất cả images (lần đầu mất 5-10 phút)
docker compose build

# Hoặc build với logs chi tiết
docker compose build --progress=plain
```

### 6.2 Khởi chạy services

```bash
# Chạy tất cả services ở chế độ detached
docker compose up -d

# Xem logs realtime
docker compose logs -f
```

### 6.3 Kiểm tra containers

```bash
docker compose ps
```

**Output mong đợi:**
```
NAME              IMAGE                COMMAND                  SERVICE    STATUS
expense-api       expense-ai-api       "sh -c 'npx prisma..."  api        Up 30 seconds (healthy)
expense-web       expense-ai-web       "nginx -g 'daemon o..."  web        Up 30 seconds
expense-nginx     nginx:alpine         "nginx -g 'daemon o..."  nginx      Up 30 seconds
expense-certbot   certbot/certbot      "/bin/sh -c 'trap e..."  certbot    Up 30 seconds
```

---

## ✅ Bước 7: Verify Deployment

### 7.1 Test từ command line

```bash
# Test HTTPS redirect
curl -I http://mimichatbot.fun
# Expect: HTTP/1.1 301 Moved Permanently

# Test API
curl https://mimichatbot.fun/api/health
# Expect: {"status":"ok"} hoặc response từ API

# Test frontend
curl -I https://mimichatbot.fun
# Expect: HTTP/2 200
```

### 7.2 Test từ browser

1. Mở https://mimichatbot.fun
2. Kiểm tra SSL certificate (click icon 🔒)
3. Thử đăng ký/đăng nhập
4. Kiểm tra các chức năng chính

### 7.3 Kiểm tra logs nếu có lỗi

```bash
# Logs tất cả services
docker compose logs

# Logs từng service
docker compose logs api
docker compose logs web
docker compose logs nginx

# Logs realtime
docker compose logs -f api
```

---

## 🔄 Commands thường dùng

### Service management

```bash
# Restart tất cả services
docker compose restart

# Restart một service
docker compose restart api

# Stop tất cả
docker compose down

# Stop và xóa volumes
docker compose down -v

# Rebuild và restart một service
docker compose up -d --build api
```

### Database operations

```bash
# Chạy Prisma migrations
docker compose exec api npx prisma migrate deploy

# Prisma Studio (browser UI)
docker compose exec api npx prisma studio

# Database seed
docker compose exec api npx prisma db seed
```

### Container access

```bash
# Vào shell của API container
docker compose exec api sh

# Vào shell của Web container
docker compose exec web sh

# Xem environment variables
docker compose exec api env
```

### Logs và debugging

```bash
# Xem logs với timestamp
docker compose logs -t api

# Xem 100 dòng cuối
docker compose logs --tail=100 api

# Follow logs
docker compose logs -f api

# Xem tất cả logs
docker compose logs
```

---

## 🔄 Update Deployment

Khi có code mới:

```bash
cd /opt/expense-ai

# 1. Pull code mới
git pull origin main

# 2. Rebuild và restart
docker compose up -d --build

# 3. Chạy migrations (nếu có)
docker compose exec api npx prisma migrate deploy

# 4. Kiểm tra logs
docker compose logs -f

# 5. Verify
curl https://mimichatbot.fun/api/health
```

### Rollback nếu có lỗi

```bash
# Xem git history
git log --oneline -10

# Rollback về commit trước
git checkout HEAD~1

# Rebuild
docker compose up -d --build
```

---

## 🔁 CI/CD với GitHub Actions

### Tạo file workflow

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/expense-ai
            git pull origin main
            docker compose up -d --build
            docker compose exec -T api npx prisma migrate deploy
```

### Setup GitHub Secrets

Vào GitHub repo → Settings → Secrets → Actions, thêm:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | IP của VPS |
| `VPS_USER` | `deploy` (hoặc username của bạn) |
| `VPS_SSH_KEY` | Private SSH key |

---

## 💾 Backup & Restore

### Backup thủ công

```bash
# Backup environment
cp /opt/expense-ai/.env /opt/expense-ai/backups/.env.$(date +%Y%m%d)

# Backup SSL certificates
sudo tar -czvf /opt/expense-ai/backups/certbot-$(date +%Y%m%d).tar.gz /opt/expense-ai/certbot/
```

### Cron job backup tự động

```bash
# Edit crontab
crontab -e

# Thêm dòng này (backup mỗi ngày lúc 2AM)
0 2 * * * tar -czvf /opt/backups/expense-ai-$(date +\%Y\%m\%d).tar.gz /opt/expense-ai/.env /opt/expense-ai/certbot/
```

---

## 📊 Monitoring & Logging

### Resource monitoring

```bash
# Realtime resource usage
docker stats

# System resources
htop

# Disk usage
df -h

# Docker disk usage
docker system df
```

### Log rotation

Docker tự động rotate logs, nhưng có thể config thêm trong `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Sau đó restart Docker:
```bash
sudo systemctl restart docker
```

### SSL Auto-Renewal

Certbot container tự động renew SSL mỗi 12 giờ. Test thủ công:

```bash
docker compose exec certbot certbot renew --dry-run
```

---

## 🚨 Troubleshooting

### Container không start

```bash
# Xem logs
docker compose logs [service_name]

# Kiểm tra exit code
docker compose ps -a

# Kiểm tra config
docker compose config
```

### API không kết nối được database

1. Kiểm tra `DATABASE_URL` trong `.env`
2. Test connection từ VPS:
   ```bash
   psql "postgresql://user:pass@host:5432/db"
   ```
3. Kiểm tra firewall của database server
4. Kiểm tra whitelist IP

### SSL Certificate issues

```bash
# Xem certificates
docker compose exec certbot certbot certificates

# Force renewal
docker compose exec certbot certbot renew --force-renewal

# Restart nginx sau renewal
docker compose restart nginx
```

### 502 Bad Gateway

1. Kiểm tra API container đang chạy:
   ```bash
   docker compose ps api
   ```
2. Kiểm tra logs:
   ```bash
   docker compose logs api
   ```
3. Kiểm tra healthcheck:
   ```bash
   docker compose exec nginx curl http://api:4000/api/health
   ```

### Out of memory

```bash
# Kiểm tra memory usage
docker stats
free -h

# Thêm swap (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist swap
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Disk đầy

```bash
# Kiểm tra disk
df -h

# Dọn Docker
docker system prune -a

# Dọn logs cũ
sudo journalctl --vacuum-time=7d
```

---

## 🛡️ Security Best Practices

### 1. SSH Security

```bash
# Đổi port SSH (optional)
sudo nano /etc/ssh/sshd_config
# Đổi: Port 22 → Port 2222

# Disable root login
# PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 2. Firewall

```bash
# Chỉ cho phép các ports cần thiết
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
```

### 3. Auto-updates

```bash
# Cài đặt unattended-upgrades
sudo apt install unattended-upgrades

# Enable
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 4. Environment security

- Không commit `.env` vào git
- Sử dụng strong passwords
- Rotate secrets định kỳ
- Giới hạn database access bằng IP whitelist

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra logs: `docker compose logs`
2. Kiểm tra section Troubleshooting ở trên
3. Mở issue trên GitHub repository
