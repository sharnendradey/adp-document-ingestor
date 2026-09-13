import React from 'react';
import { Search, Database, FileText, Cpu, Cloud, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  totalDocs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSearch, isSearchOpen, totalDocs = 23 }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSearch}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            isSearchOpen
              ? 'bg-adp-red text-white border-adp-red shadow-lg shadow-adp-red/20'
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
          }`}
          title="Toggle Expandable Search & Intelligence Drawer"
        >
          <Search className="w-4 h-4" />
          <span>Search & Intelligence</span>
          <span className="hidden sm:inline-block ml-1 text-xs px-1.5 py-0.5 rounded bg-black/30 text-slate-300">
            ⌘K
          </span>
        </button>

        <div className="flex items-center space-x-3 pl-2 border-l border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-adp-red to-red-700 flex items-center justify-center font-black text-white text-base shadow-md">
            ADP
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-slate-100 text-base leading-tight tracking-tight">
                Questa Governed Ingestion Studio
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Production
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Two-Pass Layout Decomposition · Tri-View Knowledge Units · Zero-Duplication Revisions
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Telemetry Status Badges */}
      <div className="hidden lg:flex items-center space-x-3 text-xs">
        {/* Spanner Status */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">Cloud Spanner:</span>
          <span className="text-emerald-400 font-semibold">{totalDocs} Docs</span>
        </div>

        {/* Document AI */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium">DocAI Layout Parser:</span>
          <span className="text-slate-400 font-mono text-[11px]">v1.6 (Active)</span>
        </div>

        {/* Vertex AI text-embedding-004 */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-medium">Vertex Embeddings:</span>
          <span className="text-purple-400 font-semibold">768d ScaNN</span>
        </div>

        {/* GCS Ingest Bucket */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300">
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">GCS Storage:</span>
          <span className="text-cyan-400 font-semibold">Hierarchical</span>
        </div>
      </div>
    </header>
  );
};
