import React from 'react';
import { Search, Database, FileText, Cpu, Cloud, Sparkles } from 'lucide-react';

interface NavbarProps {
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  totalDocs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSearch, isSearchOpen, totalDocs = 40 }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand & Identity on Left */}
      <div className="flex items-center space-x-3.5">
        <div className="relative group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-adp-red to-adp-dark flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-600/20">
            ADP
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight tracking-tight">
              Questa Governed Ingestion Studio
            </h1>
            <span className="flex items-center space-x-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Production</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden md:block">
            Gemini 3.5 Multimodal · Tri-View Knowledge Units · Cloud Spanner Zero-Parent Embeddings
          </p>
        </div>
      </div>

      {/* Right Side: Cloud Telemetry Badges + Search Trigger */}
      <div className="flex items-center space-x-3 text-xs">
        {/* Spanner Live Docs */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-xs">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] text-slate-500">Cloud Spanner:</span>
          <span className="text-emerald-700 font-bold font-mono text-[11px]">{totalDocs} Docs</span>
        </div>

        {/* Gemini Engine */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[11px] text-slate-500">Multimodal:</span>
          <span className="text-amber-700 font-bold font-mono text-[11px]">Gemini 3.5</span>
        </div>

        {/* Vertex AI */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-xs">
          <Cpu className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-[11px] text-slate-500">Vertex AI:</span>
          <span className="text-purple-700 font-bold font-mono text-[11px]">768d ScaNN</span>
        </div>

        {/* GCS */}
        <div className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 shadow-xs">
          <Cloud className="w-3.5 h-3.5 text-cyan-600" />
          <span className="text-[11px] text-slate-500">GCS:</span>
          <span className="text-cyan-700 font-bold font-mono text-[11px]">Canonical</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Dedicated Search & Intelligence Trigger on the Right */}
        <button
          onClick={onToggleSearch}
          className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-200 group cursor-pointer shadow-xs ${
            isSearchOpen
              ? 'bg-adp-red text-white border-red-600 shadow-md shadow-red-600/20'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-red-400 hover:text-adp-red'
          }`}
          title="Open Search & Intelligence Copilot (⌘K)"
        >
          <Search className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isSearchOpen ? 'text-white' : 'text-adp-crimson'}`} />
          <span className="tracking-tight">Search & Intelligence</span>
          <kbd className={`hidden sm:inline-flex items-center ml-1 text-[10px] font-mono px-2 py-0.5 rounded-md border ${
            isSearchOpen ? 'bg-red-800 text-white border-red-700' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};

