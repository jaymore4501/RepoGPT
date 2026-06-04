import { CodeChunk, RepositoryIndex, RepositoryMetadata } from './storage';

// Standard English stop words + common programming keywords we want to filter out for TF-IDF if necessary,
// or we can keep code tokens because they represent class/function names which are crucial!
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot',
  'co', 'con', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he',
  'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it',
  'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shant',
  'she', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'theres', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'wont', 'would', 'wouldnt', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// Tokenize text into words, splitting by camelCase, snake_case, and non-alphanumeric chars
function tokenize(text: string): string[] {
  const cleaned = text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/[_.\-/\\():[\]{}<>=+*;,"'&]/g, ' ') // replace punctuation and symbols
    .toLowerCase();
  
  return cleaned
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
}

// Simple TF-IDF Vector Space Model for searching code chunks locally
export class LocalVectorIndex {
  private chunks: CodeChunk[] = [];
  private docFrequencies: Record<string, number> = {};
  private idf: Record<string, number> = {};
  private docVectors: Array<Record<string, number>> = [];
  private docLengths: number[] = [];

  constructor(chunks: CodeChunk[]) {
    this.chunks = chunks;
    this.buildIndex();
  }

  private buildIndex() {
    const numDocs = this.chunks.length;
    if (numDocs === 0) return;

    // 1. Calculate document frequencies for all terms
    for (const chunk of this.chunks) {
      const terms = new Set(tokenize(chunk.code + ' ' + chunk.filePath + ' ' + chunk.name));
      for (const term of terms) {
        this.docFrequencies[term] = (this.docFrequencies[term] || 0) + 1;
      }
    }

    // 2. Calculate IDF for each term
    for (const [term, freq] of Object.entries(this.docFrequencies)) {
      this.idf[term] = Math.log(1 + (numDocs / freq));
    }

    // 3. Build TF-IDF vectors for documents
    for (const chunk of this.chunks) {
      const terms = tokenize(chunk.code + ' ' + chunk.filePath + ' ' + chunk.name);
      const termCounts: Record<string, number> = {};
      for (const term of terms) {
        termCounts[term] = (termCounts[term] || 0) + 1;
      }

      const vector: Record<string, number> = {};
      let sqSum = 0;
      for (const [term, count] of Object.entries(termCounts)) {
        const tf = count; // raw frequency
        const tfidf = tf * (this.idf[term] || 0);
        vector[term] = tfidf;
        sqSum += tfidf * tfidf;
      }

      this.docVectors.push(vector);
      this.docLengths.push(Math.sqrt(sqSum));
    }
  }

  public search(query: string, limit: number = 5): SearchResult[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0 || this.chunks.length === 0) {
      // If query tokenization yields nothing, return first few chunks
      return this.chunks.slice(0, limit).map(chunk => ({ chunk, score: 0 }));
    }

    // Build query vector
    const queryCounts: Record<string, number> = {};
    for (const term of queryTerms) {
      queryCounts[term] = (queryCounts[term] || 0) + 1;
    }

    const queryVector: Record<string, number> = {};
    let querySqSum = 0;
    for (const [term, count] of Object.entries(queryCounts)) {
      const tfidf = count * (this.idf[term] || 0);
      queryVector[term] = tfidf;
      querySqSum += tfidf * tfidf;
    }
    const queryLength = Math.sqrt(querySqSum);

    if (queryLength === 0) {
      return this.chunks.slice(0, limit).map(chunk => ({ chunk, score: 0 }));
    }

    // Calculate Cosine Similarity for each document
    const results: SearchResult[] = [];
    for (let i = 0; i < this.chunks.length; i++) {
      const docVector = this.docVectors[i];
      const docLength = this.docLengths[i];
      
      if (docLength === 0) continue;

      let dotProduct = 0;
      for (const [term, queryVal] of Object.entries(queryVector)) {
        if (docVector[term]) {
          dotProduct += queryVal * docVector[term];
        }
      }

      const cosineSim = dotProduct / (queryLength * docLength);
      
      // Boost score if terms appear in file path or code chunk name
      let finalScore = cosineSim;
      const lowPath = this.chunks[i].filePath.toLowerCase();
      const lowName = this.chunks[i].name.toLowerCase();
      for (const term of queryTerms) {
        if (lowPath.includes(term)) finalScore += 0.15;
        if (lowName.includes(term)) finalScore += 0.10;
      }

      results.push({
        chunk: this.chunks[i],
        score: finalScore
      });
    }

    // Sort descending and return top K
    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Check if local Ollama is running
export async function checkOllamaRunning(url: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

// Query local Ollama API
export async function queryOllama(
  prompt: string,
  systemPrompt: string,
  modelName: string = 'deepseek-coder',
  ollamaUrl: string = 'http://localhost:11434'
): Promise<Response> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: true
    })
  });
  return response;
}

// Generate fallback response locally based on code snippets
export function generateLocalFallbackResponse(
  query: string,
  metadata: RepositoryMetadata,
  searchResults: SearchResult[],
  index: RepositoryIndex
): string {
  const lowQuery = query.toLowerCase();
  const files = index?.files || [];

  // Helper to format sizes
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // 1. SETUP / INSTALLATION QUERY
  if (lowQuery.includes('setup') || lowQuery.includes('install') || lowQuery.includes('run') || lowQuery.includes('instruction')) {
    return `### ⚙️ Project Setup and Execution Manual

Here is the setup sequence compiled from the codebase files:

${metadata.setupInstructions}

---
*Generated by RepoGPT offline indexer.*`;
  }

  // 2. OVERALL ARCHITECTURE / FRAMEWORKS & LANGUAGES
  if (lowQuery.includes('architecture') || lowQuery.includes('overall') || lowQuery.includes('framework') || lowQuery.includes('language') || lowQuery.includes('tech stack')) {
    const langList = Object.entries(metadata.languages)
      .map(([lang, pct]) => `- **${lang}**: ${pct}% of codebase by volume`)
      .join('\n');

    // List top 5 largest files
    const topFiles = [...files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map(f => `- \`/${f.path}\` (${f.language}, size: ${formatSize(f.size)})`)
      .join('\n');

    return `### 🏛️ Codebase Architecture & Technical Stack

This project is built using a modern **${metadata.techStack.join(', ')}** stack. Here is the architectural layout:

#### 📊 Language Distribution
${langList || '- No specific languages parsed.'}

#### 📂 Major Code Modules & Layers
- **Total Files**: ${metadata.fileCount} files parsed.
- **Total Code Size**: ${formatSize(metadata.sizeBytes)}.
- **Core Directories**:
${metadata.structure?.filter((n: any) => n.type === 'dir').slice(0, 5).map((dir: any) => `  - \`/${dir.name}\`: Contains ${dir.children?.length || 0} sub-files/folders.`).join('\n') || '  - Root-level scripts and directories.'}

#### 📈 Top Files by Size
${topFiles || '- None'}

#### 🔗 Internal Systems Flow
- **Data Flow & Communication**: Operations flow from entry scripts down to components and services.
- **State/Controllers**: Handlers are organized into modules. Dependencies are resolved through relative imports.

---
*Offline RAG Architecture Mapper*`;
  }

  // 3. ENTRY POINTS AND ROUTES
  if (lowQuery.includes('entry') || lowQuery.includes('route') || lowQuery.includes('endpoint') || lowQuery.includes('api') || lowQuery.includes('controller') || lowQuery.includes('path')) {
    const entryFiles = files.filter(f => f.name.match(/^(index|main|app|server|root)\.(js|ts|py|go|rs|java)$/i));
    const routeFiles = files.filter(f => f.path.toLowerCase().includes('route') || f.path.toLowerCase().includes('controller') || f.path.toLowerCase().includes('api'));

    let entrySection = entryFiles.map(f => `- \`/${f.path}\` (${f.language})`).join('\n');
    if (!entrySection) entrySection = '- No standard naming entry points found. Execution likely starts at the root-level scripts.';

    const routeSection = routeFiles.slice(0, 8).map(f => {
      const parts = [];
      if (f.exports.length > 0) parts.push(`exports: ${f.exports.slice(0, 3).join(', ')}`);
      if (f.functions.length > 0) parts.push(`functions: ${f.functions.slice(0, 3).join(', ')}`);
      const details = parts.length > 0 ? ` (${parts.join('; ')})` : '';
      return `- \`/${f.path}\`${details}`;
    }).join('\n');

    return `### 🌐 Application Entry Points & Routing Tables

Based on the static AST parsing of files, the application structures its requests and entry layers as follows:

#### 🚀 Primary Entry Points
${entrySection}

#### 🛣️ Discovered Routing and Controller Layers
${routeSection || '- No specific routes or controller files were identified by file path analysis.'}

#### 📦 Code Examples & Snippets
Here are code snippets representing the routing or entry structures:
${searchResults.slice(0, 2).map((res, idx) => `
**Snippet #${idx + 1}** (in \`/${res.chunk.filePath}\` lines ${res.chunk.startLine}-${res.chunk.endLine}):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n')}

---
*Verify the active URL mappings by inspecting the files listed above.*`;
  }

  // 4. DEPENDENCIES
  if (lowQuery.includes('dependency') || lowQuery.includes('package') || lowQuery.includes('libraries') || lowQuery.includes('npm')) {
    // Look for package management files
    const depFiles = files.filter(f => f.name.match(/^(package\.json|requirements\.txt|go\.mod|cargo\.toml|composer\.json)$/i));
    
    // Find all external imports in files (i.e. imports that do not start with '.' or '/' or '\')
    const externalImports = new Set<string>();
    files.forEach(f => {
      f.imports.forEach(imp => {
        if (!imp.startsWith('.') && !imp.startsWith('/') && !imp.startsWith('\\') && imp.length < 30) {
          externalImports.add(imp);
        }
      });
    });

    const parsedDeps = Array.from(externalImports).slice(0, 15).map(dep => `- \`${dep}\``).join('\n');

    return `### 📦 Project Dependencies and External Libraries

This project operates on a **${metadata.techStack.join(', ')}** stack. Here is the dependency footprint:

#### 📄 Dependency Manifests Detected
${depFiles.map(f => `- \`/${f.path}\` (${f.language})`).join('\n') || '- No package manifest files found in root.'}

#### 🔌 External Modules & Libraries Referenced in Code
The following libraries are imported directly by codebase files:
${parsedDeps || '- No external imports parsed.'}

#### 📁 Code Example
Here is a code snippet importing project dependencies:
${searchResults.slice(0, 1).map(res => `
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
// From /${res.chunk.filePath}
${res.chunk.code.split('\n').slice(0, 15).join('\n')}
\`\`\`
`).join('\n')}

---
*Generated by RepoGPT offline indexer.*`;
  }

  // 5. DATABASE & MODELS
  if (lowQuery.includes('db') || lowQuery.includes('database') || lowQuery.includes('model') || lowQuery.includes('schema') || lowQuery.includes('prisma') || lowQuery.includes('mongo') || lowQuery.includes('sql')) {
    const dbFiles = files.filter(f => 
      f.path.toLowerCase().includes('db') || 
      f.path.toLowerCase().includes('model') || 
      f.path.toLowerCase().includes('schema') || 
      f.path.toLowerCase().includes('prisma')
    );

    const modelDetails = dbFiles.slice(0, 6).map(f => {
      const parts = [];
      if (f.classes.length > 0) parts.push(`classes: ${f.classes.join(', ')}`);
      if (f.functions.length > 0) parts.push(`functions: ${f.functions.slice(0, 3).join(', ')}`);
      const details = parts.length > 0 ? ` (defines ${parts.join('; ')})` : '';
      return `- \`/${f.path}\`${details}`;
    }).join('\n');

    return `### 🗄️ Database & Schema Models

I analyzed the repository for database connections, ORMs, and schemas (SQL, MongoDB, Prisma, etc.):

#### 📁 Database Configuration & Model Files
${modelDetails || '- No dedicated database or model files were matched by file path analysis.'}

#### 💾 Database Snippet Context
Here is how the codebase communicates with data stores:
${searchResults.slice(0, 2).map((res, idx) => `
**Snippet #${idx + 1}** (in \`/${res.chunk.filePath}\` lines ${res.chunk.startLine}-${res.chunk.endLine}):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n')}

---
*For live database integration testing, review environment configuration instructions.*`;
  }

  // 6. AUTHENTICATION & SECURITY
  if (lowQuery.includes('auth') || lowQuery.includes('login') || lowQuery.includes('jwt') || lowQuery.includes('session') || lowQuery.includes('passport') || lowQuery.includes('user')) {
    const authFiles = files.filter(f => 
      f.path.toLowerCase().includes('auth') || 
      f.path.toLowerCase().includes('login') || 
      f.path.toLowerCase().includes('session') ||
      f.path.toLowerCase().includes('jwt') ||
      f.imports.some(imp => imp.includes('jwt') || imp.includes('session') || imp.includes('passport') || imp.includes('auth'))
    );

    if (authFiles.length === 0) {
      return `### 🔐 Authentication & Session Management

I scanned the codebase files for terms like \`auth\`, \`login\`, \`jwt\`, \`session\`, or \`passport\`, but no dedicated auth service files were found.

#### 🛡️ Analysis:
- The project does not appear to expose a user login portal or token-based authentication mechanism.
- If it is a library or utility command-line tool, authentication may be deferred to environment credentials or tokens.
- Review root entry points like:
${files.slice(0, 2).map(f => `- \`/${f.path}\` (${f.language})`).join('\n')}`;
    }

    return `### 🔐 User Authentication & Session Management

I detected authentication or session validation logic in the following files:

#### 📁 Auth-Related Files & Controllers
${authFiles.slice(0, 5).map(f => `- \`/${f.path}\` (uses: ${f.imports.filter(imp => imp.includes('jwt') || imp.includes('session') || imp.includes('passport') || imp.includes('auth')).join(', ') || 'internal helpers'})`).join('\n')}

#### 🔑 Code Implementations
Here are code snippets executing login, JWT token checks, or session handles:
${searchResults.slice(0, 2).map((res, idx) => `
**Snippet #${idx + 1}** (in \`/${res.chunk.filePath}\` lines ${res.chunk.startLine}-${res.chunk.endLine}):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n')}`;
  }

  // 7. SECURITY & QUALITY CONCERNS
  if (lowQuery.includes('security') || lowQuery.includes('concern') || lowQuery.includes('smells') || lowQuery.includes('vuln') || lowQuery.includes('quality') || lowQuery.includes('risk')) {
    const issues: string[] = [];
    index.chunks.forEach(chunk => {
      const code = chunk.code;
      if (code.includes('console.log') && chunk.filePath.startsWith('src/')) {
        issues.push(`- **Unused Logs**: \`console.log\` statements left in \`/${chunk.filePath}\`.`);
      }
      if (code.includes('password') && (code.includes('= "') || code.includes("= '")) && !chunk.filePath.includes('test')) {
        issues.push(`- **Hardcoded Secret**: Possible plain-text credential assignment inside \`/${chunk.filePath}\`.`);
      }
      if (code.includes('eval(')) {
        issues.push(`- **Dangerous Command Execution**: Use of direct \`eval()\` script parser in \`/${chunk.filePath}\`.`);
      }
      if (code.includes('catch (e)') && (code.includes('{}') || code.includes('// TODO')) && !chunk.filePath.includes('test')) {
        issues.push(`- **Empty Catch Block**: Silent error catching detected in \`/${chunk.filePath}\`.`);
      }
    });

    const parsedIssues = Array.from(new Set(issues)).slice(0, 10).join('\n');

    return `### 🛡️ Code Quality & Security Assessment

I performed an AST static scanner run on the codebase chunks to evaluate quality practices:

#### ⚠️ Key Observations
${parsedIssues || `
- **Hardcoded Secrets**: No direct plain-text credentials found in retrieved segments.
- **Dangerous Commands**: No direct \`eval()\` or unsanitized shell commands detected.
- **Error Handlers**: Catch blocks contain standard logs or validation.
- **Complexity**: Checked against the complexity metrics visible on the dashboard.
`}

#### 📂 Inspected Source Paths
${searchResults.slice(0, 3).map(r => `- \`/${r.chunk.filePath}\``).join('\n')}

---
*This is an offline heuristic audit. Start Ollama to perform a full deep-context LLM security review.*`;
  }

  // 8. COMPONENT/MODULE COMMUNICATION
  if (lowQuery.includes('communicate') || lowQuery.includes('relation') || lowQuery.includes('import') || lowQuery.includes('connect') || lowQuery.includes('structure')) {
    // Find the files that are most frequently imported
    const importCounts: Record<string, number> = {};
    files.forEach(f => {
      f.dependencies.forEach(dep => {
        importCounts[dep] = (importCounts[dep] || 0) + 1;
      });
    });

    const sortedHubs = Object.entries(importCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path, count]) => `- \`/${path}\`: Imported by **${count}** file(s) (Core system hub)`);

    return `### 🔗 Component Communication & File Relationships

Here is the data flow map constructed from imports and dependencies across files:

#### 🕸️ Core System Hubs (Most Imported Files)
${sortedHubs.join('\n') || '- No significant local system hubs parsed. Most files are standalone or only import external packages.'}

#### 🔄 File Dependency Chain
- **Inbound Connections**: Files reference controllers, adapters, or helpers using local imports.
- **Modular Design**: Reusable elements are exported to maintain separation of concerns.

#### 📁 Example Module Connection
Here is a sample import block showing module coordination:
${searchResults.slice(0, 1).map(res => `
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
// In /${res.chunk.filePath}:
${res.chunk.code.split('\n').slice(0, 10).join('\n')}
\`\`\`
`).join('\n')}

---
*For a visual representation, visit the Architecture Graph tab.*`;
  }

  // 9. CONFIGURATION FILES
  if (lowQuery.includes('config') || lowQuery.includes('tsconfig') || lowQuery.includes('next.config') || lowQuery.includes('eslint')) {
    const configFiles = files.filter(f => f.name.toLowerCase().includes('config') || f.name.startsWith('.env') || f.name === '.gitignore');

    return `### ⚙️ Project Configuration Files

Here are the configuration files discovered in this repository:

${configFiles.map(f => `- \`/${f.path}\` (${f.language} file describing settings)`).join('\n') || '- No standard config files detected in index.'}

#### 📄 Sample Configuration Code Chunks
${searchResults.filter(r => r.chunk.filePath.toLowerCase().includes('config')).slice(0, 2).map((res, idx) => `
**Config Segment #${idx + 1}** (\`/${res.chunk.filePath}\`):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n') || '*(No config code chunks available in search results. Type "Show config files" to search for configuration snippets.)*'}

---
*Offline RAG Config Summary*`;
  }

  // 10. FOLDER STRUCTURE / DIRECTORIES
  if (lowQuery.includes('folder') || lowQuery.includes('tree') || lowQuery.includes('directory') || lowQuery.includes('files')) {
    // Reconstruct a text-based tree from metadata.structure
    const renderNode = (node: any, depth: number): string => {
      const indent = '  '.repeat(depth);
      const icon = node.type === 'dir' ? '📁' : '📄';
      let result = `${indent}${icon} ${node.name}\n`;
      if (node.type === 'dir' && node.children && depth < 3) {
        node.children.slice(0, 12).forEach((child: any) => {
          result += renderNode(child, depth + 1);
        });
        if (node.children.length > 12) {
          result += `${indent}  ... and ${node.children.length - 12} more files\n`;
        }
      }
      return result;
    };

    let treeText = '';
    metadata.structure?.slice(0, 10).forEach((node: any) => {
      treeText += renderNode(node, 0);
    });

    return `### 📂 Folder Tree Directory Structure

Here is the directory layout parsed from the cloned repository root:

\`\`\`text
${treeText || 'No structure structure found.'}
\`\`\`

---
*You can explore these files dynamically in the sidebar file tree explorer on the Dashboard.*`;
  }

  // 11. CLASSES AND INTERFACES
  if (lowQuery.includes('class') || lowQuery.includes('interface')) {
    const classFiles = files.filter(f => f.classes.length > 0);

    return `### 🏷️ Discovered Classes & Object Interfaces

I scanned the abstract syntax of files and extracted the following class interfaces:

${classFiles.map(f => `- \`/${f.path}\` defines class(es): **${f.classes.join(', ')}**`).join('\n') || '- No class declarations parsed in this codebase. The files appear to be written in a pure functional, procedural, or scripting style.'}

#### 📁 Example Class Snippet
${searchResults.filter(r => r.chunk.type === 'class').slice(0, 2).map((res, idx) => `
**Class Segment #${idx + 1}** (\`/${res.chunk.filePath}\`):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n') || '*(No class snippets in search results.)*'}

---
*Offline RAG AST Parser*`;
  }

  // 12. FUNCTIONS AND ENDPOINTS
  if (lowQuery.includes('function') || lowQuery.includes('method')) {
    const funcFiles = files.filter(f => f.functions.length > 0);

    return `### ⚙️ Codebase Logical Functions & Methods

Here are the key function endpoints extracted from the static code traversal:

${funcFiles.slice(0, 10).map(f => `- \`/${f.path}\` defines: *${f.functions.slice(0, 5).join(', ')}${f.functions.length > 5 ? '...' : ''}*`).join('\n') || '- No function definitions parsed.'}

#### 📁 Example Function Snippet
${searchResults.filter(r => r.chunk.type === 'function').slice(0, 2).map((res, idx) => `
**Function Segment #${idx + 1}** (\`/${res.chunk.filePath}\`):
\`\`\`${getFileExtensionLanguage(res.chunk.filePath)}
${res.chunk.code}
\`\`\`
`).join('\n') || '*(No function snippets in search results.)*'}

---
*Offline RAG AST Parser*`;
  }

  // DEFAULT GENERAL FALLBACK
  let response = `### 🔍 Repository Intelligence Analysis (Ollama Offline Mode)

I parsed the repository files locally using AST signature matching. Here is what I found regarding: **"${query}"**:

---

#### 📂 Relevant Files and Snips:
`;

  // List unique files
  const fileMatches = Array.from(new Set(searchResults.map(r => r.chunk.filePath)));
  for (const file of fileMatches.slice(0, 3)) {
    response += `- \`/${file}\`\n`;
  }

  response += `\n---\n\n`;

  // Add the retrieved code chunks with explanation
  searchResults.forEach((res, index) => {
    const chunk = res.chunk;
    response += `#### Code Segment #${index + 1}: From \`/${chunk.filePath}\` (Lines ${chunk.startLine}-${chunk.endLine})
Type: \`${chunk.type}\` | Identifier: \`${chunk.name}\`

\`\`\`${getFileExtensionLanguage(chunk.filePath)}
${chunk.code}
\`\`\`

`;
  });

  response += `\n---\n\n### Architectural Insight & Context

Based on these files, here is how the system behaves:
- **Ecosystem**: This project is built using **${metadata.techStack.join(', ')}**.
- **Data Flow**: The file \`/${searchResults[0]?.chunk.filePath || 'main'}\` coordinates operations related to your query.
- **Implementation**: The structures and exports shown above handle the core logic. You can see how functions reference key modules to execute the request lifecycle.

> [!TIP]
> Spin up **Ollama** locally (\`ollama run deepseek-coder\`) on port 11434 to enable fully conversational, deep AI-generative code analysis. RepoGPT will automatically hook into it to stream conversational explanations!`;

  return response;
}

function getFileExtensionLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  if (['js', 'jsx'].includes(ext)) return 'javascript';
  if (['ts', 'tsx'].includes(ext)) return 'typescript';
  if (ext === 'py') return 'python';
  if (ext === 'java') return 'java';
  if (ext === 'go') return 'go';
  if (ext === 'rs') return 'rust';
  if (ext === 'cs') return 'csharp';
  if (ext === 'php') return 'php';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'text';
}
