import React from 'react';
import { Search, Database, FileText, Cpu, Cloud } from 'lucide-react';

interface NavbarProps {
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  totalDocs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSearch, isSearchOpen, totalDocs = 23 }) => {
  return (
    <header className="sticky top-0 z-30 bg-space-950/85 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-3.5 flex items-center justify-between shadow-2xl">
      {/* Brand & Identity on Left */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-adp-red to-adp-dark flex items-center justify-center font-black text-white text-sm shadow-md border border-white/20">
            ADP
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="font-extrabold text-white text-sm md:text-base leading-tight tracking-tight">
              Questa Governed Ingestion Studio
            </h1>
            <span className="flex items-center space-x-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Production</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden md:block">
            Two-Pass Layout Decomposition · Tri-View Knowledge Units · Zero-Duplication Revisions
          </p>
        </div>
      </div>

      {/* Right Side: Cloud Telemetry Badges + THE SINGLE Search Trigger */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Spanner Live Docs */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] text-slate-400">Cloud Spanner:</span>
          <span className="text-emerald-400 font-bold font-mono text-[11px]">{totalDocs} Docs</span>
        </div>

        {/* Document AI */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-slate-400">DocAI Layout:</span>
          <span className="text-amber-300/90 font-mono text-[11px]">v1.6 (Active)</span>
        </div>

        {/* Vertex AI */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] text-slate-400">Vertex AI:</span>
          <span className="text-purple-300 font-bold font-mono text-[11px]">768d ScaNN</span>
        </div>

        {/* GCS */}
        <div className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-400">GCS Bucket:</span>
          <span className="text-cyan-300 font-bold font-mono text-[11px]">Canonical</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-white/10 hidden sm:block" />

        {/* The ONLY Dedicated Search & Intelligence Trigger on the Right */}
        <button
          onClick={onToggleSearch}
          className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-200 group cursor-pointer shadow-lg ${
            isSearchOpen
              ? 'bg-gradient-to-r from-red-600 to-adp-red text-white border-red-500/60 shadow-glow-red scale-[1.02]'
              : 'bg-gradient-to-r from-red-600/20 via-space-900/90 to-space-900 text-white border-red-500/40 hover:border-red-500 hover:shadow-glow-red hover:bg-space-850'
          }`}
          title="Open Search & Intelligence Copilot (⌘K)"
        >
          <Search className={`w-3.5 h-3.5 transition-transform group-hover:scale-115 ${isSearchOpen ? 'text-white' : 'text-adp-crimson'}`} />
          <span className="tracking-tight">Search & Intelligence</span>
          <kbd className="hidden sm:inline-flex items-center ml-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/50 text-slate-200 border border-white/15 shadow-inner">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};
