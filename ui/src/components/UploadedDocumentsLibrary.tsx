import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Database, 
  Layers, 
  Cloud, 
  Hash, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight, 
  LayoutGrid, 
  List, 
  Tag, 
  Calendar,
  Search,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { ParentDocument } from '../types/ingestion';

interface UploadedDocumentsLibraryProps {
  documents: ParentDocument[];
  selectedDocId: string;
  onSelectDocument: (docId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  onOpenSearch?: () => void;
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TALENT_AND_HR: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  PAYROLL: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  PAYROLL_TAXATION: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  TAX_COMPLIANCE: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
  BENEFITS: { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  TIME_AND_ATTENDANCE: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  POLICY_AND_COMPLIANCE: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' },
};

export const UploadedDocumentsLibrary: React.FC<UploadedDocumentsLibraryProps> = ({
  documents,
  selectedDocId,
  onSelectDocument,
  onRefresh,
  isLoading = false,
  onOpenSearch,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedBu, setSelectedBu] = useState<string>('ALL');
  const [filterText, setFilterText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGcs, setCopiedGcs] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: 'id' | 'gcs') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedGcs(text);
      setTimeout(() => setCopiedGcs(null), 2000);
    }
  };

  // Collect unique domains and BUs
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.canonical_dsrf_domain) set.add(d.canonical_dsrf_domain);
    });
    return Array.from(set);
  }, [documents]);

  const availableBus = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.business_unit) set.add(d.business_unit);
    });
    return Array.from(set);
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchDomain = selectedDomain === 'ALL' || doc.canonical_dsrf_domain === selectedDomain;
      const matchBu = selectedBu === 'ALL' || doc.business_unit === selectedBu;
      const term = filterText.toLowerCase().trim();
      const matchText =
        !term ||
        (doc.document_title && doc.document_title.toLowerCase().includes(term)) ||
        doc.document_id.toLowerCase().includes(term) ||
        (doc.document_summary && doc.document_summary.toLowerCase().includes(term)) ||
        (doc.search_keywords && doc.search_keywords.some((k) => k.toLowerCase().includes(term))) ||
        (doc.content_owner_steward && doc.content_owner_steward.toLowerCase().includes(term));
      return matchDomain && matchBu && matchText;
    });
  }, [documents, selectedDomain, selectedBu, filterText]);

  return (
    <div className="space-y-5">
      {/* Catalog Header */}
      <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                Uploaded Documents Library (Cloud Spanner Catalog)
              </h2>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                {documents.length} Indexed Documents
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Live parent catalog persisted to Google Cloud Spanner table <code className="text-slate-300 font-mono">knowledge_documents</code> with 
              structured GCS archival paths and zero parent vector embeddings. Select any document to inspect its full macro metadata, runtime entitlements, and FAQ questions per chunk.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5 shrink-0 self-start md:self-auto">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-space-950/80 hover:bg-space-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-inner cursor-pointer"
                title="Search knowledge base via Agent Search Drawer"
              >
                <Search className="w-3.5 h-3.5 text-red-400" />
                <span>Agent Search (⌘K)</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-space-950/80 hover:bg-space-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-inner disabled:opacity-50 cursor-pointer"
              title="Refresh catalog from Cloud Spanner"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter and View Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Domain Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              onClick={() => setSelectedDomain('ALL')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs shrink-0 cursor-pointer ${
                selectedDomain === 'ALL'
                  ? 'bg-adp-red text-white shadow-md shadow-red-500/20'
                  : 'bg-space-950/70 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10'
              }`}
            >
              All Domains ({documents.length})
            </button>
            {availableDomains.map((domain) => {
              const count = documents.filter((d) => d.canonical_dsrf_domain === domain).length;
              const color = DOMAIN_COLORS[domain] || { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30' };
              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs shrink-0 border cursor-pointer ${
                    selectedDomain === domain
                      ? `${color.bg} ${color.text} ${color.border} shadow-md`
                      : 'bg-space-950/70 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/10'
                  }`}
                >
                  {domain.replace(/_/g, ' ')} ({count})
                </button>
              );
            })}
          </div>

          {/* Right Controls: Filter Input, BU Selector, View Switcher */}
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
            {/* Filter Input */}
            <div className="relative">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter catalog list..."
                className="bg-space-950/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-adp-red w-44 shadow-inner transition-all"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2.5 top-2 text-[10px] text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Business Unit Selector */}
            {availableBus.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-space-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 shadow-inner">
                <Filter className="w-3 h-3 text-slate-500" />
                <select
                  value={selectedBu}
                  onChange={(e) => setSelectedBu(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-space-950">All BUs</option>
                  {availableBus.map((bu) => (
                    <option key={bu} value={bu} className="bg-space-950">
                      {bu.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-space-950/80 border border-white/10 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-space-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-space-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Table List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Display: Grid or Table */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16 bg-space-900/40 rounded-2xl border border-white/5 space-y-3">
          <FileText className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-400">No documents match filter criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your domain or business unit filters, or ingest a new document via the Ingestion Pipeline.
          </p>
          <button
            onClick={() => {
              setSelectedDomain('ALL');
              setSelectedBu('ALL');
              setFilterText('');
            }}
            className="px-4 py-2 rounded-xl bg-space-950 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocId === doc.document_id;
            const domainStyle = DOMAIN_COLORS[doc.canonical_dsrf_domain || ''] || {
              bg: 'bg-slate-500/10',
              text: 'text-slate-300',
              border: 'border-slate-500/30',
            };

            return (
              <div
                key={doc.document_id}
                className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-xl ${
                  isSelected
                    ? 'bg-gradient-to-b from-red-950/30 via-space-900/90 to-space-950 border-red-500/50 ring-1 ring-red-500/40 shadow-glow-red'
                    : 'bg-space-900/70 hover:bg-space-900 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${domainStyle.bg} ${domainStyle.text} ${domainStyle.border}`}
                    >
                      {doc.canonical_dsrf_domain || 'DSRF CORP'}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {doc.chunk_count !== undefined ? `${doc.chunk_count} Units` : 'Chunks'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Document ID */}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-slate-100 transition-colors line-clamp-2 leading-snug">
                      {doc.document_title || doc.document_id}
                    </h3>
                    <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-slate-400">
                      <span className="font-mono text-[10px] text-slate-500 truncate">{doc.document_id}</span>
                      <button
                        onClick={() => copyToClipboard(doc.document_id, 'id')}
                        className="text-slate-500 hover:text-slate-300 cursor-pointer"
                        title="Copy Document ID"
                      >
                        {copiedId === doc.document_id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {doc.document_summary && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {doc.document_summary}
                    </p>
                  )}

                  {/* Table of Contents Preview */}
                  {doc.table_of_contents && doc.table_of_contents.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.table_of_contents.slice(0, 3).map((toc, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-2 py-0.5 rounded bg-space-950/80 text-slate-400 border border-white/5 truncate max-w-[160px]"
                          title={toc}
                        >
                          {toc}
                        </span>
                      ))}
                      {doc.table_of_contents.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-space-950/80 text-slate-500 border border-white/5">
                          +{doc.table_of_contents.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata Row: BU, Module, Steward */}
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">BU / Module</span>
                      <span className="font-semibold text-slate-300 truncate block">
                        {doc.business_unit || 'MAJOR_ACCOUNTS'} · {doc.product_module || 'GENERAL'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Content Steward</span>
                      <span className="font-semibold text-slate-300 truncate block">
                        {doc.content_owner_steward || 'COMPLIANCE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Zero Embeddings</span>
                  </div>

                  <button
                    onClick={() => onSelectDocument(doc.document_id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-adp-red text-white shadow-md shadow-red-500/30'
                        : 'bg-space-950 hover:bg-space-800 text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{isSelected ? 'Currently Selected' : 'Inspect Document'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-space-950/90 border-b border-white/10 text-slate-400">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Document Title & Catalog ID</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Canonical DSRF Domain</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">BU / Product</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Units</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Content Steward</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Parent Compliance</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDocId === doc.document_id;
                  const domainStyle = DOMAIN_COLORS[doc.canonical_dsrf_domain || ''] || {
                    bg: 'bg-slate-500/10',
                    text: 'text-slate-300',
                    border: 'border-slate-500/30',
                  };

                  return (
                    <tr
                      key={doc.document_id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? 'bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white leading-snug line-clamp-1">
                          {doc.document_title || doc.document_id}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {doc.document_id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${domainStyle.bg} ${domainStyle.text} ${domainStyle.border}`}
                        >
                          {doc.canonical_dsrf_domain || 'DSRF CORP'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {doc.business_unit || 'MAJOR_ACCOUNTS'} · {doc.product_module || 'GENERAL'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                          {doc.chunk_count !== undefined ? doc.chunk_count : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {doc.content_owner_steward || 'COMPLIANCE'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Zero Vector Embeddings</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectDocument(doc.document_id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-adp-red text-white shadow-md shadow-red-500/30'
                              : 'bg-space-950 hover:bg-space-800 text-slate-300 hover:text-white border border-white/10 hover:border-white/20'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
