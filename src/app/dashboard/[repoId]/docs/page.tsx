'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Terminal, 
  Network, 
  HelpCircle, 
  Download, 
  Loader2,
  BookOpen
} from 'lucide-react';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
});

type DocType = 'summary' | 'setup' | 'api' | 'onboarding';

interface DocTab {
  name: string;
  type: DocType;
  icon: React.ComponentType<any>;
}

function DocsContent() {
  const params = useParams();
  const repoId = params.repoId as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read tab type from URL query parameter, fallback to 'summary'
  const activeTab = (searchParams.get('type') || 'summary') as DocType;

  const [docContent, setDocContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const tabs: DocTab[] = [
    { name: 'Repository Summary', type: 'summary', icon: BookOpen },
    { name: 'Setup Instructions', type: 'setup', icon: Terminal },
    { name: 'API Reference', type: 'api', icon: Network },
    { name: 'Onboarding Guide', type: 'onboarding', icon: HelpCircle }
  ];

  // Fetch document contents whenever activeTab changes
  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      try {
        const response = await fetch(`/api/docs?repoId=${repoId}&type=${activeTab}`);
        if (!response.ok) throw new Error('Failed to load document');
        const data = await response.json();
        setDocContent(data.content || '');
        setDocTitle(data.title || 'Documentation');
      } catch (err) {
        setDocContent('⚠️ Failed to load document contents. Please make sure the repository is fully parsed.');
      } finally {
        setLoading(false);
      }
    }

    if (repoId && activeTab) {
      loadDoc();
    }
  }, [repoId, activeTab]);

  // Export current viewed doc as a markdown file
  const handleExportMarkdown = () => {
    if (!docContent) return;

    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create clean file name, e.g., expressjs-express-setup-guide.md
    const tabNameClean = tabs.find(t => t.type === activeTab)?.name.toLowerCase().replace(/\s+/g, '-');
    link.setAttribute('download', `${repoId}-${tabNameClean}.md`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Navigate when a tab is clicked
  const handleTabSelect = (type: DocType) => {
    router.push(`/dashboard/${repoId}/docs?type=${type}`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between z-10 shrink-0">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">Repository Manuals Generator</h2>
          <p className="text-xs text-slate-500">Read and export automatically generated developer instructions and routing references.</p>
        </div>

        {/* Download Action button */}
        <button
          onClick={handleExportMarkdown}
          disabled={loading || !docContent}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export Markdown
        </button>
      </div>

      {/* Tabs list navigation */}
      <div className="px-6 border-b border-slate-900 bg-slate-950/40 flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-none whitespace-nowrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.type;
          const Icon = tab.icon;

          return (
            <button
              key={tab.type}
              onClick={() => handleTabSelect(tab.type)}
              className={`px-4 py-4.5 border-b-2 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive 
                  ? 'border-cyan-400 text-cyan-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Main Document Content Panel */}
      <div className="flex-1 overflow-y-auto p-8 scrollbar">
        <div className="max-w-4xl mx-auto glass-panel border border-slate-900 rounded-xl p-8 shadow-2xl relative min-h-[400px]">
          
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 text-slate-500">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mr-3" /> Generating custom document...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-4 justify-between">
                <h3 className="text-md font-bold text-slate-200">{docTitle}</h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase">FORMAT: MARKDOWN</span>
              </div>
              
              <div 
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: marked.parse(docContent) }}
              />
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mr-3" /> Loading documentation manual...
      </div>
    }>
      <DocsContent />
    </Suspense>
  );
}
