'use client';

import React from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Network, FileText, ArrowLeft, ShieldCheck, Terminal, HelpCircle, Activity } from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams.get('type') || 'summary';
  
  const repoId = params.repoId as string;
  const repoName = repoId ? repoId.split('-').slice(1).join('-') || repoId : 'Codebase';

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard Overview', href: `/dashboard/${repoId}`, icon: LayoutDashboard },
    { name: 'Code Quality', href: `/dashboard/${repoId}/quality`, icon: Activity },
    { name: 'Semantic Code Chat', href: `/dashboard/${repoId}/chat`, icon: MessageSquare },
    { name: 'Architecture Graph', href: `/dashboard/${repoId}/visualize`, icon: Network },
    { name: 'Setup & Installation', href: `/dashboard/${repoId}/docs?type=setup`, icon: Terminal },
    { name: 'API Reference Docs', href: `/dashboard/${repoId}/docs?type=api`, icon: FileText },
    { name: 'Onboarding Manual', href: `/dashboard/${repoId}/docs?type=onboarding`, icon: HelpCircle }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Sidebar Panel */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between shrink-0 relative z-30">
        
        {/* Top Branding and Repo Info */}
        <div className="p-6 space-y-6">
          <div 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs text-slate-500 font-medium group-hover:text-slate-300 transition-colors">Home</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <img src="/Logo.png" alt="RepoGPT Logo" className="w-6 h-6 rounded-[4px]" />
              <span className="font-bold text-sm tracking-wide capitalize truncate max-w-[170px]">
                {repoName}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/30 border border-cyan-800/30 text-[10px] text-cyan-400 font-medium">
              <ShieldCheck className="w-3 h-3" /> Indexed & Ready
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 py-2">
          {menuItems.map((item) => {
            const hasQuery = item.href.includes('?type=');
            const targetType = hasQuery ? new URLSearchParams(item.href.split('?')[1]).get('type') : 'summary';
            
            const isPathMatch = pathname === item.href.split('?')[0];
            const isActive = isPathMatch && (!hasQuery ? (pathname === `/dashboard/${repoId}` || activeType === 'summary') : (activeType === targetType));
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-[0_0_10px_rgba(6,180,212,0.05)]' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Bottom Metadata */}
        <div className="p-6 border-t border-slate-900/80 text-[10px] text-slate-600 space-y-1 font-mono">
          <div>ENVIRONMENT: LOCAL</div>
          <div>PLATFORM: REPOGPT v1.0</div>
          <div>PORT: 3000</div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 h-full overflow-hidden bg-slate-950 flex flex-col relative">
        {/* Glow behind main layout */}
        <div className="absolute top-[-10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-cyan-600/5 blur-[120px] pointer-events-none z-0" />
        
        <div className="flex-1 h-full w-full relative z-10 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
