# 🚀 RepoGPT Deployment Guide

This guide provides comprehensive, step-by-step instructions to deploy RepoGPT to various cloud hosting providers. Since RepoGPT performs local file operations (git cloning and directory scans), it runs best as a **persistent container** or **VPS (Virtual Private Server)**.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Deployment Option 1: DigitalOcean App Platform (Recommended)](#-deployment-option-1-digitalocean-app-platform-recommended)
3. [Deployment Option 2: Render (Web Service)](#-deployment-option-2-render-web-service)
4. [Deployment Option 3: Railway.app (Hobby Container)](#-deployment-option-3-railwayapp-hobby-container)
5. [Deployment Option 4: Self-Hosted Ubuntu VPS (PM2 & Nginx)](#-deployment-option-4-self-hosted-ubuntu-vps-pm2--nginx)
6. [Environment Variables Reference](#-environment-variables-reference)

---

## ⚙️ Prerequisites

Before starting, ensure that:
1. Your repository is pushed to a public (or private with access key) GitHub repository.
2. You have determined your target database path (e.g., `/tmp/data` or a local folder) based on whether your environment has a persistent filesystem.

---

## 🌊 Deployment Option 1: DigitalOcean App Platform (Recommended)

DigitalOcean App Platform is a fully managed PaaS that integrates directly with GitHub. It is highly recommended for students using the **GitHub Student Developer Pack** (which provides a $200 free credit).

### Step-by-Step Instructions:
1. Log in to the [DigitalOcean Cloud Console](https://cloud.digitalocean.com/).
2. In the top right corner, click **Create** and select **Apps**.
3. Under **Service Provider**, click **GitHub**. 
4. Select your `RepoGPT` repository and branch (usually `main`), check **Autodeploy code changes**, and click **Next**.
5. DigitalOcean will auto-detect your project as a **Next.js** application:
   - Click **Edit Plan** for the resource.
   - Choose the **Basic Tier** ($5.00/month).
   - Set the size to **512 MB RAM / 1 vCPU**.
6. Set the Environment Variables by clicking **Edit** next to Global Variables:
   - Add `RENDER` = `true` (forces the filesystem to write to `/tmp` to avoid build locks).
7. Click **Next** on Info, **Next** on Build/Run commands (leave as default Next.js build settings), and click **Create Resources**.
8. Once the build completes, DigitalOcean will output a live domain (e.g., `https://repogpt-xxxxx.ondigitalocean.app`) that is online 24/7 with zero cold starts!

---

## ☁️ Deployment Option 2: Render (Web Service)

Render is a clean, developer-friendly platform. The Free tier is available but subject to 15-minute inactivity spin-downs.

### Step-by-Step Instructions:
1. Create an account on [Render.com](https://render.com/).
2. On your dashboard, click **New +** and select **Web Service**.
3. Connect your GitHub account and select your `RepoGPT` repository.
4. Fill in the service configuration:
   *   **Name**: `repogpt`
   *   **Language**: `Node`
   *   **Branch**: `main`
   *   **Region**: Select a region close to your target users.
   *   **Build Command**: `npm run build`
   *   **Start Command**: `npm run start`
   *   **Instance Type**: `Free` (or upgrade to `Starter` to keep it awake 24/7).
5. Click **Advanced** and add the following **Environment Variables**:
   *   `RENDER` = `true`
   *   `DATA_DIR` = `/tmp/data`
   *   `TEMP_DIR` = `/tmp/temp_repos`
6. Click **Create Web Service**.
7. *(Optional for Free Tier)*: To prevent the service from showing the waking up/sleeping screen, set up a free keep-alive monitor on [UptimeRobot](https://uptimerobot.com/) to ping your Render URL (e.g., `https://repogpt-3azy.onrender.com/`) every 10 minutes.

---

## 🚂 Deployment Option 3: Railway.app (Hobby Container)

Railway offers extremely fast build pipelines and persistent container allocation with no sleep timer on the Hobby plan.

### Step-by-Step Instructions:
1. Sign up on [Railway.app](https://railway.app/) using GitHub.
2. Click **New Project** in the workspace dashboard.
3. Choose **Deploy from GitHub repo** and select your `RepoGPT` repository.
4. Once added, click the **Variables** tab on your service card:
   - Add `PORT` = `3000`
5. Go to the **Settings** tab:
   - Scroll down to the **Environment** section.
   - Click **Generate Domain** to assign a public URL to your service.
6. Railway will build, bundle, and launch the application instantly.

---

## 🖥️ Deployment Option 4: Self-Hosted Ubuntu VPS (PM2 & Nginx)

For complete control and permanent local file storage, you can deploy RepoGPT on any Virtual Private Server (e.g. DigitalOcean Droplet, Hetzner, AWS EC2, or Oracle Cloud Always Free VM).

### Step-by-Step Instructions:

#### 1. System Setup
SSH into your VPS and install Git, Node.js, and PM2 (Process Manager):
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (v20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Install PM2 globally
sudo npm install pm2 -g
```

#### 2. Clone and Install dependencies
Clone your repository and install packages:
```bash
git clone https://github.com/jaymore4501/RepoGPT.git
cd RepoGPT
npm install
```

#### 3. Compile and Run the App
Build the production Next.js package and start it using PM2 to keep it running in the background:
```bash
# Build the Next.js bundle
npm run build

# Start the application with PM2
pm2 start npm --name "repogpt" -- start

# Configure PM2 to restart on server reboot
pm2 startup
pm2 save
```

#### 4. Configure Nginx Reverse Proxy
To map your domain name (port 80/443) to Next.js running locally (port 3000):
```bash
# Install Nginx
sudo apt install nginx -y

# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/default
```

Replace the content of the `location /` block in Nginx config with:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
Save the file (Ctrl+O, Enter, Ctrl+X) and restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🔑 Environment Variables Reference

| Variable | Description | Default Value | Recommended Value |
| :--- | :--- | :--- | :--- |
| `PORT` | The port Next.js listens to. | `3000` | `3000` |
| `RENDER` | Signals running in ephemeral cloud environments. | `false` | `true` (on Render, DO, Railway) |
| `DATA_DIR` | Directory where parsed JSON index files and chats are saved. | `./data` | `/tmp/data` (for serverless/ephemeral) |
| `TEMP_DIR` | Folder where repositories are cloned for AST scanning. | `./temp_repos` | `/tmp/temp_repos` (for serverless/ephemeral) |
