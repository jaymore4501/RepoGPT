import fs from 'fs';
import path from 'path';
import { ParsedFile, RepositoryIndex, RepositoryMetadata, VisualRelation, CodeChunk, CodeSmell } from './storage';

// Quality analysis helper functions
function calculateQualityMetrics(content: string, linesCount: number, functions: string[], classes: string[], imports: string[]): { smells: CodeSmell[], complexityScore: number, maintainabilityScore: number } {
  const smells: CodeSmell[] = [];
  let complexity = 1;
  let nestingDepth = 0;
  
  const lines = content.split('\n');
  
  // Calculate pseudo cyclomatic complexity and nesting
  let currentNesting = 0;
  let maxNesting = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/\b(if|for|while|switch|case|catch|&&|\|\|)\b/)) {
      complexity++;
    }
    if (line.includes('{')) currentNesting++;
    if (line.includes('}')) currentNesting--;
    
    if (currentNesting > maxNesting) maxNesting = currentNesting;
  }
  nestingDepth = maxNesting;

  if (nestingDepth > 4) {
    smells.push({
      id: `smell-${Date.now()}-${Math.random()}`,
      type: 'Deep Nesting',
      location: 'File level',
      description: `Nesting depth is ${nestingDepth}, which makes the code hard to follow.`,
      recommendation: 'Use early returns or extract nested logic into separate functions.',
      severity: nestingDepth > 6 ? 'high' : 'medium'
    });
  }

  if (linesCount > 500) {
    smells.push({
      id: `smell-${Date.now()}-${Math.random()}`,
      type: 'Large File',
      location: 'File level',
      description: `File has ${linesCount} lines, exceeding the recommended 500 lines limit.`,
      recommendation: 'Split the file into smaller, more focused modules.',
      severity: linesCount > 1000 ? 'critical' : 'high'
    });
  }

  // Calculate scores
  // Base complexity 1 to 100
  let complexityScore = Math.min(100, Math.floor((complexity * 1.5) + (nestingDepth * 5) + (functions.length * 2) + (classes.length * 5)));
  
  // Maintainability Index approximation (100 is best, 0 is worst)
  let maintainabilityScore = Math.max(0, 100 - (complexityScore * 0.5) - (smells.length * 5) - (linesCount / 100));
  
  return { smells, complexityScore, maintainabilityScore: Math.floor(maintainabilityScore) };
}

function calculateSecurityIssues(content: string, language: string): { critical: number; high: number; medium: number } {
  let critical = 0;
  let high = 0;
  let medium = 0;

  // Simple heuristic security scanner
  if (/(password|secret|key|token)\s*=\s*['"][a-zA-Z0-9_-]{10,}['"]/i.test(content)) critical++;
  if (/AWS_ACCESS_KEY|AKIA[0-9A-Z]{16}/.test(content)) critical++;
  if (/eval\(.*\)/.test(content) && language.includes('Script')) high++;
  if (/exec\(|spawn\(|child_process/.test(content) && language.includes('Script')) medium++;
  if (/select\s+\*\s+from.*where.*=/i.test(content) && !/where.*=\s*\?/i.test(content)) high++; // basic SQLi detection
  if (/MD5|SHA1/.test(content)) medium++;

  return { critical, high, medium };
}

// File extensions and matching languages
const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cs': 'C#',
  '.php': 'PHP',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.c': 'C',
  '.h': 'C/C++',
  '.rb': 'Ruby',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.sh': 'Shell',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.html': 'HTML',
  '.css': 'CSS'
};

const EXCLUDE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.cache',
  'venv',
  '.venv',
  'env',
  '.env',
  'target', // Rust build dir
  'bin',
  'obj',
  '__pycache__',
  'tmp',
  'temp'
]);

const EXCLUDE_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'Gemfile.lock',
  'Cargo.lock',
  'composer.lock',
  '.DS_Store'
]);

// Build a JSON file tree representing the folder structure
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: FileNode[];
}

function buildFileTree(dirPath: string, relativeRoot: string = ''): FileNode[] {
  const nodes: FileNode[] = [];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        if (EXCLUDE_DIRS.has(item.name)) continue;
        const relPath = relativeRoot ? `${relativeRoot}/${item.name}` : item.name;
        const subPath = path.join(dirPath, item.name);
        nodes.push({
          name: item.name,
          path: relPath,
          type: 'dir',
          children: buildFileTree(subPath, relPath)
        });
      } else {
        if (EXCLUDE_FILES.has(item.name)) continue;
        const relPath = relativeRoot ? `${relativeRoot}/${item.name}` : item.name;
        const fullPath = path.join(dirPath, item.name);
        let size = 0;
        try {
          size = fs.statSync(fullPath).size;
        } catch (err) {}
        nodes.push({
          name: item.name,
          path: relPath,
          type: 'file',
          size
        });
      }
    }
  } catch (err) {
    console.error('Error building file tree for', dirPath, err);
  }
  // Sort folders first, then files
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// Extract imports, functions, classes, and dependencies from file contents using regexes
function parseCodeFile(filePath: string, relativePath: string, content: string): ParsedFile {
  const ext = path.extname(filePath).toLowerCase();
  const language = LANGUAGE_MAP[ext] || 'Text';
  const size = Buffer.byteLength(content, 'utf8');
  
  const lines = content.split('\n');
  const loc = lines.length;
  let blankLines = 0;
  let commentLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      blankLines++;
    } else if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('<!--')) {
      commentLines++;
    }
  }

  const imports: string[] = [];
  const exports: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];
  const dependencies: string[] = [];

  // JS / TS Parser
  if (language === 'JavaScript' || language === 'TypeScript') {
    // Imports
    const importRegex = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /(?:const|let|var)\s+(?:[^\s=]+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Classes
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    // Functions
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    const arrowFuncRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
    while ((match = arrowFuncRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    // Exports
    const exportNamedRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    while ((match = exportNamedRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
  }

  // Python Parser
  else if (language === 'Python') {
    // Imports
    const pyImportRegex = /^import\s+(\w+)/gm;
    const pyFromRegex = /^from\s+(\w+(?:\.\w+)*)\s+import/gm;
    let match;

    while ((match = pyImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = pyFromRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Classes
    const pyClassRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    while ((match = pyClassRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    // Functions
    const pyFuncRegex = /def\s+(\w+)\s*\(/g;
    while ((match = pyFuncRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
  }

  // Java Parser
  else if (language === 'Java') {
    const javaImportRegex = /import\s+([\w.]+);/g;
    let match;
    while ((match = javaImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    const javaClassRegex = /(?:public\s+|private\s+)?(?:class|interface|enum)\s+(\w+)/g;
    while ((match = javaClassRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    const javaMethodRegex = /(?:public|protected|private|static|\s) +[\w<>[\]]+ +(\w+) *\([^)]*\) *(?:throws [\w, ]+)? *{/g;
    while ((match = javaMethodRegex.exec(content)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch', 'synchronized'].includes(match[1])) {
        functions.push(match[1]);
      }
    }
  }

  // Go Parser
  else if (language === 'Go') {
    const goImportRegex = /import\s+\(\s*([\s\S]*?)\s*\)/g;
    const goSingleImportRegex = /import\s+"([^"]+)"/g;
    let match;

    while ((match = goSingleImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    while ((match = goImportRegex.exec(content)) !== null) {
      const block = match[1];
      const lines = block.split('\n');
      for (const line of lines) {
        const cleaned = line.trim().replace(/"/g, '');
        if (cleaned) imports.push(cleaned.split(' ').pop() || '');
      }
    }

    const goFuncRegex = /func\s+(?:\([^)]+\)\s*)?(\w+)\s*\(/g;
    while ((match = goFuncRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }

    const goStructRegex = /type\s+(\w+)\s+struct/g;
    while ((match = goStructRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }
  }

  // Rust Parser
  else if (language === 'Rust') {
    const rustUseRegex = /use\s+([^;]+);/g;
    let match;
    while ((match = rustUseRegex.exec(content)) !== null) {
      imports.push(match[1].trim());
    }

    const rustStructRegex = /(?:pub\s+)?(?:struct|enum|trait)\s+(\w+)/g;
    while ((match = rustStructRegex.exec(content)) !== null) {
      classes.push(match[1]);
    }

    const rustFnRegex = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(/g;
    while ((match = rustFnRegex.exec(content)) !== null) {
      functions.push(match[1]);
    }
  }

  // Resolve dependencies (local internal imports vs node_modules)
  for (const imp of imports) {
    if (imp.startsWith('.') || imp.startsWith('/') || imp.includes('/') && !imp.startsWith('@')) {
      // It's a local import path
      // Try to resolve clean path relative to repo root
      const fileDir = path.dirname(relativePath);
      let resolved = path.posix.join(fileDir.replace(/\\/g, '/'), imp.replace(/\\/g, '/'));
      // remove trailing /index or .ts etc
      resolved = resolved.replace(/\.(tsx|ts|js|jsx)$/, '');
      dependencies.push(resolved);
    }
  }

  const uniqueImports = Array.from(new Set(imports));
  const uniqueExports = Array.from(new Set(exports));
  const uniqueFunctions = Array.from(new Set(functions));
  const uniqueClasses = Array.from(new Set(classes));
  const uniqueDependencies = Array.from(new Set(dependencies));

  const qualityMetrics = calculateQualityMetrics(
    content,
    content.split('\n').length,
    uniqueFunctions,
    uniqueClasses,
    uniqueImports
  );

  const securityIssues = calculateSecurityIssues(content, language);

  return {
    path: relativePath.replace(/\\/g, '/'),
    name: path.basename(filePath),
    language,
    size,
    loc,
    blankLines,
    commentLines,
    imports: uniqueImports,
    exports: uniqueExports,
    functions: uniqueFunctions,
    classes: uniqueClasses,
    dependencies: uniqueDependencies,
    complexityScore: qualityMetrics.complexityScore,
    maintainabilityScore: qualityMetrics.maintainabilityScore,
    smells: qualityMetrics.smells,
    securityIssues
  };
}

// Perform semantic chunking of a file
function chunkCode(relativePath: string, content: string): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];
  const chunkSize = 150; // Lines per chunk
  const overlap = 30; // Lines of overlap

  if (lines.length <= chunkSize) {
    chunks.push({
      id: `${relativePath}:0-${lines.length}`,
      filePath: relativePath.replace(/\\/g, '/'),
      startLine: 1,
      endLine: lines.length,
      code: content,
      type: 'file',
      name: path.basename(relativePath)
    });
    return chunks;
  }

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + chunkSize, lines.length);
    const chunkLines = lines.slice(start, end);
    const code = chunkLines.join('\n');
    
    // Find what structural components might be inside this chunk
    // Simple lookup of first class or function name in this text block
    let type = 'code_block';
    let name = path.basename(relativePath);

    const classMatch = /class\s+(\w+)/.exec(code);
    const funcMatch = /(?:function|def|fn)\s+(\w+)/.exec(code);

    if (classMatch) {
      type = 'class';
      name = classMatch[1];
    } else if (funcMatch) {
      type = 'function';
      name = funcMatch[1];
    }

    chunks.push({
      id: `${relativePath}:${start}-${end}`,
      filePath: relativePath.replace(/\\/g, '/'),
      startLine: start + 1,
      endLine: end,
      code,
      type,
      name
    });

    if (end === lines.length) break;
    start += (chunkSize - overlap);
  }

  return chunks;
}

// Generate the node-link graph visualization data
function generateRelationships(files: ParsedFile[]): VisualRelation {
  const nodes: VisualRelation['nodes'] = [];
  const links: VisualRelation['links'] = [];
  const nodeSet = new Set<string>();

  // Helper to add nodes
  function addNode(id: string, label: string, type: 'file' | 'dir' | 'service' | 'module' | 'db', size: number, complexityScore?: number, maintainabilityScore?: number, smells?: CodeSmell[]) {
    if (!nodeSet.has(id)) {
      nodeSet.add(id);
      nodes.push({ id, label, type, size, complexityScore, maintainabilityScore, smells });
    }
  }

  // 1. Add all files as nodes
  for (const file of files) {
    addNode(file.path, file.name, 'file', file.size, file.complexityScore, file.maintainabilityScore, file.smells);
    // Also build parent directory structures
    const parts = file.path.split('/');
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        addNode(dirPath, parts[i - 1], 'dir', 0);
        // Link directory to its parent dir or file
        const parentPath = parts.slice(0, i - 1).join('/');
        if (parentPath) {
          links.push({
            source: parentPath,
            target: dirPath,
            type: 'contains'
          });
        }
      }
      // Link the containing directory to the file
      const fileDir = parts.slice(0, -1).join('/');
      links.push({
        source: fileDir,
        target: file.path,
        type: 'contains'
      });
    }
  }

  // 2. Add dependencies between files
  // Match dependencies against file paths
  for (const file of files) {
    for (const dep of file.dependencies) {
      // Find the file that matches this resolved path
      // Because relative imports can omit extensions, we check for a match with or without extensions
      const targetFile = files.find(f => {
        const pWithoutExt = f.path.replace(/\.[^/.]+$/, '');
        return f.path === dep || pWithoutExt === dep;
      });

      if (targetFile && targetFile.path !== file.path) {
        links.push({
          source: file.path,
          target: targetFile.path,
          type: 'imports'
        });
      }
    }
  }

  // 3. Add Custom Core Flow Nodes (Service, DB, API Layers) for better visualization
  let hasAuthFlow = false;
  let hasDatabase = false;
  let hasApi = false;

  for (const file of files) {
    const lowPath = file.path.toLowerCase();
    const lowContent = (file.name + ' ' + file.path).toLowerCase();

    if (lowContent.includes('auth') || lowContent.includes('login') || lowContent.includes('jwt') || lowContent.includes('session')) {
      hasAuthFlow = true;
    }
    if (lowContent.includes('db') || lowContent.includes('database') || lowContent.includes('model') || lowContent.includes('schema') || lowContent.includes('prisma') || lowContent.includes('sql')) {
      hasDatabase = true;
    }
    if (lowContent.includes('api') || lowContent.includes('route') || lowContent.includes('controller') || lowContent.includes('endpoint')) {
      hasApi = true;
    }
  }

  if (hasAuthFlow) {
    addNode('flow::authentication', 'Authentication System', 'service', 15000);
    // Link auth-related files
    for (const file of files) {
      if (file.path.toLowerCase().includes('auth') || file.path.toLowerCase().includes('login')) {
        links.push({ source: file.path, target: 'flow::authentication', type: 'implements' });
      }
    }
  }

  if (hasDatabase) {
    addNode('flow::database', 'Database Service', 'db', 20000);
    for (const file of files) {
      if (file.path.toLowerCase().includes('db') || file.path.toLowerCase().includes('model') || file.path.toLowerCase().includes('schema')) {
        links.push({ source: file.path, target: 'flow::database', type: 'queries' });
      }
    }
  }

  if (hasApi) {
    addNode('flow::api', 'API Controller', 'module', 18000);
    for (const file of files) {
      if (file.path.toLowerCase().includes('api') || file.path.toLowerCase().includes('route') || file.path.toLowerCase().includes('controller')) {
        links.push({ source: file.path, target: 'flow::api', type: 'serves' });
      }
    }
  }

  return { nodes, links };
}

// Detect main technology stack of the repository
function detectTechStack(files: ParsedFile[], rootDir: string): string[] {
  const stack = new Set<string>();

  // Check files and folder indicators
  const fileNames = new Set(files.map(f => f.name));

  // Frameworks/Libraries based on package.json, requirements.txt, cargo.toml
  if (fileNames.has('package.json')) {
    stack.add('Node.js');
    try {
      const content = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (allDeps['next']) stack.add('Next.js');
      if (allDeps['react']) stack.add('React');
      if (allDeps['express']) stack.add('Express.js');
      if (allDeps['typescript']) stack.add('TypeScript');
      if (allDeps['vue']) stack.add('Vue.js');
      if (allDeps['nest']) stack.add('NestJS');
      if (allDeps['tailwindcss']) stack.add('Tailwind CSS');
      if (allDeps['prisma']) stack.add('Prisma ORM');
      if (allDeps['mongoose'] || allDeps['mongodb']) stack.add('MongoDB');
      if (allDeps['pg'] || allDeps['sequelize']) stack.add('PostgreSQL');
    } catch (e) {}
  }

  if (fileNames.has('requirements.txt') || fileNames.has('Pipfile') || fileNames.has('pyproject.toml')) {
    stack.add('Python');
    if (fileNames.has('manage.py')) stack.add('Django');
    // Try to scan contents of requirements.txt
    try {
      const reqPath = path.join(rootDir, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const reqContent = fs.readFileSync(reqPath, 'utf-8');
        if (reqContent.includes('fastapi')) stack.add('FastAPI');
        if (reqContent.includes('flask')) stack.add('Flask');
        if (reqContent.includes('django')) stack.add('Django');
        if (reqContent.includes('sqlalchemy')) stack.add('SQLAlchemy');
        if (reqContent.includes('pymongo')) stack.add('MongoDB');
      }
    } catch (e) {}
  }

  if (fileNames.has('go.mod')) {
    stack.add('Go');
    try {
      const content = fs.readFileSync(path.join(rootDir, 'go.mod'), 'utf-8');
      if (content.includes('github.com/gin-gonic/gin')) stack.add('Gin Framework');
      if (content.includes('github.com/gofiber/fiber')) stack.add('Fiber Framework');
    } catch (e) {}
  }

  if (fileNames.has('Cargo.toml')) {
    stack.add('Rust');
    try {
      const content = fs.readFileSync(path.join(rootDir, 'Cargo.toml'), 'utf-8');
      if (content.includes('tokio')) stack.add('Tokio');
      if (content.includes('actix-web')) stack.add('Actix-Web');
      if (content.includes('axum')) stack.add('Axum');
    } catch (e) {}
  }

  if (fileNames.has('pom.xml') || fileNames.has('build.gradle')) {
    stack.add('Java');
    if (fileNames.has('pom.xml')) {
      try {
        const content = fs.readFileSync(path.join(rootDir, 'pom.xml'), 'utf-8');
        if (content.includes('spring-boot')) stack.add('Spring Boot');
      } catch (e) {}
    }
  }

  if (fileNames.has('composer.json')) {
    stack.add('PHP');
    try {
      const content = fs.readFileSync(path.join(rootDir, 'composer.json'), 'utf-8');
      if (content.includes('laravel/framework')) stack.add('Laravel');
      if (content.includes('symfony/symfony')) stack.add('Symfony');
    } catch (e) {}
  }

  // Fallback to extension counts if no package manager files exist
  if (stack.size === 0) {
    const langCounts: Record<string, number> = {};
    for (const file of files) {
      langCounts[file.language] = (langCounts[file.language] || 0) + 1;
    }
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    for (const [lang] of sortedLangs.slice(0, 3)) {
      if (lang !== 'Text') stack.add(lang);
    }
  }

  return Array.from(stack);
}

// Generate the whole repository index data structure
export async function parseRepository(rootDir: string, repoId: string, repoUrl: string): Promise<{ metadata: RepositoryMetadata, index: RepositoryIndex }> {
  const allFiles: { name: string; relPath: string; fullPath: string; ext: string; size: number; priority: number }[] = [];
  const parsedFiles: ParsedFile[] = [];
  const chunks: CodeChunk[] = [];
  const languages: Record<string, number> = {};
  let totalSize = 0;
  let fileCount = 0;

  const priorityExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.cc', '.c', '.h', '.cs', '.php', '.swift']);
  const configFiles = new Set(['package.json', 'requirements.txt', 'cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'composer.json', 'tsconfig.json', 'eslint.config.mjs']);
  const skipExts = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz',
    '.mp3', '.mp4', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.db', '.sqlite',
    '.exe', '.dll', '.so', '.dylib', '.wasm'
  ]);

  function walk(dir: string, relativeDir: string = '') {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          if (EXCLUDE_DIRS.has(item.name)) continue;
          walk(path.join(dir, item.name), relativeDir ? `${relativeDir}/${item.name}` : item.name);
        } else {
          if (EXCLUDE_FILES.has(item.name)) continue;
          const fullPath = path.join(dir, item.name);
          const relPath = relativeDir ? `${relativeDir}/${item.name}` : item.name;

          const ext = path.extname(item.name).toLowerCase();
          if (skipExts.has(ext)) continue;

          try {
            const stats = fs.statSync(fullPath);
            // Accumulate global repository statistics without reading content
            fileCount++;
            totalSize += stats.size;
            const lang = LANGUAGE_MAP[ext] || 'Text';
            languages[lang] = (languages[lang] || 0) + stats.size;

            // Determine priority
            let priority = 1; // Default low priority for text, markdown, css, yml etc.
            const lowerName = item.name.toLowerCase();
            const lowerRel = relPath.toLowerCase().replace(/\\/g, '/');

            // Ignore test, mock, docs, website, dist in path from parsing
            const parts = lowerRel.split('/');
            const noiseTerms = ['test', 'spec', 'mock', 'benchmark', 'website', 'docs', 'dist', 'build', '__pycache__', '.github', 'temp', 'tmp', '.next', 'node_modules', 'site', 'demo', 'example'];
            const isNoise = parts.some(part => noiseTerms.some(term => part.includes(term)));

            if (!isNoise && stats.size <= 1500000) {
              if (priorityExts.has(ext)) {
                priority = 3;
              } else if (configFiles.has(lowerName)) {
                priority = 2;
              }
              allFiles.push({
                name: item.name,
                relPath,
                fullPath,
                ext,
                size: stats.size,
                priority
              });
            }
          } catch (e) {
            console.error(`Failed to stat file ${relPath}:`, e);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to walk directory ${dir}:`, e);
    }
  }

  // Walk the directory recursively to gather all files and compute statistics
  walk(rootDir);

  // Sort files by priority (high priority first) and size (smaller files first to avoid huge auto-generated/vendor codes)
  allFiles.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.size - b.size;
  });

  // Parse all files for accurate project stats, but limit RAG chunking to avoid memory bloat
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    try {
      const content = await fs.promises.readFile(file.fullPath, 'utf-8');
      const parsed = parseCodeFile(file.fullPath, file.relPath, content);
      parsedFiles.push(parsed);

      // Only generate search chunks for the top 300 prioritized files
      if (i < 300) {
        const fileChunks = chunkCode(file.relPath, content);
        chunks.push(...fileChunks);
      }
    } catch (e) {
      console.error(`Failed to parse file ${file.relPath}:`, e);
    }
  }

  // Compute language percentages
  const languagesPct: Record<string, number> = {};
  if (totalSize > 0) {
    for (const [lang, bytes] of Object.entries(languages)) {
      languagesPct[lang] = Math.round((bytes / totalSize) * 100 * 10) / 10;
    }
  }

  const name = path.basename(repoUrl).replace(/\.git$/, '');
  const techStack = detectTechStack(parsedFiles, rootDir);
  const structure = buildFileTree(rootDir);
  const relationships = generateRelationships(parsedFiles);

  // 1. Fetch created_at date from GitHub API with local git history fallback
  let analyzedAt = new Date().toISOString();
  try {
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1].replace(/\.git$/, '');
    const headers: Record<string, string> = { 'User-Agent': 'RepoGPT-App' };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(3000)
    });
    if (apiRes.ok) {
      const repoData = await apiRes.json();
      if (repoData.created_at) {
        analyzedAt = repoData.created_at;
      }
    } else {
      throw new Error(`GitHub API returned status ${apiRes.status}`);
    }
  } catch (e) {
    console.log('Failed to fetch github repository created_at date via API, falling back to local git history:', e);
    try {
      const { execSync } = require('child_process');
      // Get the oldest commit in the local clone (might be latest if depth 1, still older than today!)
      const stdout = execSync('git log --reverse --format=%aI', { cwd: rootDir, encoding: 'utf-8' });
      const dates = stdout.trim().split('\n');
      if (dates.length > 0 && dates[0]) {
        analyzedAt = new Date(dates[0]).toISOString();
      }
    } catch (gitErr) {
      console.error('Failed to get date from local git repository:', gitErr);
    }
  }

  // 2. Scan LICENSE for details
  let licenseInfo = "Free (Open Source)";
  try {
    const licenseFiles = fs.readdirSync(rootDir).filter(f => f.toLowerCase().startsWith('license'));
    if (licenseFiles.length > 0) {
      const licenseContent = fs.readFileSync(path.join(rootDir, licenseFiles[0]), 'utf-8').toLowerCase();
      if (licenseContent.includes('mit')) licenseInfo = "Free (MIT License)";
      else if (licenseContent.includes('apache')) licenseInfo = "Free (Apache License)";
      else if (licenseContent.includes('gpl')) licenseInfo = "Free (GPL License)";
      else if (licenseContent.includes('bsd')) licenseInfo = "Free (BSD License)";
      else if (licenseContent.includes('mozilla')) licenseInfo = "Free (Mozilla License)";
    }
  } catch (e) {}

  // 3. Complexity Level estimation
  let complexityLevel = "Medium";
  if (fileCount < 15) complexityLevel = "Low";
  else if (fileCount > 70) complexityLevel = "High";

  // 4. Scan README for project description / functionality / features
  let projectPurpose = "";
  try {
    const readmeFiles = fs.readdirSync(rootDir).filter(f => f.toLowerCase() === 'readme.md');
    if (readmeFiles.length > 0) {
      const readmeContent = fs.readFileSync(path.join(rootDir, readmeFiles[0]), 'utf-8');
      const paragraphs = readmeContent
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('!') && !l.startsWith('['));
      
      projectPurpose = paragraphs.slice(0, 3).join(' ');
      if (projectPurpose.length > 300) {
        projectPurpose = projectPurpose.substring(0, 300) + '...';
      }
    }
  } catch (e) {}
  if (!projectPurpose) {
    projectPurpose = `This repository contains the software codebase for "${name}", utilizing a dynamic stack of technologies. It provides unified controllers, services, and modules to power application features.`;
  }

  // Dynamic Features List based on code files
  const featuresList: string[] = [];
  if (parsedFiles.some(f => f.path.toLowerCase().includes('auth') || f.path.toLowerCase().includes('login') || f.path.toLowerCase().includes('session'))) {
    featuresList.push("User Authentication & Sessions (handles user login, token generation, or session verification).");
  }
  if (parsedFiles.some(f => f.path.toLowerCase().includes('db') || f.path.toLowerCase().includes('model') || f.path.toLowerCase().includes('schema') || f.path.toLowerCase().includes('prisma'))) {
    featuresList.push("Database Storage & ORM Mapping (integrates schemas, queries, or database tables).");
  }
  if (parsedFiles.some(f => f.path.toLowerCase().includes('api') || f.path.toLowerCase().includes('route') || f.path.toLowerCase().includes('controller'))) {
    featuresList.push("REST API Endpoints / Web Routes (serves logic routes and coordinates client-server requests).");
  }
  if (techStack.includes('React') || techStack.includes('Next.js') || techStack.includes('Vue.js') || parsedFiles.some(f => f.path.endsWith('.html') || f.path.endsWith('.css'))) {
    featuresList.push("Responsive Web UI Components (renders interactive layouts and styled pages).");
  }
  if (techStack.includes('TypeScript') || techStack.includes('Go') || techStack.includes('Rust')) {
    featuresList.push("Static Type Integrity (utilizes compiler validation and modular code exports).");
  }
  if (featuresList.length === 0) {
    featuresList.push("Command Line Interface / Script execution (runnable automation functions and helpers).");
    featuresList.push("Logical utility modules (provides structured exports for processing functions).");
  } else if (featuresList.length < 3) {
    featuresList.push("Modular utility helper script files (supplements core operations and logic).");
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Compile detailed, short, structured Markdown summary
  const docSummary = `### 💡 Repository Intelligence Summary

**🔍 What the Project is On & For:**
- **Description**: ${projectPurpose}
- **Target Use Case**: Developer application built using the **${techStack.join(', ')}** stack for modular, scalable deployment.

**⚙️ Technical Workings & Functionality:**
- The application coordinates business workflows through class interfaces and functional endpoints.
- External client requests entry points map to routing controllers and service configurations.
- Data pathways query and modify tables/collections via database schemas or localized models.

**✨ Key Features:**
${featuresList.map(f => `- ${f}`).join('\n')}

**📊 Project Profile & Metadata:**
- **Complexity Level**: **${complexityLevel}** (based on structural volume: ${fileCount} files, total size: ${formatSize(totalSize)}).
- **Licensing & Cost**: **${licenseInfo}** (free for local usage, modifications, and open-source integrations).`;

  const setupInstructions = `### Project Setup Instructions

1. **Prerequisites**:
   Ensure you have the runtime environment installed: ${techStack.includes('Node.js') ? 'Node.js (v18+ recommended) and npm' : ''} ${techStack.includes('Python') ? 'Python (v3.9+ recommended) and pip/poetry' : ''} ${techStack.includes('Go') ? 'Go Lang (v1.20+)' : ''} ${techStack.includes('Rust') ? 'Rust toolchain (cargo)' : ''}.

2. **Installation**:
   Clone the repository and install dependency configurations:
   \`\`\`bash
   # Clone the repo
   git clone ${repoUrl}
   cd ${name}
   
   # Install dependencies
   ${techStack.includes('Node.js') ? 'npm install' : ''}${techStack.includes('Python') ? 'pip install -r requirements.txt' : ''}${techStack.includes('Go') ? 'go build' : ''}${techStack.includes('Rust') ? 'cargo build' : ''}
   \`\`\`

3. **Running Dev Server / Execution**:
   Run the local entry points to spin up the application:
   \`\`\`bash
   ${techStack.includes('Node.js') ? (parsedFiles.some(f => f.path.includes('package.json')) ? 'npm run dev' : 'node index.js') : ''}${techStack.includes('Python') ? 'python main.py' : ''}${techStack.includes('Go') ? './' + name : ''}${techStack.includes('Rust') ? 'cargo run' : ''}
   \`\`\`
   
4. **Environment Variables**:
   Check for any \`.env.example\` or configuration scripts to set local ports, keys, or credentials.`;

  const apiDocs = `### API and Route Documentation

Based on the static AST parsing of files, the following entry points, services, and route endpoints have been discovered:

#### Discovered Routes / Service Layers:
${parsedFiles.filter(f => f.path.includes('route') || f.path.includes('controller') || f.path.includes('api')).map(f => {
  return `- **File**: \`/${f.path}\`  
    - **Language**: ${f.language}
    - **Exported Handles / Handlers**: ${f.exports.slice(0, 5).join(', ') || 'Default service routing'}
    - **Internal Helper Functions**: ${f.functions.slice(0, 5).join(', ') || 'N/A'}`;
}).slice(0, 15).join('\n') || '- No specific REST API, Web controller or routes folders detected dynamically. The project might be an utility or library CLI tool.'}

#### Core Logic Classes:
${parsedFiles.filter(f => f.classes.length > 0).slice(0, 10).map(f => {
  return `- \`${f.name}\`: Defines class interfaces: *${f.classes.join(', ')}* (in \`/${f.path}\`)`;
}).join('\n') || '- No class structures parsed. Pure functional or script-based code base.'}`;

  const onboardingGuide = `### Developer Onboarding Guide

Welcome to the **${name}** codebase! This onboarding helper outlines the entry sequence, implementation recommendations, and module responsibilities to get you shipping code quickly.

#### 1. Codebase Entry Points
The root execution paths and system startup begins in:
${parsedFiles.filter(f => f.name.match(/^(index|main|app|server|root)\.(js|ts|py|go|rs|java)$/)).map(f => `- \`/${f.path}\` (${f.language})`).join('\n') || '- No standard naming entry points found. Explore root directories for scripts.'}

#### 2. Key Directories & Modules:
${structure.filter(n => n.type === 'dir').slice(0, 5).map(dir => {
  return `- \`/${dir.name}\`: Houses system modules. Contains ${dir.children?.length || 0} sub-items including files for logic implementation.`;
}).join('\n')}

#### 3. Execution Architecture:
- Data flow: Imports and dependencies flow towards central coordination routes and schema controllers.
- Dependencies: Refer to the technology stack charts on the dashboard to review external API and system level packages utilized.`;

  // Basic Code Duplication Detection (Cross-file)
  const lineCounts = new Map<string, number>();
  const blockHashes = new Map<string, string[]>();
  const crypto = require('crypto');

  for (const f of parsedFiles) {
    f.duplicateLines = 0;
    f.duplicateBlocks = 0;
    
    // Naive block hashing
    try {
      const fullPath = allFiles.find(af => af.relPath === f.path)?.fullPath;
      if (fullPath) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 10);
        
        let dupes = 0;
        for (let i = 0; i < lines.length - 5; i += 5) {
          const block = lines.slice(i, i + 5).join('\n');
          const hash = crypto.createHash('md5').update(block).digest('hex');
          
          if (blockHashes.has(hash)) {
            f.duplicateBlocks++;
            dupes += 5;
            blockHashes.get(hash)?.push(f.path);
          } else {
            blockHashes.set(hash, [f.path]);
          }
        }
        f.duplicateLines = dupes;
      }
    } catch(e) {}
  }
  
  // Aggregate Project Stats
  let totalLoc = 0;
  let totalBlank = 0;
  let totalComments = 0;
  
  for (const f of parsedFiles) {
    if (f.loc) totalLoc += f.loc;
    if (f.blankLines) totalBlank += f.blankLines;
    if (f.commentLines) totalComments += f.commentLines;
  }

  const metadata: RepositoryMetadata = {
    id: repoId,
    name,
    url: repoUrl,
    analyzedAt,
    techStack,
    languages: languagesPct,
    fileCount,
    sizeBytes: totalSize,
    summary: docSummary,
    setupInstructions,
    apiDocs,
    onboardingGuide,
    structure,
    projectStats: {
      totalLoc,
      totalBlank,
      totalComments
    }
  };

  // Git Repository Analytics
  metadata.gitStats = { error: true, contributors: 0, commits: 0, branches: 0, currentBranch: '', lastCommitDate: '', lastCommitAuthor: '' };
  
  if (repoUrl.includes('github.com')) {
    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2].replace('.git', '');
        
        // Fetch from GitHub API
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (response.ok) {
          const ghData = await response.json();
          
          metadata.gitStats = {
            contributors: ghData.network_count || 1, // Fallback heuristic
            commits: ghData.size || 0, // Fallback
            branches: ghData.network_count || 1, 
            currentBranch: ghData.default_branch || 'main',
            lastCommitDate: ghData.updated_at,
            lastCommitAuthor: ghData.owner?.login || 'Unknown'
          };
          
          // Try to get contributors count accurately from API if possible
          try {
             const contribsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`);
             const linkHeader = contribsRes.headers.get('link');
             if (linkHeader) {
               const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
               if (lastPageMatch) {
                 metadata.gitStats.contributors = parseInt(lastPageMatch[1]);
               }
             }
          } catch(e) {}
          
          // Try to get accurate commits count
          try {
             const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
             const linkHeader = commitsRes.headers.get('link');
             if (linkHeader) {
               const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
               if (lastPageMatch) {
                 metadata.gitStats.commits = parseInt(lastPageMatch[1]);
               }
             }
          } catch(e) {}
        }
      }
    } catch (e) {
      console.error('Failed to fetch GitHub API stats:', e);
    }
  }

  // Fallback to Local Git if GitHub API failed or not a github repo
  if (metadata.gitStats.error && fs.existsSync(path.join(rootDir, '.git'))) {
    try {
      const { execSync } = require('child_process');
      const getCmdLines = (cmd: string) => {
        try {
          return execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim().split('\n').filter((l: string) => l.trim().length > 0).length;
        } catch(e) { return 0; }
      };
      const getCmd = (cmd: string) => execSync(cmd, { cwd: rootDir, encoding: 'utf-8' }).trim();
      
      const commitCount = parseInt(getCmd('git rev-list --count --all')) || 0;
      const branchesStr = execSync('git branch -a', { cwd: rootDir, encoding: 'utf-8' }).trim();
      const branches = branchesStr.split('\n').filter((l: string) => l.trim().length > 0 && !l.includes('->')).length || 1;
      const currentBranch = getCmd('git rev-parse --abbrev-ref HEAD');
      const lastCommitDate = getCmd('git log -1 --format=%cI');
      const lastCommitAuthor = getCmd('git log -1 --format="%an"');
      const contributors = getCmdLines('git shortlog -sn --all') || 1;

      metadata.gitStats = {
        contributors,
        commits: commitCount,
        branches,
        currentBranch,
        lastCommitDate,
        lastCommitAuthor
      };
    } catch (e) {
      console.error('Failed to extract git stats:', e);
    }
  }

  const index: RepositoryIndex = {
    id: repoId,
    files: parsedFiles,
    chunks,
    relationships
  };

  return { metadata, index };
}
