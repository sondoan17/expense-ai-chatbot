# 🚀 Deployment Guide - Expense AI Chatbot

A guide to deploying the application on a VPS using Docker, Nginx, and **Cloudflare SSL**.

---

## 📑 Table of Contents

1. [System Requirements](#-system-requirements)
2. [System Architecture](#️-system-architecture)
3. [Prepare VPS](#-step-1-prepare-vps)
4. [Configure Cloudflare](#-step-2-configure-cloudflare)
5. [Clone Repository](#-step-3-clone-repository)
6. [Configure Environment](#️-step-4-configure-environment)
7. [Build and Deploy](#-step-5-build-and-deploy)
8. [Verify Deployment](#-step-6-verify-deployment)
9. [Common Commands](#-common-commands)
10. [Update Deployment](#-update-deployment)
11. [Troubleshooting](#-troubleshooting)

---

## 📋 System Requirements

| Resource | Minimum          | Recommended      |
| -------- | ---------------- | ---------------- |
| RAM      | 2 GB             | 4 GB             |
| CPU      | 1 vCPU           | 2 vCPU           |
| Storage  | 20 GB SSD        | 40 GB SSD        |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## 🏗️ System Architecture

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

**Benefits of Cloudflare Proxy:**

- ✅ Automatic SSL (no need for Let's Encrypt)
- ✅ DDoS protection
- ✅ CDN caching
- ✅ Hides real VPS IP
- ✅ Simpler configuration

---

## 🔧 Step 1: Prepare VPS

### 1.1 SSH Connection

```bash
ssh root@YOUR_VPS_IP
# Or
ssh deploy@YOUR_VPS_IP
```

### 1.2 Create deploy user (if not exists)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 1.3 Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 1.4 Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (Cloudflare sends requests through this port)
sudo ufw enable
```

> ⚠️ **Note**: No need to open port 443 as Cloudflare handles SSL.

---

## 🌐 Step 2: Configure Cloudflare

### 2.1 Login to Cloudflare

Go to https://dash.cloudflare.com → Select your domain **mimichatbot.fun** → **DNS**

### 2.2 Update DNS Records

**Delete old records** pointing to Vercel/Render (CNAME records)

**Add/Edit new records:**

| Type | Name  | Content           | Proxy status                  |
| ---- | ----- | ----------------- | ----------------------------- |
| A    | `@`   | `185.128.227.231` | **Proxied** (orange cloud 🟠) |
| A    | `www` | `185.128.227.231` | **Proxied** (orange cloud 🟠) |

> ✅ Keep **Proxied** (orange) to let Cloudflare handle SSL

### 2.3 Configure SSL/TLS

1. Go to **SSL/TLS** in sidebar
2. Select **Overview** tab
3. Set mode: **Full** (not Full Strict) or **Flexible**

### 2.4 Enable Always Use HTTPS

1. Go to **SSL/TLS** → **Edge Certificates**
2. Turn **Always Use HTTPS**: ON

### 2.5 Verify DNS

Wait 2-5 minutes, then verify:

```bash
nslookup mimichatbot.fun
```

You'll see Cloudflare's IP (not VPS IP) - that's correct!

---

## 📥 Step 3: Clone Repository

```bash
cd /opt
sudo mkdir expense-ai
sudo chown $USER:$USER expense-ai
cd expense-ai

git clone https://github.com/sondoan17/expense-ai-chatbot.git .
```

---

## ⚙️ Step 4: Configure Environment

### 4.1 Create .env file

```bash
cp docker/env.production.example .env
nano .env
```

### 4.2 Update values

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

## 🐳 Step 5: Build and Deploy

```bash
# Build images (first time takes 5-10 minutes)
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

---

## ✅ Step 6: Verify Deployment

### 6.1 Check containers

```bash
docker compose ps
```

**Expected output:**

```
NAME              STATUS
expense-api       Up (healthy)
expense-web       Up
expense-nginx     Up
```

### 6.2 Test from command line

```bash
# Test health check
curl http://localhost/health

# Test API (from VPS)
curl http://localhost/api/health
```

### 6.3 Test from browser

Open https://mimichatbot.fun

- ✅ Page loads successfully
- ✅ Has 🔒 icon (SSL)
- ✅ Login/register works

---

## 🔄 Common Commands

```bash
# Restart services
docker compose restart

# Stop all
docker compose down

# View logs
docker compose logs -f [api|web|nginx]

# Rebuild a service
docker compose up -d --build api

# Run migrations
docker compose exec api npx prisma migrate deploy

# Shell into container
docker compose exec api sh
```

---

## 🔄 Update Deployment

When there's new code:

```bash
cd /opt/expense-ai

# Pull new code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Run migrations (if any)
docker compose exec api npx prisma migrate deploy

# Check logs
docker compose logs -f
```

---

## 🚨 Troubleshooting

### 502 Bad Gateway

```bash
# Check if API is running
docker compose ps
docker compose logs api
```

### Container won't start

```bash
docker compose logs [service_name]
```

### API can't connect to database

1. Check `DATABASE_URL` in `.env`
2. Test connection:
   ```bash
   docker compose exec api sh
   # Inside container:
   npx prisma db pull
   ```

### Cloudflare 522 (Connection timed out)

- Check if VPS is running
- Check if port 80 is open: `sudo ufw status`
- Check if nginx is running: `docker compose ps nginx`

### Cloudflare 521 (Web server is down)

```bash
# Restart nginx
docker compose restart nginx

# Check config
docker compose exec nginx nginx -t
```

### Out of memory

```bash
# Add 2GB swap
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

- ✅ Cloudflare hides real VPS IP
- ✅ Automatic DDoS protection
- ✅ SSL/TLS managed by Cloudflare
- ⚠️ Never commit `.env` to git
- ⚠️ Use strong passwords
