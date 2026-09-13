import React, { useState } from 'react';
import { FileText, Cloud, Check, Copy, Sparkles, Hash, Layers, UserCheck, Tag } from 'lucide-react';
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/20 text-adp-red shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                {document.document_title || document.document_id}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {document.document_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {document.document_summary || 'No macro summary available.'}
            </p>
          </div>
        </div>

        {/* Two-Table Compliance Badge */}
        <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-semibold">Parent Table: Zero Vector Embeddings</span>
          </div>
        </div>
      </div>

      {/* Primary Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[11px] mb-1 uppercase tracking-wider font-semibold">
            DSRF Domain
          </span>
          <span className="font-semibold text-blue-400 flex items-center space-x-1">
            <span>{document.canonical_dsrf_domain || 'PAYROLL_TAXATION'}</span>
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[11px] mb-1 uppercase tracking-wider font-semibold">
            Business Unit
          </span>
          <span className="font-semibold text-cyan-400">
            {document.business_unit || 'MAJOR_ACCOUNTS'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[11px] mb-1 uppercase tracking-wider font-semibold">
            Product Family / Module
          </span>
          <span className="font-semibold text-purple-400">
            {document.product_module || 'VANTAGE'}
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[11px] mb-1 uppercase tracking-wider font-semibold">
            Content Steward
          </span>
          <span className="font-semibold text-slate-300 flex items-center space-x-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
            <span className="truncate">{document.content_owner_steward || 'COMPLIANCE_OFFICE'}</span>
          </span>
        </div>
      </div>

      {/* Storage and Canonical Fingerprint */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* GCS Archive URI */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate mr-2">
            <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Canonical GCS Storage</span>
              <span className="font-mono text-[11px] text-cyan-300 truncate block">
                {document.gcs_uri || 'gs://adp-questa-document-ingest-poc/documents/...'}
              </span>
            </div>
          </div>
          {document.gcs_uri && (
            <button
              onClick={() => copyToClipboard(document.gcs_uri!, 'gcs')}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 rounded border border-slate-800 hover:border-slate-700 shrink-0"
              title="Copy GCS Path"
            >
              {copiedGcs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* SHA-256 Fingerprint */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate mr-2">
            <Hash className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Raw Content SHA-256</span>
              <span className="font-mono text-[11px] text-amber-300/90 truncate block">
                {document.raw_content_sha256 || 'None'}
              </span>
            </div>
          </div>
          {document.raw_content_sha256 && (
            <button
              onClick={() => copyToClipboard(document.raw_content_sha256!, 'hash')}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 rounded border border-slate-800 hover:border-slate-700 shrink-0"
              title="Copy Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Execution Performance Metrics (If available) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-semibold">Blocks Parsed</span>
            <span className="font-mono font-bold text-slate-200">{metrics.total_blocks_parsed ?? '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-semibold">Dedup Reused</span>
            <span className="font-mono font-bold text-cyan-400">{metrics.deduplicated_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-semibold">Promoted Chunks</span>
            <span className="font-mono font-bold text-emerald-400">{metrics.promoted_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-semibold">Quarantined</span>
            <span className="font-mono font-bold text-amber-400">{metrics.quarantined_count ?? 0}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-semibold">Latency</span>
            <span className="font-mono font-bold text-purple-400">
              {metrics.duration_seconds ? `${metrics.duration_seconds.toFixed(2)}s` : '-'}
            </span>
          </div>
        </div>
      )}

      {/* Table of Contents & Search Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
        {/* Table of Contents */}
        <div>
          <span className="text-slate-400 text-xs font-semibold flex items-center space-x-1.5 mb-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Document Table of Contents:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {(document.table_of_contents && document.table_of_contents.length > 0) ? (
              document.table_of_contents.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[11px] border border-slate-700/60"
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
        <div>
          <span className="text-slate-400 text-xs font-semibold flex items-center space-x-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Search Keywords & Intent Triggers:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {(document.search_keywords && document.search_keywords.length > 0) ? (
              document.search_keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-blue-950/30 text-blue-300 text-[11px] border border-blue-800/40"
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
