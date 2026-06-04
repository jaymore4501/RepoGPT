'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Code, 
  Network, 
  FileText, 
  ArrowRight, 
  Server, 
  Terminal, 
  Info,
  Star,
  BookOpen,
  Cpu,
  Layers,
  Gem,
  Briefcase,
  Sparkles,
  ArrowUpRight,
  Compass,
  ChevronDown,
  Rocket
} from 'lucide-react';
import MagicRings from '@/components/MagicRings';
import SplitText from '@/components/SplitText';
import BorderGlow from '@/components/BorderGlow';
import Stepper, { Step } from '@/components/Stepper';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const ANALYSIS_STEPS: Step[] = [
  { title: 'Cloning Repository', description: 'Performing a secure shallow clone of the codebase' },
  { title: 'Language & AST Parsing', description: 'Traversing file trees and resolving import/export symbols' },
  { title: 'Generating Graph Relationships', description: 'Mapping visual code nodes and structural dependencies' },
  { title: 'Building Local RAG Index', description: 'Chunking files and index vocabulary for semantic retrieval' }
];

interface ExampleRepo {
  name: string;
  url: string;
  description: string;
  goalId?: string;
}

interface RepoCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
  repos: ExampleRepo[];
}

const REPO_CATEGORIES: RepoCategory[] = [
  {
    id: 'starred',
    name: 'Most Starred',
    icon: Star,
    description: 'The most popular repositories on GitHub by star count',
    repos: [
      { name: 'freeCodeCamp', url: 'https://github.com/freeCodeCamp/freeCodeCamp.git', description: 'Giant open source codebase and curriculum' },
      { name: 'free-programming-books', url: 'https://github.com/EbookFoundation/free-programming-books.git', description: 'Freely available programming books' },
      { name: 'awesome', url: 'https://github.com/sindresorhus/awesome.git', description: 'Curated lists of awesome topics' },
      { name: 'build-your-own-x', url: 'https://github.com/codecrafters-io/build-your-own-x.git', description: 'Recreate your favorite technologies from scratch' },
      { name: 'public-apis', url: 'https://github.com/public-apis/public-apis.git', description: 'A collective list of free APIs' },
      { name: 'coding-interview-university', url: 'https://github.com/jwasham/coding-interview-university.git', description: 'Complete computer science study plan' },
      { name: 'developer-roadmap', url: 'https://github.com/kamranahmedse/developer-roadmap.git', description: 'Roadmaps for web development paths' },
      { name: 'system-design-primer', url: 'https://github.com/donnemartin/system-design-primer.git', description: 'Learn how to design large-scale systems' }
    ]
  },
  {
    id: 'cs',
    name: 'Learn CS',
    icon: BookOpen,
    description: 'Foundational computer science and programming resources',
    repos: [
      { name: 'OSSU Computer Science', url: 'https://github.com/ossu/computer-science.git', description: 'Path to a free self-taught education in CS' },
      { name: 'You Don’t Know JS', url: 'https://github.com/getify/You-Dont-Know-JS.git', description: 'Deep dive into JavaScript core mechanics' },
      { name: 'The Algorithms', url: 'https://github.com/TheAlgorithms/Python.git', description: 'All algorithms implemented in Python' },
      { name: '30 Seconds of Code', url: 'https://github.com/30-seconds/30-seconds-of-code.git', description: 'Short JS snippets for all development needs' }
    ]
  },
  {
    id: 'backend',
    name: 'System Design',
    icon: Cpu,
    description: 'Best materials for scalability, architectures, and backend design',
    repos: [
      { name: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer.git', description: 'Learn how to design large-scale systems' },
      { name: 'Awesome Scalability', url: 'https://github.com/binhnguyennus/awesome-scalability.git', description: 'Scalability patterns and principles' },
      { name: 'System Design 101', url: 'https://github.com/ByteByteGoHq/system-design-101.git', description: 'Visual guide to system design principles' }
    ]
  },
  {
    id: 'real-code',
    name: 'Real Projects',
    icon: Layers,
    description: 'Analyze the engineering behind major industry codebases',
    repos: [
      { name: 'VS Code', url: 'https://github.com/microsoft/vscode.git', description: 'Extensible code editor by Microsoft' },
      { name: 'Next.js', url: 'https://github.com/vercel/next.js.git', description: 'The React Framework for production web apps' },
      { name: 'FastAPI', url: 'https://github.com/fastapi/fastapi.git', description: 'High performance web framework for Python' },
      { name: 'Docker CE', url: 'https://github.com/docker/docker-ce.git', description: 'Docker Community Edition codebase' },
      { name: 'TensorFlow', url: 'https://github.com/tensorflow/tensorflow.git', description: 'Open source platform for machine learning' },
      { name: 'PyTorch', url: 'https://github.com/pytorch/pytorch.git', description: 'Tensors and Dynamic neural networks in Python' }
    ]
  },
  {
    id: 'ai',
    name: 'AI & Agents',
    icon: Sparkles,
    description: 'Leading AI tools, multi-agent frameworks, and local LLM frontends',
    repos: [
      { name: 'LangChain', url: 'https://github.com/langchain-ai/langchain.git', description: 'Framework for building LLM applications' },
      { name: 'Dify', url: 'https://github.com/langgenius/dify.git', description: 'Innovation platform for LLM applications' },
      { name: 'Langflow', url: 'https://github.com/langflow-ai/langflow.git', description: 'Visual framework for building multi-agent AI' },
      { name: 'Ollama', url: 'https://github.com/ollama/ollama.git', description: 'Run Llama, DeepSeek, and other LLMs locally' },
      { name: 'Open WebUI', url: 'https://github.com/open-webui/open-webui.git', description: 'User-friendly WebUI for local and cloud LLMs' },
      { name: 'RAGFlow', url: 'https://github.com/infiniflow/ragflow.git', description: 'Deep document understanding-based RAG engine' },
      { name: 'CrewAI', url: 'https://github.com/crewAIInc/crewAI.git', description: 'Multi-agent system orchestration framework' },
      { name: 'AutoGPT', url: 'https://github.com/Significant-Gravitas/AutoGPT.git', description: 'Visionary autonomous AI agent compiler' },
      { name: 'n8n', url: 'https://github.com/n8n-io/n8n.git', description: 'Workflow automation with AI capabilities' },
      { name: 'OpenHands', url: 'https://github.com/All-Hands-AI/OpenHands.git', description: 'Autonomous agentic coding assistant software' }
    ]
  },
  {
    id: 'gems',
    name: 'Hidden Gems',
    icon: Gem,
    description: 'Outstanding open-source alternatives and self-hosted development environments',
    repos: [
      { name: 'Awesome Selfhosted', url: 'https://github.com/awesome-selfhosted/awesome-selfhosted.git', description: 'Locally hostable software library list' },
      { name: 'Appwrite', url: 'https://github.com/appwrite/appwrite.git', description: 'Backend-as-a-service server for developers' },
      { name: 'PocketBase', url: 'https://github.com/pocketbase/pocketbase.git', description: 'Open source Go backend in one file' },
      { name: 'Hoppscotch', url: 'https://github.com/hoppscotch/hoppscotch.git', description: 'Free, fast API request builder tool' },
      { name: 'Coolify', url: 'https://github.com/coollabsio/coolify.git', description: 'Self-hostable Heroku & Vercel alternative' }
    ]
  },
  {
    id: 'goals',
    name: 'By Career Goal',
    icon: Briefcase,
    description: 'Curated paths depending on what skills you want to master next',
    repos: [
      { name: 'Get a Job: Interview Prep', url: 'https://github.com/jwasham/coding-interview-university.git', description: 'CS study plan to pass big-tech interviews', goalId: 'job' },
      { name: 'Get a Job: System Design', url: 'https://github.com/donnemartin/system-design-primer.git', description: 'Master large-scale system designs', goalId: 'job' },
      { name: 'AI Engineer: LangChain', url: 'https://github.com/langchain-ai/langchain.git', description: 'Build context-aware LLM agents', goalId: 'ai-engineer' },
      { name: 'AI Engineer: Ollama Local', url: 'https://github.com/ollama/ollama.git', description: 'Deploy and run code models locally', goalId: 'ai-engineer' },
      { name: 'AI Engineer: OpenHands Dev', url: 'https://github.com/All-Hands-AI/OpenHands.git', description: 'Contribute to autonomous AI programmers', goalId: 'ai-engineer' },
      { name: 'Startup Ideas: Selfhosted', url: 'https://github.com/awesome-selfhosted/awesome-selfhosted.git', description: 'Discover self-hostable service architectures', goalId: 'startup' },
      { name: 'Startup Ideas: Free APIs', url: 'https://github.com/public-apis/public-apis.git', description: 'Explore data sources and API endpoints', goalId: 'startup' },
      { name: 'Elite Coding: Build Your Own X', url: 'https://github.com/codecrafters-io/build-your-own-x.git', description: 'Write compilers, databases, and git from scratch', goalId: 'elite' },
      { name: 'Elite Coding: The Algorithms', url: 'https://github.com/TheAlgorithms/Python.git', description: 'Study clean mathematical code algorithms', goalId: 'elite' }
    ]
  },
  {
    id: 'productivity',
    name: 'Life-Hacks & Productivity',
    icon: Rocket,
    description: 'Tools, self-hosted alternatives, SaaS guides, and templates to skyrocket developer output',
    repos: [
      { name: 'FreeDomain', url: 'https://github.com/DigitalPlatDev/FreeDomain.git', description: 'Get and manage free domains for projects/startups' },
      { name: 'OpenVid', url: 'https://github.com/cristianOlivera/openvid.git', description: 'Open-source Loom screen/video recording alternative' },
      { name: 'deploy-your-own-saas', url: 'https://github.com/atarity/deploy-your-own-saas.git', description: 'Step-by-step SaaS deployment guide' },
      { name: 'developer-portfolios', url: 'https://github.com/emmabostian/developer-portfolios.git', description: 'Ready-to-use developer portfolio templates' },
      { name: 'map3d', url: 'https://github.com/cartesiancs/map3d.git', description: 'Interactive 3D mapping and visualization' },
      { name: 'CADAM', url: 'https://github.com/adam-cad/cadam.git', description: 'Experimental AI CAD tooling' },
      { name: 'claw-code', url: 'https://github.com/instructkr/claw-code.git', description: 'AI coding workflow and automation helper' },
      { name: 'AppFlowy', url: 'https://github.com/AppFlowy-IO/AppFlowy.git', description: 'Open-source Notion competitor' },
      { name: 'Immich', url: 'https://github.com/immich-app/immich.git', description: 'Self-hosted Google Photos alternative' },
      { name: 'Docmost', url: 'https://github.com/docmost/docmost.git', description: 'Open-source knowledge management/wiki platform' },
      { name: 'Cal.com', url: 'https://github.com/calcom/cal.com.git', description: 'Open-source Calendly alternative' },
      { name: 'Activepieces', url: 'https://github.com/activepieces/activepieces.git', description: 'Open-source Zapier automation alternative' },
      { name: 'ToolJet', url: 'https://github.com/ToolJet/ToolJet.git', description: 'Build internal developer tools quickly' },
      { name: 'Rowy', url: 'https://github.com/rowyio/rowy.git', description: 'Spreadsheet-style backend manager interface' },
      { name: 'Dub', url: 'https://github.com/dubinc/dub.git', description: 'Link shortener + powerful analytics' },
      { name: 'Payload CMS', url: 'https://github.com/payloadcms/payload.git', description: 'Modern TypeScript Headless CMS' },
      { name: 'caveman-code-skill', url: 'https://github.com/cavemanlabs/caveman-code-skill.git', description: 'Developer skill progression system' },
      { name: 'Supabase', url: 'https://github.com/supabase/supabase.git', description: 'Open-source Firebase backend alternative' },
      { name: 'Plane', url: 'https://github.com/makeplane/plane.git', description: 'Open-source Jira project tracker alternative' },
      { name: 'Twenty', url: 'https://github.com/twentyhq/twenty.git', description: 'Modern open-source CRM customer system' },
      { name: 'Chatwoot', url: 'https://github.com/chatwoot/chatwoot.git', description: 'Open-source customer support platform' }
    ]
  }
];

const GOALS = [
  { id: 'all', name: '✨ All Career Goals' },
  { id: 'job', name: '💼 If You Want a Job' },
  { id: 'ai-engineer', name: '🤖 If You Want to Become an AI Engineer' },
  { id: 'startup', name: '🚀 If You Want Startup Ideas' },
  { id: 'elite', name: '🏆 If You Want to Become Elite at Coding' }
];

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeCategory, setActiveCategory] = useState('starred');
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false);
  const [showExploreRepos, setShowExploreRepos] = useState(false);

  const validateUrl = (url: string) => {
    const githubRegex = /^https:\/\/github\.com\/[\w\-._]+\/[\w\-._]+(?:\.git)?\/?$/;
    return githubRegex.test(url.trim());
  };

  const startAnalysis = async (urlToAnalyze: string) => {
    if (!urlToAnalyze) return;
    if (!validateUrl(urlToAnalyze)) {
      setStatus('error');
      setErrorMsg('Please enter a valid public GitHub repository URL (e.g., https://github.com/expressjs/express)');
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    setCurrentStep(0);

    // Simulate progress ticks for the stepper to make loading feel extremely interactive
    const stepIntervals = [1800, 3000, 2000, 2500];
    let step = 0;

    const interval = setInterval(() => {
      if (step < ANALYSIS_STEPS.length - 1) {
        step++;
        setCurrentStep(step);
      } else {
        clearInterval(interval);
      }
    }, 2000);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToAnalyze })
      });

      const data = await response.json();
      clearInterval(interval);

      if (!response.ok) {
        throw new Error(data.error || 'Repository analysis failed');
      }

      // Success
      setCurrentStep(ANALYSIS_STEPS.length);

      // Trigger Confetti
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#06b6d4', '#6366f1']
      });

      // Show checkmark completed state for 800ms, then swap to transitioning spinner and redirect
      setTimeout(() => {
        setStatus('success');
        router.push(`/dashboard/${data.repoId}`);
      }, 800);

    } catch (err: any) {
      clearInterval(interval);
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during repository ingestion.');
    }
  };

  const handleQuickSelect = (url: string) => {
    setRepoUrl(url);
    startAnalysis(url);
  };

  return (
    <main className="relative min-h-screen flex flex-col justify-between z-10 overflow-hidden bg-slate-950 text-slate-100">
      {/* Dynamic Magic Rings Background */}
      <MagicRings />

      {/* Header / Navbar */}
      <nav className="sticky top-0 w-full z-50 glass-navbar px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <img src="/Logo.png" alt="RepoGPT Logo" className="w-8 h-8 rounded-[6px]" />
            <span className="font-semibold text-lg tracking-wider text-slate-100 font-sans">
              Repo<span className="text-cyan-400">GPT</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#ollama" className="hover:text-cyan-400 transition-colors">Ollama Guide</a>
            <a 
              href="https://github.com/jaymore4501/RepoGPT" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
            >
              <GithubIcon className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* Hero and Core Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-4xl w-full text-center space-y-8">
          
          {/* Neon Banner */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-950/20 text-xs text-violet-300 font-medium tracking-wide animate-pulse">
            <Server className="w-3.5 h-3.5" /> Platform Active • Zero Cloud Limits
          </div>

          {/* Staggered Heading */}
          <div className="space-y-3">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-100 font-sans leading-none">
              <SplitText text="Repo" className="text-neon-gradient" delay={0.1} />
              <SplitText text="GPT" className="text-slate-100" delay={0.3} />
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
              AI-powered repository intelligence and interactive architecture visualization platform.
            </p>
          </div>

          {/* URL Input Input Panel / Stepper */}
          {status === 'idle' || status === 'error' ? (
            <div className="space-y-8">
              {/* URL Input Input Panel */}
              <div className="max-w-2xl mx-auto w-full space-y-4">
                {/* Glowing Input Box */}
                <div className="relative group rounded-xl p-[1px] bg-gradient-to-r from-violet-500/20 via-cyan-400/20 to-indigo-500/20 focus-within:from-violet-500 focus-within:via-cyan-400 focus-within:to-indigo-500 transition-all duration-500 shadow-2xl">
                  <div className="bg-slate-950/80 rounded-[11px] p-2 flex items-center gap-2">
                    <GithubIcon className="w-5 h-5 text-slate-500 ml-3" />
                    <input
                      type="text"
                      placeholder="Paste GitHub repository URL..."
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && startAnalysis(repoUrl)}
                      className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 text-sm md:text-base px-2 py-3"
                    />
                    <button
                      onClick={() => startAnalysis(repoUrl)}
                      className="px-5 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-slate-100 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-violet-950/50 cursor-pointer transition-all duration-300 active:scale-95"
                    >
                      Analyze <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {status === 'error' && (
                  <p className="text-rose-400 text-xs font-semibold tracking-wide text-center">
                    ⚠️ {errorMsg}
                  </p>
                )}
              </div>

              {/* Collapsible Header toggle */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowExploreRepos(!showExploreRepos)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-violet-500/30 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-2.5 cursor-pointer shadow-xl relative z-10 active:scale-98"
                >
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Explore Top GitHub Repositories</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-350 ${showExploreRepos ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>
              </div>

              {/* Collapsible Repository Explorer Panel */}
              <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden origin-top ${
                  showExploreRepos 
                    ? 'max-h-[1000px] opacity-100 mt-6 scale-100 visible' 
                    : 'max-h-0 opacity-0 scale-95 invisible'
                }`}
              >
                <div className="space-y-4 pt-6 border-t border-slate-900/60 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-cyan-400" /> Explore Top Repositories
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {REPO_CATEGORIES.find(c => c.id === activeCategory)?.description}
                      </p>
                    </div>
                  </div>

                  {/* Tabs list */}
                  <div className="flex flex-wrap items-center gap-2 pb-3">
                    {REPO_CATEGORIES.map((category) => {
                      const isActive = activeCategory === category.id;
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border flex items-center gap-1.5 transition-all cursor-pointer ${
                            isActive
                              ? 'bg-violet-950/40 border-violet-500/35 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.12)]'
                              : 'bg-slate-900/30 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tabs content head / filter */}
                  {activeCategory === 'goals' && (
                    <div className="relative z-30 pt-1 pb-2 flex items-center justify-between">
                      <div className="relative">
                        {isGoalDropdownOpen && (
                          <div 
                            className="fixed inset-0 z-40 bg-transparent" 
                            onClick={() => setIsGoalDropdownOpen(false)}
                          />
                        )}
                        
                        <button
                          onClick={() => setIsGoalDropdownOpen(!isGoalDropdownOpen)}
                          className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all flex items-center gap-2 cursor-pointer relative z-50 shadow-md active:scale-98"
                        >
                          <span>🎯 Select Goal:</span>
                          <span className="text-cyan-400 font-bold">
                            {GOALS.find(g => g.id === selectedGoal)?.name.replace(/^(💼|🤖|🚀|🏆|✨)\s*/, '')}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isGoalDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div 
                          className={`absolute left-0 mt-2 w-72 rounded-xl bg-slate-950/95 backdrop-blur-xl border border-slate-800 shadow-2xl p-1.5 transition-all duration-305 origin-top-left z-50 ${
                            isGoalDropdownOpen 
                              ? 'opacity-100 scale-100 translate-y-0 visible' 
                              : 'opacity-0 scale-95 -translate-y-2 invisible'
                          }`}
                        >
                          {GOALS.map((goal) => {
                            const isGoalActive = selectedGoal === goal.id;
                            return (
                              <button
                                key={goal.id}
                                onClick={() => {
                                  setSelectedGoal(goal.id);
                                  setIsGoalDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                  isGoalActive 
                                    ? 'bg-violet-950/40 border border-violet-500/25 text-violet-300' 
                                    : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200 border border-transparent'
                                }`}
                              >
                                <span>{goal.name}</span>
                                {isGoalActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grid layout of repository cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {(() => {
                      const categoryData = REPO_CATEGORIES.find(c => c.id === activeCategory);
                      const filteredRepos = categoryData?.repos.filter(repo => {
                        if (activeCategory !== 'goals' || selectedGoal === 'all') return true;
                        return (repo as any).goalId === selectedGoal;
                      }) || [];
                      
                      return filteredRepos.map((repo, idx) => (
                        <div
                          key={repo.name}
                          onClick={() => handleQuickSelect(repo.url)}
                          className="glass-panel hover:bg-slate-900/30 hover:border-violet-500/35 transition-all duration-300 cursor-pointer rounded-xl p-4 flex flex-col justify-between group h-[120px] select-none animate-fade-in"
                          style={{
                            animationDelay: `${idx * 40}ms`
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-semibold text-xs text-slate-200 group-hover:text-cyan-400 transition-colors duration-300 truncate">
                                {repo.name}
                              </span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                            </div>
                            <p className="text-[10px] leading-relaxed text-slate-500 line-clamp-2">
                              {repo.description}
                            </p>
                          </div>
                          <span className="text-[9px] font-bold tracking-wider uppercase text-violet-400 group-hover:text-cyan-400 transition-colors flex items-center gap-1 mt-1">
                            Ingest & Analyze <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : status === 'success' ? (
            /* Premium Preparing Workspace Spinner Overlay */
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md z-50 text-center space-y-4 animate-fade-in select-none">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-slate-100 tracking-wide mt-6">Preparing Workspace...</h2>
              <p className="text-sm text-slate-400 max-w-md px-6">Loading codebase assets, graphs, and indexing maps</p>
            </div>
          ) : (
            /* Loader Timeline */
            <div className="max-w-2xl mx-auto w-full">
              <Stepper 
                steps={ANALYSIS_STEPS} 
                currentStep={currentStep} 
                status={status} 
                errorMessage={errorMsg}
              />
            </div>
          )}
        </div>
      </div>

      {/* Feature Showcase Section */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-20 border-t border-slate-900 bg-slate-950/30 relative z-20 space-y-16">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-100">Supercharged Codebase Intelligence</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">Explore, query, and dissect software systems instantly without leaving your browser.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BorderGlow className="h-64 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                <Code className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Semantic AI Chat</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ask repository-wide questions naturally. Returns precise answers citing exact files and blocks of code.
              </p>
            </div>
            <span className="text-xs text-violet-400 font-semibold flex items-center gap-1">Interact with Code <ArrowRight className="w-3.5 h-3.5" /></span>
          </BorderGlow>

          <BorderGlow className="h-64 flex flex-col justify-between" glowColors="from-cyan-600 via-violet-500 to-cyan-400">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                <Network className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Architecture Graphs</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Zoom, pan, and browse file structures, module imports, and requests paths via React Flow maps.
              </p>
            </div>
            <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">Explore Visualizations <ArrowRight className="w-3.5 h-3.5" /></span>
          </BorderGlow>

          <BorderGlow className="h-64 flex flex-col justify-between" glowColors="from-indigo-600 via-cyan-500 to-indigo-400">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Auto Documentation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Generates instant developer manuals, onboarding summaries, REST routing maps, and setup guides.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">Generate Manuals <ArrowRight className="w-3.5 h-3.5" /></span>
          </BorderGlow>
        </div>
      </section>

      {/* Ollama Guide Section */}
      <section id="ollama" className="max-w-4xl mx-auto w-full px-6 py-16 border-t border-slate-900 relative z-20">
        <div className="glass-panel rounded-2xl p-8 border border-violet-500/15 flex flex-col md:flex-row gap-8 items-start shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg mt-1">
            <Terminal className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-6 flex-1">
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Unlock Conversational AI with Ollama
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mt-2">
                RepoGPT works natively out-of-the-box using local keyword indexing. To unlock fully conversational codebase Q&A, you can connect to local Large Language Models (LLMs) running on your own CPU or GPU.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-left">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200">🔒 100% Local and Secure</span>
                <p className="text-slate-400 leading-relaxed">
                  Your code never leaves your machine. Ollama runs the models offline, ensuring zero external data leakage.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200">🚀 Zero Cost & API Limits</span>
                <p className="text-slate-400 leading-relaxed">
                  Run complex code queries without paying for API keys, subscription tokens, or cloud service limits.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-xs text-slate-300 space-y-4 text-left">
              <div className="flex items-center gap-2 text-indigo-400 border-b border-slate-800/80 pb-2 font-sans font-semibold">
                <Info className="w-4 h-4" /> Setup Instructions
              </div>
              
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-200">1. Download & Install Ollama</div>
                <div className="text-slate-400 pl-4">
                  Visit <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">ollama.com</a> to download and install the client for Windows, macOS, or Linux.
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-slate-200">2. Launch the local LLM</div>
                <div className="text-slate-400 pl-4">
                  Open your terminal and run a model optimized for coding tasks (e.g. DeepSeek Coder 6.7B or Llama 3):
                </div>
                <div className="bg-slate-900 px-3 py-2.5 rounded text-cyan-300 font-semibold border border-slate-800/80 mt-1 ml-4 select-all">
                  ollama run deepseek-coder
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-slate-200">3. Connect automatically</div>
                <div className="text-slate-400 pl-4">
                  RepoGPT automatically detects the active connection at <code className="text-violet-300 font-semibold bg-violet-950/20 px-1 py-0.5 rounded">http://localhost:11434</code>. You will see the <span className="text-emerald-400 font-bold">Ollama Active</span> badge in the Semantic Code Chat tab!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-600 z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 RepoGPT AI Inc. Built for lightning-fast repository intelligence.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-slate-800">•</span>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
