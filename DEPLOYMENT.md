# 🚀 Deployment Guide - Expense AI Chatbot

Hướng dẫn deploy ứng dụng lên VPS sử dụng Docker, Nginx và **Cloudflare SSL**.

---

## 📑 Mục lục

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Kiến trúc hệ thống](#️-kiến-trúc-hệ-thống)
3. [Chuẩn bị VPS](#-bước-1-chuẩn-bị-vps)
4. [Cấu hình Cloudflare](#-bước-2-cấu-hình-cloudflare)
5. [Clone Repository](#-bước-3-clone-repository)
6. [Cấu hình Environment](#️-bước-4-cấu-hình-environment)
7. [Build và Deploy](#-bước-5-build-và-deploy)
8. [Verify Deployment](#-bước-6-verify-deployment)
9. [Commands thường dùng](#-commands-thường-dùng)
10. [Update Deployment](#-update-deployment)
11. [Troubleshooting](#-troubleshooting)

---

## 📋 Yêu cầu hệ thống

| Resource | Minimum | Khuyến nghị |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 vCPU | 2 vCPU |
| Storage | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 🏗️ Kiến trúc hệ thống

```
    User (HTTPS)
         │
         ▼
  ┌─────────────┐
  │  Cloudflare │  ← SSL termination, DDoS protection, CDN
  │  (Proxied)  │
  └──────┬──────┘
         │ HTTP (port 80)
         ▼
  ┌─────────────────────────────────────┐
  │              VPS                     │
  │  ┌─────────────────────────────────┐│
  │  │         Docker Network          ││
  │  │                                 ││
  │  │  ┌───────┐                      ││
  │  │  │ Nginx │ ← Reverse proxy      ││
  │  │  │ :80   │                      ││
  │  │  └───┬───┘                      ││
  │  │      │                          ││
  │  │  ┌───┴───┐                      ││
  │  │  │       │                      ││
  │  │  ▼       ▼                      ││
  │  │┌─────┐ ┌─────────┐              ││
  │  ││ Web │ │   API   │              ││
  │  ││React│ │ NestJS  │──────────────┼┼──► External DB
  │  │└─────┘ └─────────┘              ││
  │  └─────────────────────────────────┘│
  └─────────────────────────────────────┘
```

**Lợi ích của Cloudflare Proxy:**
- ✅ SSL tự động (không cần Let's Encrypt)
- ✅ DDoS protection
- ✅ CDN caching
- ✅ Ẩn IP thật của VPS
- ✅ Cấu hình đơn giản hơn

---

## 🔧 Bước 1: Chuẩn bị VPS

### 1.1 Kết nối SSH

```bash
ssh root@YOUR_VPS_IP
# Hoặc
ssh deploy@YOUR_VPS_IP
```

### 1.2 Tạo user deploy (nếu chưa có)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 1.3 Cài đặt Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER
newgrp docker

# Cài đặt Docker Compose
sudo apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### 1.4 Cấu hình Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (Cloudflare sẽ gửi request qua port này)
sudo ufw enable
```

> ⚠️ **Lưu ý**: Không cần mở port 443 vì Cloudflare xử lý SSL.

---

## 🌐 Bước 2: Cấu hình Cloudflare

### 2.1 Đăng nhập Cloudflare
Vào https://dash.cloudflare.com → Chọn domain **mimichatbot.fun** → **DNS**

### 2.2 Cập nhật DNS Records

**Xóa records cũ** trỏ về Vercel/Render (CNAME records)

**Thêm/Sửa records mới:**

| Type | Name | Content | Proxy status |
|------|------|---------|--------------|
| A | `@` | `185.128.227.231` | **Proxied** (đám mây 🟠) |
| A | `www` | `185.128.227.231` | **Proxied** (đám mây 🟠) |

> ✅ Giữ **Proxied** (màu cam) để Cloudflare xử lý SSL

### 2.3 Cấu hình SSL/TLS

1. Vào **SSL/TLS** ở sidebar
2. Chọn tab **Overview**
3. Đặt mode: **Full** (không phải Full Strict)

```
┌─────────────────────────────────────────────────┐
│  SSL/TLS encryption mode                        │
│                                                 │
│  ○ Off (not secure)                            │
│  ○ Flexible                                     │
│  ● Full           ← CHỌN CÁI NÀY               │
│  ○ Full (strict)                               │
└─────────────────────────────────────────────────┘
```

### 2.4 Bật Always Use HTTPS

1. Vào **SSL/TLS** → **Edge Certificates**
2. Bật **Always Use HTTPS**: ON

### 2.5 Kiểm tra DNS

Chờ 2-5 phút, rồi kiểm tra:

```bash
nslookup mimichatbot.fun
```

Bạn sẽ thấy IP của Cloudflare (không phải IP VPS) - đó là đúng!

---

## 📥 Bước 3: Clone Repository

```bash
cd /opt
sudo mkdir expense-ai
sudo chown $USER:$USER expense-ai
cd expense-ai

git clone https://github.com/YOUR_USERNAME/expense-ai-chatbot.git .
```

---

## ⚙️ Bước 4: Cấu hình Environment

### 4.1 Tạo file .env

```bash
cp docker/env.production.example .env
nano .env
```

### 4.2 Cập nhật các giá trị

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# API
NODE_ENV=production
JWT_SECRET=your_super_secret_key_32_chars_min
JWT_EXPIRES_IN=7d
PORT=4000
APP_TIMEZONE=Asia/Ho_Chi_Minh

# AI Service
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=your_api_key
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking

# Frontend
VITE_API_BASE_URL=https://mimichatbot.fun/api

# CORS
WEB_ORIGIN=https://mimichatbot.fun,https://www.mimichatbot.fun
```

### 4.3 Generate JWT Secret

```bash
openssl rand -base64 32
```

---

## 🐳 Bước 5: Build và Deploy

```bash
# Build images (lần đầu mất 5-10 phút)
docker compose build

# Khởi chạy
docker compose up -d

# Xem logs
docker compose logs -f
```

---

## ✅ Bước 6: Verify Deployment

### 6.1 Kiểm tra containers

```bash
docker compose ps
```

**Output mong đợi:**
```
NAME              STATUS
expense-api       Up (healthy)
expense-web       Up
expense-nginx     Up
```

### 6.2 Test từ command line

```bash
# Test health check
curl http://localhost/health

# Test API (từ VPS)
curl http://localhost/api/health
```

### 6.3 Test từ browser

Mở https://mimichatbot.fun

- ✅ Trang load thành công
- ✅ Có biểu tượng 🔒 (SSL)
- ✅ Đăng nhập/đăng ký hoạt động

---

## 🔄 Commands thường dùng

```bash
# Restart services
docker compose restart

# Stop all
docker compose down

# Xem logs
docker compose logs -f [api|web|nginx]

# Rebuild một service
docker compose up -d --build api

# Chạy migrations
docker compose exec api npx prisma migrate deploy

# Vào shell container
docker compose exec api sh
```

---

## 🔄 Update Deployment

Khi có code mới:

```bash
cd /opt/expense-ai

# Pull code mới
git pull origin main

# Rebuild và restart
docker compose up -d --build

# Chạy migrations (nếu có)
docker compose exec api npx prisma migrate deploy

# Kiểm tra logs
docker compose logs -f
```

---

## 🚨 Troubleshooting

### 502 Bad Gateway

```bash
# Kiểm tra API đang chạy
docker compose ps
docker compose logs api
```

### Container không start

```bash
docker compose logs [service_name]
```

### API không kết nối database

1. Check `DATABASE_URL` trong `.env`
2. Test connection:
   ```bash
   docker compose exec api sh
   # Trong container:
   npx prisma db pull
   ```

### Cloudflare 522 (Connection timed out)

- Kiểm tra VPS đang chạy
- Kiểm tra port 80 đã mở: `sudo ufw status`
- Kiểm tra nginx đang chạy: `docker compose ps nginx`

### Cloudflare 521 (Web server is down)

```bash
# Restart nginx
docker compose restart nginx

# Kiểm tra config
docker compose exec nginx nginx -t
```

### Out of memory

```bash
# Thêm swap 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📊 Monitoring

```bash
# Resource usage
docker stats

# Disk usage
df -h
docker system df

# Clear unused
docker system prune -a
```

---

## 🛡️ Security Notes

- ✅ Cloudflare ẩn IP thật của VPS
- ✅ DDoS protection tự động
- ✅ SSL/TLS được quản lý bởi Cloudflare
- ⚠️ Không commit `.env` vào git
- ⚠️ Sử dụng strong passwords
