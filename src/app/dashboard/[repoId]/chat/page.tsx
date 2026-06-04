'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Send, 
  Loader2, 
  Terminal, 
  Bot, 
  User, 
  FileCode, 
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { ChatMessage } from '@/lib/storage';
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
});

const SUGGESTED_QUERIES = [
  'Explain the overall architecture and setup',
  'Where are the main entry points and routes defined?',
  'What are the core dependencies and their purpose?',
  'Summarize the database communication or data models',
  'Show me setup instructions for new developers',
  'Where is user authentication or login implemented?',
  'Find potential security concerns or code smells',
  'How do components/modules communicate in this codebase?',
  'Explain the folder tree and directory structure',
  'Show me config files (like tsconfig, eslint, or package.json)',
  'List all parsed classes and interfaces',
  'List all major functions and endpoints discovered'
];

export default function ChatPage() {
  const params = useParams();
  const repoId = params.repoId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOllamaOnline, setIsOllamaOnline] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek-coder');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Ollama status and load previous chats on startup
  useEffect(() => {
    async function initPage() {
      // 1. Check Ollama
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoId, query: 'ping-ollama-status-check' })
        });
        if (res.ok) {
          const data = await res.json();
          setIsOllamaOnline(data.online === true);
        } else {
          setIsOllamaOnline(false);
        }
      } catch (e) {
        setIsOllamaOnline(false);
      }

      // 2. Clear current chat for clean state or load history from storage
      // To keep it clean, we start with a welcoming assistant message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `👋 **Welcome to RepoGPT Intelligence Copilot!**

I have parsed the codebase modules and built a semantic search index of the repository. Ask me anything about directories, flow lifecycles, imports, or file structures!

You can try the quick queries below or type your own question.`,
          timestamp: new Date().toISOString()
        }
      ]);
    }

    if (repoId) {
      initPage();
    }
  }, [repoId]);

  const handleSend = async (queryToSend: string) => {
    if (!queryToSend.trim() || loading) return;

    setLoading(true);
    setInputMsg('');

    // Append user message
    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: queryToSend,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Create container for incoming assistant message
    const assistantMsgId = Math.random().toString(36).substring(7);
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      references: []
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          query: queryToSend,
          model: selectedModel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulator = '';
      let references: string[] = [];
      let parsedMetadata = false;

      if (!reader) throw new Error('No stream reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulator += decoder.decode(value, { stream: true });
        
        let displayContent = accumulator;
        if (!parsedMetadata && accumulator.includes('__METADATA__:')) {
          const startIdx = accumulator.indexOf('__METADATA__:');
          const endIdx = accumulator.indexOf('\n', startIdx);
          if (endIdx !== -1) {
            const metaLine = accumulator.substring(startIdx, endIdx);
            try {
              const parsedMeta = JSON.parse(metaLine.replace('__METADATA__:', ''));
              references = parsedMeta.references || [];
              parsedMetadata = true;
            } catch (e) {
              console.error('Failed to parse metadata:', e);
            }
            // Remove metadata from accumulator so it's not displayed
            accumulator = accumulator.substring(0, startIdx) + accumulator.substring(endIdx + 1);
            displayContent = accumulator;
          } else {
            // We have __METADATA__: but not the newline yet. 
            // Hide the partial metadata string from display
            displayContent = accumulator.substring(0, startIdx);
          }
        } else if (!parsedMetadata && !accumulator.includes('__METADATA__:') && accumulator.length > 50) {
          // If we've read a data chunk without metadata tag, we don't have metadata
          parsedMetadata = true;
        }

        // Update assistant message with stream chunk
        setMessages(prev => {
          return prev.map(m => {
            if (m.id === assistantMsgId) {
              return {
                ...m,
                content: displayContent,
                references
              };
            }
            return m;
          });
        });
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => {
        return prev.map(m => {
          if (m.id === assistantMsgId) {
            return {
              ...m,
              content: '❌ **Error**: Connection failed. Please make sure the backend is active and reachable.'
            };
          }
          return m;
        });
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      
      {/* Top Header info */}
      <div className="px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between z-10 shrink-0">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">Semantic Code Assistant</h2>
          <p className="text-xs text-slate-500">Ask structural questions and explore logic files interactively.</p>
        </div>

        {/* Model Indicator Status */}
        <div className="flex items-center gap-4">
          {/* Model selection dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-slate-300 font-semibold cursor-pointer"
            >
              <option value="deepseek-coder" className="bg-slate-950">DeepSeek Coder</option>
              <option value="llama3" className="bg-slate-950">Llama 3</option>
              <option value="mistral" className="bg-slate-950">Mistral</option>
            </select>
          </div>

          {/* Online/Offline Badge */}
          {isOllamaOnline ? (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/20 border border-emerald-800/30 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
              <CheckCircle className="w-3 h-3" /> Ollama Active
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/20 border border-amber-800/30 px-2 py-0.5 rounded font-semibold uppercase tracking-wide" title="Ollama offline. Falling back to local keyword vector matching.">
              <Info className="w-3 h-3" /> Fallback Mode
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar">
        
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          
          return (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar circle */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isUser 
                  ? 'bg-slate-900 border-slate-800 text-cyan-400' 
                  : 'bg-violet-950/40 border-violet-800/30 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.1)]'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
              </div>

              {/* Chat bubble text */}
              <div className="space-y-2 max-w-[90%]">
                <div className={`p-4 rounded-xl text-sm leading-relaxed border ${
                  isUser 
                    ? 'bg-slate-900/50 border-slate-800/80 text-slate-200' 
                    : 'bg-slate-900/20 border-slate-900 text-slate-300'
                }`}>
                  <div 
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || '▋') }}
                  />
                </div>

                {/* Citation/References tags */}
                {!isUser && msg.references && msg.references.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1.5">References:</span>
                    {msg.references.map((ref, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
                        title={ref}
                      >
                        <FileCode className="w-3 h-3 text-slate-500" />
                        {ref.split('/').pop()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state: Suggestions buttons */}
        {messages.length <= 1 && (
          <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-violet-400" /> Try a suggested question:
            </h3>
            <div className="flex flex-col gap-2">
              {SUGGESTED_QUERIES.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(query)}
                  className="w-full text-left px-5 py-3 rounded-xl bg-slate-900/30 border border-slate-900 hover:border-violet-500/20 hover:bg-slate-900/60 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer font-medium"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-6 border-t border-slate-900 bg-slate-950/60 shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          
          {/* Suggested Queries Pill Bar */}
          {messages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 mr-1 select-none">
                <HelpCircle className="w-3.5 h-3.5 text-violet-400" /> Suggested:
              </span>
              {SUGGESTED_QUERIES.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(query)}
                  className="px-3 py-1.5 rounded-full border border-slate-900 bg-slate-900/30 hover:border-violet-500/30 hover:bg-slate-900/60 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer whitespace-nowrap font-medium"
                >
                  {query}
                </button>
              ))}
            </div>
          )}

          <div className="relative group rounded-xl p-[1px] bg-gradient-to-r from-violet-500/20 via-cyan-400/20 to-indigo-500/20 focus-within:from-violet-500 focus-within:via-cyan-400 focus-within:to-indigo-500 transition-all duration-300">
            <div className="bg-slate-950 rounded-[11px] p-2 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-slate-500 ml-3 shrink-0" />
              <input
                type="text"
                placeholder={loading ? 'AI is composing response...' : 'Ask a question about this repository...'}
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputMsg)}
                className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 text-sm px-2 py-3 disabled:opacity-50"
                disabled={loading}
              />
              <button
                onClick={() => handleSend(inputMsg)}
                className="p-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-slate-100 flex items-center justify-center shadow-lg shadow-violet-950/50 cursor-pointer transition-all duration-300 disabled:opacity-50"
                disabled={loading || !inputMsg.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-center mt-3 text-[10px] text-slate-600">
            Press Enter to submit • RepoGPT semantic index will return corresponding code snippets dynamically.
          </div>

        </div>
      </div>

    </div>
  );
}
