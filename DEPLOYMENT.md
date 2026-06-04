# 🚀 RepoGPT Deployment & Running Guide

This guide details how to run RepoGPT locally on your machine or deploy it to cloud hosting platforms.

Please choose the method that fits your environment. Note the structural requirements of each choice below:

---

## 💻 Method 1: Local Deployment (Recommended)
Running RepoGPT locally on your computer gives you the best experience: it provides permanent local file storage (all your index files are saved) and lets you connect to local AI models via Ollama.

### 1. Prerequisites
Ensure you have the following installed:
*   **Node.js (v18.x or newer)**
*   **Git CLI** (added to your system PATH)
*   **Ollama** (optional, for local conversational AI)

### 2. Installation
Open your terminal and run:
```bash
# Clone the repository
git clone https://github.com/jaymore4501/RepoGPT.git

# Navigate into the project folder
cd RepoGPT

# Install dependencies
npm install
```

### 3. Running the Application
*   **Development Mode** (with hot-reloads):
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.
*   **Production Compilation Mode** (pre-built for maximum speed):
    ```bash
    # Build the production package
    npm run build

    # Start the local production server
    npm run start
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Method 2: Render Cloud Service (Web Service)
Render hosts RepoGPT as a persistent Node container. This allows the application to run 24/7, clone public repos, and keep a writable directory.

### ⚠️ Free Tier Limit Warning:
Render's **Free Tier** puts services to sleep after **15 minutes** of inactivity, which causes a 50-90 second loading screen on next visit. You can prevent this sleep behavior for free by using UptimeRobot (described below).

### Step-by-Step Instructions:
1. Sign up/log in to [Render.com](https://render.com/).
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub account and import your `RepoGPT` repository.
4. Set the following settings:
   *   **Name**: `repogpt`
   *   **Language**: `Node`
   *   **Branch**: `main`
   *   **Build Command**: `npm run build`
   *   **Start Command**: `npm run start`
   *   **Instance Type**: `Free`
5. Click **Advanced** and add these three crucial **Environment Variables**:
   *   `RENDER` = `true` (Tells RepoGPT to write database assets to `/tmp` directory)
   *   `DATA_DIR` = `/tmp/data`
   *   `TEMP_DIR` = `/tmp/temp_repos`
6. Click **Create Web Service**.

### ⏰ How to Keep Render Awake 24/7 (100% Free):
1. Go to [UptimeRobot.com](https://uptimerobot.com/) and register a free account.
2. Click **Add New Monitor**.
3. Select **Monitor Type**: `HTTP(s)`
4. Set the URL to your Render live app link (e.g., `https://repogpt-3azy.onrender.com/`).
5. Set the interval to **Every 10 minutes**. Click **Create**.
*UptimeRobot will now ping your site, keeping your Render server active and fast.*

---

## ⚡ Method 3: Vercel Hosting (Serverless Functions)
Vercel is the creator of Next.js and provides instant loads and zero sleep states. However, because Vercel uses ephemeral serverless functions, it has major limitations for this project.

### ⚠️ Critical Serverless Limitations:
> [!CAUTION]
> *   **10-Second Request Timeout**: Vercel terminates serverless routes after **10 seconds**. Cloning/parsing medium or large repositories will trigger a `504 Gateway Timeout`.
> *   **No Persistent Disk**: Vercel functions cannot store persistent files. Any repository you clone or analyze will be **completely wiped out** after the function executes, causing subsequent chat queries or page navigations to return `"Not Found"` errors.

### Step-by-Step Instructions:
1. Go to [Vercel.com](https://vercel.com/) and log in using GitHub.
2. Click **Add New** ➔ **Project**.
3. Import your `RepoGPT` repository.
4. Leave all build settings, directories, and overrides as **Default**.
5. Click **Deploy**.

---

## 🔑 Environment Variables Reference

| Variable | Description | Default Value | Recommended Value |
| :--- | :--- | :--- | :--- |
| `RENDER` | Signals running in ephemeral cloud environments. | `false` | `true` (on Render, Vercel) |
| `DATA_DIR` | Directory where index files and chats are saved. | `./data` | `/tmp/data` (for cloud) |
| `TEMP_DIR` | Folder where repositories are cloned for AST scanning. | `./temp_repos` | `/tmp/temp_repos` (for cloud) |
