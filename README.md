<h1 align="center">
  <img src="public/Readme Logo.png" alt="RepoGPT Logo" width="30" style="vertical-align: middle; margin-right: 8px; border-radius: 6px;"/>&nbsp;RepoGPT
</h1>

<p align="center">
  <strong>AI-Powered Repository Intelligence, Code Quality Analysis, & Architecture Visualization Platform.</strong>
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">System Architecture</a> •
  <a href="#-codebase-directory-structure">Directory Structure</a> •
  <a href="#-getting-started-beginner-guide">Getting Started</a> •
  <a href="#-production-compilation--deployment">Deployment</a> •
  <a href="#-license">License</a>
</p>

---

## 📖 Introduction

![RepoGPT Introduction](./public/RepoGPT%20Introduction.png)

RepoGPT is a premium developer-onboarding and codebase intelligence platform designed to eliminate code discovery friction. By pasting a public GitHub repository URL, the system clones, traverses, and parses the codebase locally using customized AST-signature extractors to generate comprehensive interactive charts, semantic document libraries, deep code quality audits, and context-aware chat interfaces.

It compiles code hierarchies in real time and interfaces directly with local LLMs (via Ollama) or falls back to a high-fidelity local semantic retrieval engine (TF-IDF + Cosine Similarity) when offline.

---

## 🚀 Key Features

### 1. Data Ingestion & Deep Parsing
*   **⚡ Real-Time Repository Ingestion:** Securely clones public Git repositories and scans their folder structures in seconds. It integrates directly with the live GitHub REST API to pull 100% accurate, paginated metadata (including total commits, contributors, and active branches).
*   **🔍 AST-Signature Extraction Engine:** Recursively scans and parses source files across major language ecosystems (JavaScript, TypeScript, Python, Java, Go, Rust, PHP). It intelligently maps out classes, function scopes, API routes, third-party libraries, and internal import/export dependency structures.

### 2. Code Quality & Security Analytics
*   **📊 Interactive Code Quality Dashboard:** Dynamically generates stunning, animated visual analytics powered by `Recharts`. It automatically analyzes Code Originality (detecting duplicated lines and blocks), maps Language Distribution, and identifies structural Security Vulnerabilities categorized by Critical, High, and Medium risk profiles.
*   **📄 Premium PDF Executive Reporting:** Instantly generates high-fidelity, dark-mode PDF reports on-the-fly using `jsPDF`. These downloadable reports feature custom graphic banners, beautiful typography, and comprehensive embedded data visualizations perfectly suited for stakeholder reviews.

### 3. Visualization & AI Interaction
*   **🕸️ Interactive Architecture Visualization:** Employs `@xyflow/react` to render highly interactive, zoomable codebase graphs. It maps physical files into semantic nodes and dependency trees, allowing developers to visually navigate complex system architectures and data flows.
*   **💬 Context-Aware Semantic Code Chat:** Converse naturally with any parsed repository. The system maps your queries against local code snippets using TF-IDF tokenization and cosine similarity to retrieve the exact code context. It then pipes this context through local LLMs (via Ollama) or a native fallback parser. It also includes persistent, quick-suggested query pills for rapid testing.

### 4. Enterprise-Grade Safeguards
*   **🛡️ Autonomous Rate Limiting:** Features a built-in, self-healing serverless state management system. It securely limits users to 5 deep codebase scans per device every 24 hours. The engine automatically prunes stale scans and dead files in the background to permanently prevent local database bloat.

---

## 🛠️ System Architecture

RepoGPT uses a highly optimized ingestion pipeline to fetch and process repositories:

![RepoGPT System Architecture](./public/RepoGPT%20Architecture.png)

<details>
<summary>🔍 View Ingestion Pipeline Details</summary>

1.  **Live GitHub API Call**: Securely queries the live GitHub API for core statistics and metadata parity.
2.  **Git Blobless Clone**: Clones the repo with `--filter=blob:none` to download only metadata initially, fetching file contents lazily on-demand to save bandwidth.
3.  **Noise Exclusions**: Bypasses testing, documentation, and asset folders (`tests`, `docs`, `website`, `.github`) to speed up file walks.
4.  **AST Traverser & Scorer**: Scans the files to parse imports, exports, functions, class symbols, and scores files for code originality and security risks.
5.  **Local Storage Store**: Saves the resulting repository map and chunks into JSON cache folders under `data/`, managed by the 24-hour rate limiter.
6.  **Interactive Dashboard**: Displays code quality charts, React Flow diagrams, and semantic chat interfaces.
</details>

---

## 📂 Codebase Directory Structure

```text
RepoGPT/
├── data/                       # Local File-Based database (tracked files, chats, indices)
│   ├── scans.json              # Rate limiting and autonomous scan tracking
│   ├── indexes/                # AST and semantic search indices per repository
│   └── chats/                  # Saved RAG chat sessions
├── public/                     # Static media assets and branding elements
│   ├── Report Banner.png       # Graphic banner for PDF exports
│   └── Favicon.png             # Website Favicon
└── src/
    ├── app/                    # Next.js App Router workspace
    │   ├── api/                # Fullstack API Endpoints (analyze, chat, docs)
    │   ├── dashboard/          # Multi-tab dashboard (Quality, Chat, Visualize, Docs)
    │   ├── layout.tsx          # Root HTML layout and metadata configurations
    │   └── page.tsx            # Interactive landing page with clone progress stepper
    ├── components/             # Premium animated Tailwind + Framer Motion components
    └── lib/                    # Core modules and helper libraries
        ├── parser.ts           # AST traverser, GitHub API fetcher, and complexity scorer
        ├── rag.ts              # Local LLM adapter & Semantic search matching
        └── storage.ts          # File-based DB adapter & 24hr Rate Limiter module
```

---

## 💻 Getting Started (Beginner Guide)

Follow these instructions to download, install, and run RepoGPT on your local machine.

### 1. Prerequisites
Ensure you have the following software installed:
1.  **Node.js (v18.x or newer)**: Essential to run the Next.js development server. Download it from [nodejs.org](https://nodejs.org/).
2.  **Git CLI**: Needed to clone the codebase and ingest target repositories. Download it from [git-scm.com](https://git-scm.com/). Ensure `git` is added to your environment `PATH`.
3.  **Ollama (Optional)**: If you want conversational AI chat capability powered by local LLMs. Download it from [ollama.com](https://ollama.com/).

---

### 2. Setup & Installation

Open your terminal (Command Prompt, PowerShell, or Terminal on macOS/Linux) and run:

```bash
# 1. Clone the project code
git clone https://github.com/jaymore4501/RepoGPT.git

# 2. Navigate into the cloned project folder
cd RepoGPT

# 3. Install all necessary dependencies
npm install
```

---

### 3. Running the Application

Once dependencies are installed, start the local development server:

```bash
npm run dev
```

Your terminal will print a local address (usually `http://localhost:3000`). Open this link in your web browser to access the RepoGPT landing page.

---

### 4. Setting up Conversational Chat (Ollama)

To interact with the codebase using conversational AI:
1.  Launch the **Ollama** app on your machine.
2.  Run the following command in a new terminal window to download and run the code-focused model:
    ```bash
    ollama run deepseek-coder
    ```
3.  Once the model is loaded, refresh your RepoGPT browser tab. The badge on the Chat page will change to **Ollama Active**.
4.  *Note:* If Ollama is offline or not installed, RepoGPT automatically falls back to **Fallback Mode** (using TF-IDF syntax extraction) to retrieve relevant files and details.

---

## 📦 Production Compilation & Deployment

For a detailed walkthrough on deploying RepoGPT to cloud platforms (DigitalOcean App Platform, Render, Railway) or running it on a self-hosted Ubuntu VPS, please refer to the dedicated [Deployment Guide](DEPLOYMENT.md).

### Local Production Server
Build the optimized production bundle and start the server:
```bash
# Build the application
npm run build

# Start the compiled bundle
npm run start
```
The server will start running on port `3000`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

