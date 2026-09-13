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
}

const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TALENT_AND_HR: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PAYROLL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PAYROLL_TAXATION: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  TAX_COMPLIANCE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  BENEFITS: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  TIME_AND_ATTENDANCE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  POLICY_AND_COMPLIANCE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export const UploadedDocumentsLibrary: React.FC<UploadedDocumentsLibraryProps> = ({
  documents,
  selectedDocId,
  onSelectDocument,
  onRefresh,
  isLoading = false,
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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
                <Database className="w-4 h-4" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                Uploaded Documents Library (Cloud Spanner Catalog)
              </h2>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {documents.length} Indexed Documents
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Live parent catalog persisted to Google Cloud Spanner table <code className="text-slate-800 bg-slate-100 font-mono px-1.5 py-0.5 rounded border border-slate-200">knowledge_documents</code> with 
              structured GCS archival paths and zero parent vector embeddings. Select any document to inspect its full macro metadata, runtime entitlements, and FAQ questions per chunk.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5 shrink-0 self-start md:self-auto">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Refresh catalog from Cloud Spanner"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
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
                  ? 'bg-adp-red text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              All Domains ({documents.length})
            </button>
            {availableDomains.map((domain) => {
              const count = documents.filter((d) => d.canonical_dsrf_domain === domain).length;
              const color = DOMAIN_COLORS[domain] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
              return (
                <button
                  key={domain}
                  onClick={() => setSelectedDomain(domain)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all text-xs shrink-0 border cursor-pointer ${
                    selectedDomain === domain
                      ? `${color.bg} ${color.text} ${color.border} shadow-xs font-bold`
                      : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200'
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
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red w-44 shadow-xs transition-all"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Business Unit Selector */}
            {availableBus.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedBu}
                  onChange={(e) => setSelectedBu(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All BUs</option>
                  {availableBus.map((bu) => (
                    <option key={bu} value={bu}>
                      {bu.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
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
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No documents match filter criteria</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your domain or business unit filters, or ingest a new document via the Ingestion Pipeline.
          </p>
          <button
            onClick={() => {
              setSelectedDomain('ALL');
              setSelectedBu('ALL');
              setFilterText('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* WIDESCREEN LANDSCAPE GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-5 gap-5">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocId === doc.document_id;
            const domainStyle = DOMAIN_COLORS[doc.canonical_dsrf_domain || ''] || {
              bg: 'bg-slate-50',
              text: 'text-slate-700',
              border: 'border-slate-200',
            };

            return (
              <div
                key={doc.document_id}
                className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-xs ${
                  isSelected
                    ? 'bg-red-50/30 border-adp-red ring-1 ring-red-300 shadow-md shadow-red-500/10'
                    : 'bg-white hover:border-slate-300 border-slate-200 hover:shadow-sm'
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
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {doc.chunk_count !== undefined ? `${doc.chunk_count} Units` : 'Chunks'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Document ID */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-adp-red transition-colors line-clamp-2 leading-snug">
                      {doc.document_title || doc.document_id}
                    </h3>
                    <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-slate-500">
                      <span className="font-mono text-[10px] text-slate-500 truncate">{doc.document_id}</span>
                      <button
                        onClick={() => copyToClipboard(doc.document_id, 'id')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy Document ID"
                      >
                        {copiedId === doc.document_id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {doc.document_summary && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {doc.document_summary}
                    </p>
                  )}

                  {/* Table of Contents Preview */}
                  {doc.table_of_contents && doc.table_of_contents.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.table_of_contents.slice(0, 3).map((toc, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[160px]"
                          title={toc}
                        >
                          {toc}
                        </span>
                      ))}
                      {doc.table_of_contents.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          +{doc.table_of_contents.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata Row: BU, Module, Steward */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">BU / Module</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {doc.business_unit || 'MAJOR_ACCOUNTS'} · {doc.product_module || 'GENERAL'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Content Steward</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {doc.content_owner_steward || 'COMPLIANCE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Zero Embeddings</span>
                  </div>

                  <button
                    onClick={() => onSelectDocument(doc.document_id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-adp-red text-white shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Document Title & Catalog ID</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Canonical DSRF Domain</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">BU / Product</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Units</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Content Steward</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Parent Compliance</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDocId === doc.document_id;
                  const domainStyle = DOMAIN_COLORS[doc.canonical_dsrf_domain || ''] || {
                    bg: 'bg-slate-50',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  };

                  return (
                    <tr
                      key={doc.document_id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-snug line-clamp-1">
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
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {doc.business_unit || 'MAJOR_ACCOUNTS'} · {doc.product_module || 'GENERAL'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {doc.chunk_count !== undefined ? doc.chunk_count : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {doc.content_owner_steward || 'COMPLIANCE'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center space-x-1 text-[10px] text-emerald-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Zero Vector Embeddings</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectDocument(doc.document_id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-adp-red text-white shadow-xs'
                              : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
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
