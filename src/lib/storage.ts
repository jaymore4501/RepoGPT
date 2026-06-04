import fs from 'fs';
import path from 'path';

export interface RepositoryMetadata {
  id: string;
  name: string;
  url: string;
  analyzedAt: string;
  techStack: string[];
  languages: Record<string, number>;
  fileCount: number;
  sizeBytes: number;
  summary: string;
  setupInstructions: string;
  apiDocs: string;
  onboardingGuide: string;
  structure: any; // Tree structure
}

export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  type: string;
  name: string;
}

export interface ParsedFile {
  path: string;
  name: string;
  language: string;
  size: number;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  dependencies: string[];
}

export interface VisualRelation {
  nodes: Array<{ id: string; label: string; type: 'file' | 'dir' | 'service' | 'module' | 'db'; size: number }>;
  links: Array<{ source: string; target: string; type: string }>;
}

export interface RepositoryIndex {
  id: string;
  files: ParsedFile[];
  chunks: CodeChunk[];
  relationships: VisualRelation;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  references?: string[];
}

export interface ChatSession {
  repoId: string;
  messages: ChatMessage[];
}

const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER === 'true' ? '/tmp/data' : path.join(process.cwd(), 'data'));
const INDEX_DIR = path.join(DATA_DIR, 'indexes');
const CHAT_DIR = path.join(DATA_DIR, 'chats');
const REPOS_FILE = path.join(DATA_DIR, 'repositories.json');

// Memory Cache Layer for instant lookups
const indexCache = new Map<string, RepositoryIndex>();
const metadataCache = new Map<string, RepositoryMetadata>();
const chatCache = new Map<string, ChatSession>();
let reposListCache: RepositoryMetadata[] | null = null;

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHAT_DIR)) {
    fs.mkdirSync(CHAT_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPOS_FILE)) {
    fs.writeFileSync(REPOS_FILE, JSON.stringify([]));
  }
}

export const Storage = {
  // Get all repos metadata
  getRepositories(): RepositoryMetadata[] {
    if (reposListCache) {
      return reposListCache;
    }
    ensureDirs();
    try {
      const data = fs.readFileSync(REPOS_FILE, 'utf-8');
      reposListCache = JSON.parse(data) || [];
      // Warm up metadata cache
      if (reposListCache) {
        for (const repo of reposListCache) {
          metadataCache.set(repo.id, repo);
        }
      }
      return reposListCache!;
    } catch (e) {
      console.error('Error reading repositories file:', e);
      return [];
    }
  },

  // Save/Update a repo's metadata
  saveRepository(repo: RepositoryMetadata) {
    ensureDirs();
    const repos = this.getRepositories();
    const idx = repos.findIndex(r => r.id === repo.id);
    if (idx >= 0) {
      repos[idx] = repo;
    } else {
      repos.push(repo);
    }
    reposListCache = repos;
    metadataCache.set(repo.id, repo);
    fs.writeFileSync(REPOS_FILE, JSON.stringify(repos, null, 2));
  },

  // Get a single repo metadata
  getRepository(id: string): RepositoryMetadata | null {
    if (metadataCache.has(id)) {
      return metadataCache.get(id) || null;
    }
    const repos = this.getRepositories();
    const repo = repos.find(r => r.id === id) || null;
    if (repo) {
      metadataCache.set(id, repo);
    }
    return repo;
  },

  // Delete a repo
  deleteRepository(id: string) {
    ensureDirs();
    const repos = this.getRepositories();
    const filtered = repos.filter(r => r.id !== id);
    reposListCache = filtered;
    metadataCache.delete(id);
    indexCache.delete(id);
    chatCache.delete(id);
    
    fs.writeFileSync(REPOS_FILE, JSON.stringify(filtered, null, 2));
    
    // Also delete index file
    const idxPath = path.join(INDEX_DIR, `${id}.json`);
    if (fs.existsSync(idxPath)) {
      fs.unlinkSync(idxPath);
    }

    // Also delete chat history
    const chatPath = path.join(CHAT_DIR, `${id}.json`);
    if (fs.existsSync(chatPath)) {
      fs.unlinkSync(chatPath);
    }
  },

  // Save the full file index & chunks for a repo
  saveIndex(id: string, index: RepositoryIndex) {
    ensureDirs();
    indexCache.set(id, index);
    const filePath = path.join(INDEX_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(index, null, 2));
  },

  // Get the file index & chunks for a repo
  getIndex(id: string): RepositoryIndex | null {
    if (indexCache.has(id)) {
      return indexCache.get(id) || null;
    }
    ensureDirs();
    const filePath = path.join(INDEX_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const index = JSON.parse(data) as RepositoryIndex;
      indexCache.set(id, index);
      return index;
    } catch (e) {
      console.error(`Error reading index file for ${id}:`, e);
      return null;
    }
  },

  // Get Chat History
  getChat(repoId: string): ChatSession {
    if (chatCache.has(repoId)) {
      return chatCache.get(repoId)!;
    }
    ensureDirs();
    const filePath = path.join(CHAT_DIR, `${repoId}.json`);
    if (!fs.existsSync(filePath)) {
      const emptySession = { repoId, messages: [] };
      chatCache.set(repoId, emptySession);
      return emptySession;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const session = JSON.parse(data) as ChatSession;
      chatCache.set(repoId, session);
      return session;
    } catch (e) {
      console.error(`Error reading chat file for ${repoId}:`, e);
      const emptySession = { repoId, messages: [] };
      chatCache.set(repoId, emptySession);
      return emptySession;
    }
  },

  // Save Chat Message
  saveChatMessage(repoId: string, message: ChatMessage) {
    ensureDirs();
    const chat = this.getChat(repoId);
    chat.messages.push(message);
    chatCache.set(repoId, chat);
    const filePath = path.join(CHAT_DIR, `${repoId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2));
  },

  // Clear Chat History
  clearChat(repoId: string) {
    ensureDirs();
    const emptySession = { repoId, messages: [] };
    chatCache.set(repoId, emptySession);
    const filePath = path.join(CHAT_DIR, `${repoId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(emptySession, null, 2));
  }
};
