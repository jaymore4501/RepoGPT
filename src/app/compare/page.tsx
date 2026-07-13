'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  GitCompare, 
  Activity, 
  FileCode2, 
  AlertTriangle, 
  HardDrive, 
  Clock, 
  Network,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ComparePage() {
  const router = useRouter();
  
  const [repos, setRepos] = useState<any[]>([]);
  const [repoAId, setRepoAId] = useState<string>('');
  const [repoBId, setRepoBId] = useState<string>('');
  
  const [repoAData, setRepoAData] = useState<any>(null);
  const [repoBData, setRepoBData] = useState<any>(null);
  
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  
  const [customUrlA, setCustomUrlA] = useState('');
  const [customUrlB, setCustomUrlB] = useState('');

  const handleAnalyzeNew = async (url: string, isA: boolean) => {
    if (!url.trim()) return;
    if (isA) setLoadingA(true);
    else setLoadingB(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), clientId: 'guest-global' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Repository analysis failed');
      }

      // Refresh repos list
      fetch('/api/repository')
        .then(res => res.json())
        .then(dataList => {
          if (Array.isArray(dataList)) {
            const filteredRepos = dataList.filter(r => 
              !['Collabryx', 'Ventrixa', 'RepoGPT'].includes(r.name)
            );
            setRepos(filteredRepos);
          }
        });

      if (isA) {
        setRepoAId(data.repoId);
        setCustomUrlA('');
      } else {
        setRepoBId(data.repoId);
        setCustomUrlB('');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error analyzing repository');
    } finally {
      if (isA) setLoadingA(false);
      else setLoadingB(false);
    }
  };

  useEffect(() => {
    // Fetch all pre-added repos
    fetch('/api/repository')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter out personal repos from the comparison dropdown
          const filteredRepos = data.filter(r => 
            !['Collabryx', 'Ventrixa', 'RepoGPT'].includes(r.name)
          );
          setRepos(filteredRepos);
        }
      })
      .catch(console.error);
  }, []);

  const fetchRepoData = async (id: string, isA: boolean) => {
    if (!id) return;
    
    if (isA) setLoadingA(true);
    else setLoadingB(true);

    try {
      const [metaRes, qualityRes] = await Promise.all([
        fetch(`/api/repository?repoId=${id}`),
        fetch(`/api/quality?repoId=${id}`)
      ]);
      
      const meta = await metaRes.json();
      const quality = await qualityRes.json();
      
      const data = { meta, quality };
      
      if (isA) setRepoAData(data);
      else setRepoBData(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (isA) setLoadingA(false);
      else setLoadingB(false);
    }
  };

  useEffect(() => {
    if (repoAId) fetchRepoData(repoAId, true);
    else setRepoAData(null);
  }, [repoAId]);

  useEffect(() => {
    if (repoBId) fetchRepoData(repoBId, false);
    else setRepoBData(null);
  }, [repoBId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const MetricCard = ({ icon: Icon, title, valA, valB, format = (v: any) => v, better = 'higher' }: any) => {
    const isABetter = better === 'higher' ? valA > valB : valA < valB;
    const isBBetter = better === 'higher' ? valB > valA : valB < valA;
    
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 mb-3 text-sm font-medium">
          <Icon className="w-4 h-4 text-cyan-400" />
          {title}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 relative overflow-hidden">
            {isABetter && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
            <span className={`text-lg font-bold ${isABetter ? 'text-emerald-400' : 'text-slate-200'}`}>
              {valA !== undefined ? format(valA) : '-'}
            </span>
          </div>
          <div className="text-slate-600 text-xs font-bold font-mono">VS</div>
          <div className="flex-1 p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 relative overflow-hidden text-right">
            {isBBetter && <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />}
            <span className={`text-lg font-bold ${isBBetter ? 'text-emerald-400' : 'text-slate-200'}`}>
              {valB !== undefined ? format(valB) : '-'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button 
          onClick={() => router.push('/')}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight">Codebase Comparison</h1>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10 relative">
        
        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Repo A */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-300">Repository A</label>
            <div className="relative">
              <select
                value={repoAId}
                onChange={(e) => setRepoAId(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-violet-500/50 shadow-lg cursor-pointer"
              >
                <option value="">Select an existing repository...</option>
                {repos.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <div className="flex-1 h-px bg-slate-800"></div>
              OR
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste GitHub URL..."
                value={customUrlA}
                onChange={(e) => setCustomUrlA(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeNew(customUrlA, true)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 shadow-lg"
              />
              <button 
                onClick={() => handleAnalyzeNew(customUrlA, true)}
                disabled={!customUrlA || loadingA}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Analyze
              </button>
            </div>
            
            {loadingA && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm p-4">
                <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                Analyzing repository... this may take a moment.
              </div>
            )}
          </div>

          {/* Repo B */}
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-300">Repository B</label>
            <div className="relative">
              <select
                value={repoBId}
                onChange={(e) => setRepoBId(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-violet-500/50 shadow-lg cursor-pointer"
              >
                <option value="">Select an existing repository...</option>
                {repos.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <div className="flex-1 h-px bg-slate-800"></div>
              OR
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste GitHub URL..."
                value={customUrlB}
                onChange={(e) => setCustomUrlB(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeNew(customUrlB, false)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 shadow-lg"
              />
              <button 
                onClick={() => handleAnalyzeNew(customUrlB, false)}
                disabled={!customUrlB || loadingB}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Analyze
              </button>
            </div>
            
            {loadingB && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm p-4">
                <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                Analyzing repository... this may take a moment.
              </div>
            )}
          </div>
        </div>

        {/* Comparison Board */}
        {repoAData && repoBData && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl font-bold text-violet-400">A</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100 truncate w-[300px]">{repoAData.meta.name}</h2>
                  <a href={repoAData.meta.url} target="_blank" className="text-xs text-slate-500 hover:text-cyan-400">{repoAData.meta.url}</a>
                </div>
              </div>
              <div className="flex items-center gap-4 md:flex-row-reverse md:text-right">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl font-bold text-indigo-400">B</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100 truncate w-[300px]">{repoBData.meta.name}</h2>
                  <a href={repoBData.meta.url} target="_blank" className="text-xs text-slate-500 hover:text-cyan-400">{repoBData.meta.url}</a>
                </div>
              </div>
            </div>

            {/* Core Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-200 mb-4">Core Quality Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                  icon={Activity} 
                  title="Overall Quality Score" 
                  valA={repoAData.quality.overallQualityScore} 
                  valB={repoBData.quality.overallQualityScore} 
                />
                <MetricCard 
                  icon={Network} 
                  title="Avg Maintainability" 
                  valA={repoAData.quality.averageMaintainability} 
                  valB={repoBData.quality.averageMaintainability} 
                />
                <MetricCard 
                  icon={FileCode2} 
                  title="Avg Complexity" 
                  valA={repoAData.quality.averageComplexity} 
                  valB={repoBData.quality.averageComplexity} 
                  better="lower"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  title="Files with Issues" 
                  valA={repoAData.quality.filesWithIssues} 
                  valB={repoBData.quality.filesWithIssues} 
                  better="lower"
                />
              </div>
            </div>

            {/* Scale Metrics */}
            <div>
              <h3 className="text-lg font-bold text-slate-200 mb-4">Scale & Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard 
                  icon={FileCode2} 
                  title="Total Files" 
                  valA={repoAData.meta.fileCount} 
                  valB={repoBData.meta.fileCount} 
                  better="none"
                />
                <MetricCard 
                  icon={HardDrive} 
                  title="Disk Size" 
                  valA={repoAData.meta.sizeBytes} 
                  valB={repoBData.meta.sizeBytes} 
                  format={formatSize}
                  better="none"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  title="Critical Files" 
                  valA={repoAData.quality.criticalFiles} 
                  valB={repoBData.quality.criticalFiles} 
                  better="lower"
                />
              </div>
            </div>

            {/* Code Smells & Tech Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Repo A Details */}
              <div className="space-y-6">
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-2">Top Code Smells</h4>
                  <div className="space-y-2">
                    {(repoAData.quality.topSmells || []).slice(0, 4).map((s: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{s.type}</span>
                        <span className="text-rose-400 font-bold">{s.count}</span>
                      </div>
                    ))}
                    {(!repoAData.quality.topSmells || repoAData.quality.topSmells.length === 0) && (
                      <div className="text-sm text-emerald-400">None detected!</div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-2">Tech Stack & Details</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(repoAData.meta.techStack || []).map((tech: string) => (
                      <span key={tech} className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Indexed: {new Date(repoAData.meta.analyzedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Repo B Details */}
              <div className="space-y-6">
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-2">Top Code Smells</h4>
                  <div className="space-y-2">
                    {(repoBData.quality.topSmells || []).slice(0, 4).map((s: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{s.type}</span>
                        <span className="text-rose-400 font-bold">{s.count}</span>
                      </div>
                    ))}
                    {(!repoBData.quality.topSmells || repoBData.quality.topSmells.length === 0) && (
                      <div className="text-sm text-emerald-400">None detected!</div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 border-b border-slate-800 pb-2">Tech Stack & Details</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(repoBData.meta.techStack || []).map((tech: string) => (
                      <span key={tech} className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Indexed: {new Date(repoBData.meta.analyzedAt).toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
