import React from 'react';
import { Search, Database, FileText, Cpu, Cloud, Sparkles, Layers } from 'lucide-react';

interface NavbarProps {
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  totalDocs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSearch, isSearchOpen, totalDocs = 23 }) => {
  return (
    <header className="sticky top-0 z-30 bg-space-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-2xl">
      {/* Brand & Left Actions */}
      <div className="flex items-center space-x-4">
        {/* Search & Intelligence Trigger Button */}
        <button
          onClick={onToggleSearch}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 group ${
            isSearchOpen
              ? 'bg-gradient-to-r from-red-600 to-adp-red text-white border-red-500/50 shadow-glow-red'
              : 'bg-space-900/90 text-slate-200 border-white/10 hover:bg-space-800 hover:border-white/20 hover:text-white shadow-sm'
          }`}
          title="Toggle Search & Intelligence Panel (⌘K)"
        >
          <Search className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isSearchOpen ? 'text-white' : 'text-red-400'}`} />
          <span>Search & Intelligence</span>
          <kbd className="hidden sm:inline-block ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
            ⌘K
          </kbd>
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-white/10 hidden sm:block" />

        {/* ADP Questa Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 via-adp-red to-adp-dark flex items-center justify-center font-black text-white text-sm shadow-md border border-white/20">
              ADP
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-white text-sm leading-tight tracking-tight">
                Questa Governed Ingestion Studio
              </h1>
              <span className="flex items-center space-x-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Production</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Two-Pass Layout Decomposition · Tri-View Knowledge Units · Zero-Duplication Revisions
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure Telemetry Badges */}
      <div className="hidden xl:flex items-center space-x-2 text-xs">
        {/* Spanner Live Docs */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] text-slate-400">Cloud Spanner:</span>
          <span className="text-emerald-400 font-bold font-mono text-[11px]">{totalDocs} Docs</span>
        </div>

        {/* Document AI */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-slate-400">DocAI Layout:</span>
          <span className="text-amber-300/90 font-mono text-[11px]">v1.6 (Active)</span>
        </div>

        {/* Vertex AI text-embedding */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] text-slate-400">Vertex AI:</span>
          <span className="text-purple-300 font-bold font-mono text-[11px]">768d ScaNN</span>
        </div>

        {/* GCS Bucket */}
        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-space-900/80 border border-white/5 text-slate-300 shadow-sm">
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-slate-400">GCS Bucket:</span>
          <span className="text-cyan-300 font-bold font-mono text-[11px]">Canonical</span>
        </div>
      </div>
    </header>
  );
};
