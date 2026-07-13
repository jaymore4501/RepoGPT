import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, FileCode2, Info, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { ParsedFile, CodeSmell } from '@/lib/storage';
import ReactMarkdown from 'react-markdown';

interface FileInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  file: ParsedFile | null;
  repoId: string;
}

export function FileInspector({ isOpen, onClose, file, repoId }: FileInspectorProps) {
  const [refactoring, setRefactoring] = useState<{ [smellId: string]: string }>({});
  const [loading, setLoading] = useState<{ [smellId: string]: boolean }>({});

  const handleRefactor = async (smell: CodeSmell) => {
    if (!file) return;
    setLoading(prev => ({ ...prev, [smell.id]: true }));
    setRefactoring(prev => ({ ...prev, [smell.id]: '' }));

    try {
      const res = await fetch('/api/quality/refactor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          filePath: file.path,
          smell,
          code: '/* Code fetch not implemented for this preview, using general context */'
        })
      });

      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        setRefactoring(prev => ({
          ...prev,
          [smell.id]: (prev[smell.id] || '') + chunk
        }));
      }
    } catch (err) {
      console.error(err);
      setRefactoring(prev => ({ ...prev, [smell.id]: 'Failed to generate refactoring.' }));
    } finally {
      setLoading(prev => ({ ...prev, [smell.id]: false }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && file && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col font-sans"
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-800/60 bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <FileCode2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200 truncate w-64">{file.name}</h2>
                <p className="text-xs text-slate-500 truncate w-64">{file.path}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-xs text-slate-500 font-medium mb-1">Complexity</div>
                <div className="text-2xl font-bold text-rose-400">{file.complexityScore || 1}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-xs text-slate-500 font-medium mb-1">Maintainability</div>
                <div className="text-2xl font-bold text-emerald-400">{file.maintainabilityScore || 100}</div>
              </div>
            </div>

            {/* Code Smells */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Detected Smells
              </h3>
              
              {(!file.smells || file.smells.length === 0) ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  No issues detected. Code is clean.
                </div>
              ) : (
                <div className="space-y-4">
                  {file.smells.map(smell => (
                    <div key={smell.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-amber-400">{smell.type}</span>
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400">{smell.severity}</span>
                      </div>
                      <p className="text-sm text-slate-300">{smell.description}</p>
                      
                      {!refactoring[smell.id] && !loading[smell.id] ? (
                        <button
                          onClick={() => handleRefactor(smell)}
                          className="mt-2 text-xs flex items-center gap-1 w-max px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded transition-colors"
                        >
                          <Lightbulb className="w-3 h-3" /> Get AI Refactoring
                        </button>
                      ) : (
                        <div className="mt-4 p-4 rounded bg-slate-950 border border-slate-800 text-sm text-slate-300 prose prose-invert max-w-none prose-sm">
                          {loading[smell.id] && !refactoring[smell.id] && (
                            <div className="flex items-center gap-2 text-cyan-400">
                              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing and refactoring...
                            </div>
                          )}
                          <ReactMarkdown>{refactoring[smell.id] || ''}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* General Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" /> Structure Info
              </h3>
              <div className="space-y-2 text-sm text-slate-400">
                <div className="flex justify-between p-2 rounded bg-slate-900/50">
                  <span>Functions</span>
                  <span className="text-slate-200">{file.functions?.length || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900/50">
                  <span>Classes</span>
                  <span className="text-slate-200">{file.classes?.length || 0}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-900/50">
                  <span>Dependencies</span>
                  <span className="text-slate-200">{file.dependencies?.length || 0}</span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
