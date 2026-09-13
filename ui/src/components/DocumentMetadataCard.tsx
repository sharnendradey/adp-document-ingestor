import React, { useState } from 'react';
import { FileText, Cloud, Check, Copy, Sparkles, Hash, Layers, UserCheck, Tag, ShieldCheck, Database } from 'lucide-react';
import { ParentDocument } from '../types/ingestion';

interface DocumentMetadataCardProps {
  document: ParentDocument;
  metrics?: {
    total_blocks_parsed?: number;
    deduplicated_count?: number;
    promoted_count?: number;
    quarantined_count?: number;
    duration_seconds?: number;
  };
}

export const DocumentMetadataCard: React.FC<DocumentMetadataCardProps> = ({ document, metrics }) => {
  const [copiedGcs, setCopiedGcs] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const copyToClipboard = (text: string, type: 'gcs' | 'hash') => {
    navigator.clipboard.writeText(text);
    if (type === 'gcs') {
      setCopiedGcs(true);
      setTimeout(() => setCopiedGcs(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 text-adp-crimson shrink-0 mt-0.5 shadow-glow-red">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {document.document_title || document.document_id}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-space-950 text-slate-300 border border-white/10 shadow-inner">
                {document.document_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed max-w-3xl">
              {document.document_summary || 'No macro summary available.'}
            </p>
          </div>
        </div>

        {/* Two-Table Compliance Badge */}
        <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs shadow-glow-emerald">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">Parent Table: Zero Vector Embeddings</span>
          </div>
        </div>
      </div>

      {/* Primary Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-space-950/70 p-3.5 rounded-xl border border-white/5 shadow-inner">
          <span className="text-slate-500 block text-[10px] mb-1 uppercase tracking-wider font-bold">
            Canonical DSRF Domain
          </span>
          <span className="font-bold text-blue-400 text-xs truncate block">
            {document.canonical_dsrf_domain || 'PAYROLL_TAXATION'}
          </span>
        </div>

        <div className="bg-space-950/70 p-3.5 rounded-xl border border-white/5 shadow-inner">
          <span className="text-slate-500 block text-[10px] mb-1 uppercase tracking-wider font-bold">
            Business Unit
          </span>
          <span className="font-bold text-cyan-400 text-xs truncate block">
            {document.business_unit || 'MAJOR_ACCOUNTS'}
          </span>
        </div>

        <div className="bg-space-950/70 p-3.5 rounded-xl border border-white/5 shadow-inner">
          <span className="text-slate-500 block text-[10px] mb-1 uppercase tracking-wider font-bold">
            Product Family / Module
          </span>
          <span className="font-bold text-purple-400 text-xs truncate block">
            {document.product_module || 'VANTAGE'}
          </span>
        </div>

        <div className="bg-space-950/70 p-3.5 rounded-xl border border-white/5 shadow-inner">
          <span className="text-slate-500 block text-[10px] mb-1 uppercase tracking-wider font-bold">
            Content Steward
          </span>
          <span className="font-bold text-slate-300 text-xs truncate flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
            <span className="truncate">{document.content_owner_steward || 'COMPLIANCE_OFFICE'}</span>
          </span>
        </div>
      </div>

      {/* Storage and Canonical Fingerprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
        {/* GCS Archive URI */}
        <div className="bg-space-950/80 p-3.5 rounded-xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2.5 truncate mr-2">
            <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Canonical GCS Storage</span>
              <span className="font-mono text-[11px] text-cyan-300 truncate block">
                {document.gcs_uri || 'gs://adp-questa-document-ingest-poc/documents/...'}
              </span>
            </div>
          </div>
          {document.gcs_uri && (
            <button
              onClick={() => copyToClipboard(document.gcs_uri!, 'gcs')}
              className="p-1.5 text-slate-400 hover:text-white bg-space-900 rounded-lg border border-white/10 hover:border-white/20 shrink-0 transition-colors"
              title="Copy GCS Path"
            >
              {copiedGcs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* SHA-256 Fingerprint */}
        <div className="bg-space-950/80 p-3.5 rounded-xl border border-white/5 flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2.5 truncate mr-2">
            <Hash className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Raw Content SHA-256</span>
              <span className="font-mono text-[11px] text-amber-300/90 truncate block">
                {document.raw_content_sha256 || 'None'}
              </span>
            </div>
          </div>
          {document.raw_content_sha256 && (
            <button
              onClick={() => copyToClipboard(document.raw_content_sha256!, 'hash')}
              className="p-1.5 text-slate-400 hover:text-white bg-space-900 rounded-lg border border-white/10 hover:border-white/20 shrink-0 transition-colors"
              title="Copy Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Execution Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-space-950/60 p-3.5 rounded-xl border border-white/5 text-xs shadow-inner">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Blocks Parsed</span>
            <span className="font-mono font-bold text-white text-sm">{metrics.total_blocks_parsed ?? '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Dedup Reused</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">{metrics.deduplicated_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Promoted Chunks</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{metrics.promoted_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Quarantined</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{metrics.quarantined_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-bold tracking-wider">Duration</span>
            <span className="font-mono font-bold text-purple-400 text-sm">
              {metrics.duration_seconds ? `${metrics.duration_seconds.toFixed(2)}s` : '-'}
            </span>
          </div>
        </div>
      )}

      {/* Table of Contents & Search Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
        {/* Table of Contents */}
        <div className="space-y-2">
          <span className="text-slate-300 text-xs font-bold flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Table of Contents:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {(document.table_of_contents && document.table_of_contents.length > 0) ? (
              document.table_of_contents.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-space-950 text-slate-300 text-[11px] border border-white/5 font-medium"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">No section headings detected.</span>
            )}
          </div>
        </div>

        {/* Search Keywords */}
        <div className="space-y-2">
          <span className="text-slate-300 text-xs font-bold flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            <span>Search Keywords & Intent Triggers:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {(document.search_keywords && document.search_keywords.length > 0) ? (
              document.search_keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-[11px] border border-purple-500/20 font-medium"
                >
                  {kw}
                </span>
              ))
            ) : (
              <span className="text-slate-500 text-xs italic">No keywords generated.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
