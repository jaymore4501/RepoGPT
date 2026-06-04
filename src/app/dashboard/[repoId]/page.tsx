'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  HardDrive, 
  Files, 
  Calendar, 
  ExternalLink,
  Code as CodeIcon,
  Loader2,
  Copy,
  Check,
  X
} from 'lucide-react';
import { RepositoryMetadata } from '@/lib/storage';
import { marked } from 'marked';

// Configure marked to render safe markdown
marked.setOptions({
  breaks: true,
  gfm: true
});

function resolveRelativePath(currentFile: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.substring(1);
  }
  
  const currentDirParts = currentFile.split('/').slice(0, -1);
  const relativeParts = relativePath.split('/');
  
  const resultParts = [...currentDirParts];
  
  for (const part of relativeParts) {
    if (part === '.' || part === '') {
      continue;
    }
    if (part === '..') {
      if (resultParts.length > 0) {
        resultParts.pop();
      }
    } else {
      resultParts.push(part);
    }
  }
  
  return resultParts.join('/');
}

const rewriteMarkdownHtml = (htmlContent: string, repoId: string, currentFile: string) => {
  if (!htmlContent) return '';
  
  let updatedHtml = htmlContent.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, beforeSrc, src, afterSrc) => {
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && !src.startsWith('/api/file')) {
      try {
        const decodedSrc = decodeURIComponent(src);
        const resolvedPath = resolveRelativePath(currentFile, decodedSrc);
        const newSrc = `/api/file?repoId=${repoId}&path=${encodeURIComponent(resolvedPath)}`;
        return `<img ${beforeSrc}src="${newSrc}"${afterSrc}>`;
      } catch (e) {
        const resolvedPath = resolveRelativePath(currentFile, src);
        const newSrc = `/api/file?repoId=${repoId}&path=${encodeURIComponent(resolvedPath)}`;
        return `<img ${beforeSrc}src="${newSrc}"${afterSrc}>`;
      }
    }
    return match;
  });

  return updatedHtml;
};

// FileTree Node component (recursive)
interface FileNodeProps {
  node: {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: any[];
    size?: number;
  };
  onFileSelect: (path: string) => void;
  selectedFilePath: string;
  depth: number;
}

const FileTreeNode = ({ node, onFileSelect, selectedFilePath, depth }: FileNodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = selectedFilePath === node.path;

  const handleClick = () => {
    if (node.type === 'dir') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) return <FileCode className="w-4 h-4 text-cyan-400" />;
    if (ext === 'py') return <FileCode className="w-4 h-4 text-yellow-500" />;
    if (ext === 'java') return <FileCode className="w-4 h-4 text-red-400" />;
    if (ext === 'go') return <FileCode className="w-4 h-4 text-cyan-500" />;
    if (ext === 'rs') return <FileCode className="w-4 h-4 text-amber-600" />;
    if (['json', 'yml', 'yaml'].includes(ext || '')) return <File className="w-4 h-4 text-teal-400" />;
    if (ext === 'md') return <File className="w-4 h-4 text-indigo-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        className={`flex items-center gap-1.5 py-1.5 pr-2 rounded text-xs font-medium cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-cyan-950/40 text-cyan-300 border-l border-cyan-400' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
        }`}
      >
        {node.type === 'dir' ? (
          <>
            {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
            <Folder className="w-4 h-4 text-indigo-400 fill-indigo-400/10 shrink-0" />
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3 h-3 shrink-0" />
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {node.type === 'dir' && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children.map((child, idx) => (
            <FileTreeNode 
              key={idx} 
              node={child} 
              onFileSelect={onFileSelect} 
              selectedFilePath={selectedFilePath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DashboardOverviewPage() {
  const params = useParams();
  const repoId = params.repoId as string;

  const [metadata, setMetadata] = useState<RepositoryMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState(true);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const response = await fetch(`/api/repository?repoId=${repoId}`);
        if (!response.ok) throw new Error('Failed to load repo');
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (repoId) {
      loadMetadata();
    }
  }, [repoId]);

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    setLoadingFile(true);
    setFileContent('');
    setPreviewMarkdown(true);
    try {
      const response = await fetch(`/api/file?repoId=${repoId}&path=${encodeURIComponent(path)}`);
      if (!response.ok) throw new Error('Failed to read file');
      const data = await response.json();
      setFileContent(data.content || '');
    } catch (err) {
      setFileContent('Error loading file content. Make sure the file exists and is readable.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-center space-y-4 select-none">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-wide mt-6">Preparing Workspace...</h2>
        <p className="text-sm text-slate-400 max-w-md px-6">Loading codebase assets, graphs, and indexing maps</p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-4">
        <h2 className="text-xl font-bold text-rose-400">Repository Not Found</h2>
        <p>The repository with ID "{repoId}" could not be loaded. Please return to the homepage and run analysis.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950">
      
      {/* LEFT PANEL: Folder Tree Explorer */}
      <div className="w-72 border-r border-slate-900 flex flex-col h-full bg-slate-950/40 shrink-0 select-none">
        <div className="p-4 border-b border-slate-900 bg-slate-950/60 font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Files & Directories</span>
          <Files className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar">
          {metadata.structure && metadata.structure.map((node: any, idx: number) => (
            <FileTreeNode 
              key={idx} 
              node={node} 
              onFileSelect={handleFileSelect} 
              selectedFilePath={selectedFile}
              depth={0}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic details or file viewer */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-950/20">
        
        {/* If file is selected, show Code Viewer */}
        {selectedFile ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Code Viewer Headers */}
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/60 flex items-center justify-between z-10">
              <div className="space-y-1 max-w-[70%]">
                <span className="text-xs text-slate-500 font-medium font-mono">{selectedFile}</span>
                <h3 className="text-sm font-semibold text-slate-200 truncate">{selectedFile.split('/').pop()}</h3>
              </div>
              <div className="flex items-center gap-3">
                {(selectedFile.endsWith('.md') || selectedFile.endsWith('.markdown')) && (
                  <button
                    onClick={() => setPreviewMarkdown(!previewMarkdown)}
                    className="px-2.5 py-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-xs font-semibold cursor-pointer"
                    disabled={loadingFile}
                  >
                    {previewMarkdown ? 'Show Raw Code' : 'Show Preview'}
                  </button>
                )}
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  disabled={loadingFile}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
                <button
                  onClick={() => setSelectedFile('')}
                  className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Content Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950 leading-relaxed scrollbar relative flex flex-col">
              {loadingFile ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-500">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mr-2" /> Loading file source...
                </div>
              ) : (selectedFile.endsWith('.md') || selectedFile.endsWith('.markdown')) && previewMarkdown ? (
                <div 
                  className="markdown-body p-2"
                  dangerouslySetInnerHTML={{ 
                    __html: rewriteMarkdownHtml(marked.parse(fileContent) as string, repoId, selectedFile) 
                  }}
                />
              ) : (
                <div className="flex items-start font-mono text-sm">
                  {/* Line Numbers */}
                  <div className="text-right text-slate-600 select-none pr-4 border-r border-slate-900 text-xs font-semibold space-y-1">
                    {fileContent.split('\n').map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>
                  {/* Code Text */}
                  <pre className="pl-4 text-xs overflow-x-auto text-slate-300 font-medium whitespace-pre">
                    <code>{fileContent}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Else, show Project Stats & AI Summary */
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar">
            
            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl p-5 border border-violet-500/10 flex items-center gap-4">
                <div className="p-3 bg-violet-600/10 rounded-lg border border-violet-500/20 text-violet-400">
                  <Files className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-semibold tracking-wide">Total Files</div>
                  <div className="text-2xl font-bold">{metadata.fileCount}</div>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-5 border border-cyan-500/10 flex items-center gap-4">
                <div className="p-3 bg-cyan-600/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-semibold tracking-wide">Disk Size</div>
                  <div className="text-2xl font-bold">{formatSize(metadata.sizeBytes)}</div>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-5 border border-indigo-500/10 flex items-center gap-4">
                <div className="p-3 bg-indigo-600/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <CodeIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-semibold tracking-wide">Tech Stack</div>
                  <div className="text-sm font-bold truncate max-w-[130px]" title={metadata.techStack.join(', ')}>
                    {metadata.techStack.slice(0, 2).join(' + ') || 'Generic'}
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-5 border border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-semibold tracking-wide">Indexed At</div>
                  <div className="text-xs font-semibold text-slate-300">
                    {new Date(metadata.analyzedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Language Breakdown */}
            <div className="glass-panel rounded-xl border border-slate-900 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">Language Distribution</h3>
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-900">
                {Object.entries(metadata.languages).map(([lang, pct], idx) => {
                  const colors = ['bg-cyan-500', 'bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-yellow-500'];
                  return (
                    <div 
                      key={lang}
                      style={{ width: `${pct}%` }}
                      className={`${colors[idx % colors.length]}`}
                      title={`${lang}: ${pct}%`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                {Object.entries(metadata.languages).map(([lang, pct], idx) => {
                  const dotColors = ['bg-cyan-500', 'bg-violet-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-yellow-500'];
                  return (
                    <div key={lang} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                      <span className="font-medium text-slate-300">{lang}</span>
                      <span className="text-slate-500">({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Generated Overview Markdown */}
            <div className="glass-panel rounded-xl border border-slate-900 p-8 space-y-6">
              <h3 className="text-md font-bold text-slate-200 border-b border-slate-900 pb-4 flex items-center justify-between">
                <span>Repository Intelligence Summary</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-violet-950/40 text-violet-400 border border-violet-800/30 rounded">AI Generated</span>
              </h3>
              
              <div 
                className="markdown-body"
                dangerouslySetInnerHTML={{ 
                  __html: rewriteMarkdownHtml(marked.parse(metadata.summary) as string, repoId, 'README.md') 
                }}
              />
            </div>

            {/* Quick External Link */}
            <div className="text-center">
              <a 
                href={metadata.url}
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors font-semibold"
              >
                Open original GitHub Repository <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
