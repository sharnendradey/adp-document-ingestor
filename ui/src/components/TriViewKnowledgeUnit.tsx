import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
  Table as TableIcon, 
  Layers, 
  GitFork, 
  Hash, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Globe, 
  Copy, 
  Check, 
  Search,
  Filter,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { KnowledgeUnit } from '../types/ingestion';

interface TriViewKnowledgeUnitProps {
  units: KnowledgeUnit[];
  documentId: string;
}

export const TriViewKnowledgeUnit: React.FC<TriViewKnowledgeUnitProps> = ({ units, documentId }) => {
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'narrative' | 'qa' | 'tabular'>>({});
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const getActiveTab = (chunkId: string) => activeTabMap[chunkId] || 'narrative';

  const setChunkTab = (chunkId: string, tab: 'narrative' | 'qa' | 'tabular') => {
    setActiveTabMap((prev) => ({ ...prev, [chunkId]: tab }));
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Collect unique roles across all chunks
  const allRoles = Array.from(
    new Set(units.flatMap((u) => u.audience_roles || []))
  );

  // Filtered units
  const filteredUnits = units.filter((u) => {
    const matchesRole = filterRole === 'ALL' || (u.audience_roles && u.audience_roles.includes(filterRole));
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      u.chunk_text.toLowerCase().includes(term) ||
      u.chunk_id.toLowerCase().includes(term) ||
      (u.generated_qa_pairs && u.generated_qa_pairs.some((qa) => qa.question.toLowerCase().includes(term))) ||
      (u.tabular_representation && JSON.stringify(u.tabular_representation).toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Header with Title and Filtering Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Tri-View Knowledge Unit Inspector
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
              {units.length} Chunks
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cloud Spanner Child Table · Narrative, Conversational Q&A, and Agentic Tabular representations
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Search within chunks */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in chunks..."
              className="bg-space-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-adp-red w-48 shadow-inner transition-all"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 bg-space-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 shadow-inner">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-space-950">All Roles ({units.length})</option>
              {allRoles.map((r) => (
                <option key={r} value={r} className="bg-space-950">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Units List */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-xs italic bg-space-950/40 rounded-xl border border-white/5">
          No knowledge units match the active filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUnits.map((unit) => {
            const activeTab = getActiveTab(unit.chunk_id);
            const isQuarantined = unit.status === 'QUARANTINED';
            const boundDocs = unit.bound_document_ids || [unit.document_id];
            const isMultiBound = boundDocs.length > 1;

            return (
              <div
                key={unit.chunk_id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  isQuarantined
                    ? 'bg-red-950/10 border-red-500/40'
                    : 'bg-space-950/70 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Chunk Header */}
                <div className="bg-space-950 px-4 py-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className="font-mono text-xs font-bold text-white px-2.5 py-0.5 rounded-lg bg-space-900 border border-white/10 shadow-inner">
                      Chunk #{unit.chunk_index}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center space-x-1 border ${
                        isQuarantined
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isQuarantined ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      <span>{unit.status}</span>
                    </span>

                    {/* Version Binding Badge */}
                    <div
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg flex items-center space-x-1.5 border ${
                        isMultiBound
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-glow-purple'
                          : 'bg-space-900 text-slate-400 border-white/10'
                      }`}
                      title={isMultiBound ? 'Bound across multiple revision versions!' : 'Primary revision binding'}
                    >
                      <GitFork className="w-3 h-3 text-purple-400" />
                      <span>
                        Bound: [{boundDocs.map((id) => id.split('-').pop()).join(', ')}]
                      </span>
                    </div>

                    {/* Extraction Confidence */}
                    {unit.extraction_confidence !== undefined && (
                      <span className="text-[10px] font-mono font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        Conf: {(unit.extraction_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Right Header: SHA256 & Geo */}
                  <div className="flex items-center space-x-2.5 text-[11px] text-slate-400">
                    <button
                      onClick={() => copyHash(unit.sha256_hash)}
                      className="flex items-center space-x-1.5 font-mono text-[10px] px-2.5 py-1 rounded-lg bg-space-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors"
                      title="Copy Chunk SHA-256 Hash"
                    >
                      <Hash className="w-3 h-3 text-amber-400" />
                      <span>{unit.sha256_hash.slice(0, 8)}...</span>
                      {copiedHash === unit.sha256_hash ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {unit.geographic_scope && unit.geographic_scope.length > 0 && (
                      <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        <span>{unit.geographic_scope.join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Subheader: Roles & Stance */}
                <div className="px-4 py-2 bg-space-900/50 border-b border-white/5 flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Entitled Roles:</span>
                    {(unit.audience_roles || []).map((r) => (
                      <span
                        key={r}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        {r}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    {unit.expression_stance && (
                      <span>
                        Stance: <strong className="text-slate-200">{unit.expression_stance}</strong>
                      </span>
                    )}
                    {unit.effective_date && (
                      <span>
                        Effective: <strong className="font-mono text-slate-200">{unit.effective_date}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tri-View Navigation Tabs */}
                <div className="px-4 pt-3 flex items-center space-x-2 border-b border-white/5">
                  <button
                    onClick={() => setChunkTab(unit.chunk_id, 'narrative')}
                    className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'narrative'
                        ? 'border-adp-red text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View 1: Narrative Layout</span>
                  </button>

                  <button
                    onClick={() => setChunkTab(unit.chunk_id, 'qa')}
                    className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'qa'
                        ? 'border-adp-red text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>View 2: Conversational Q&A ({unit.generated_qa_pairs?.length || 0})</span>
                  </button>

                  <button
                    onClick={() => setChunkTab(unit.chunk_id, 'tabular')}
                    className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'tabular'
                        ? 'border-adp-red text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>View 3: Agentic Tabular ({Object.keys(unit.tabular_representation || {}).length} keys)</span>
                  </button>
                </div>

                {/* Tab Content Panes */}
                <div className="p-4">
                  {/* TAB 1: NARRATIVE VIEW */}
                  {activeTab === 'narrative' && (
                    <div className="space-y-3">
                      <div className="bg-space-950/80 p-4 rounded-xl border border-white/5 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text shadow-inner">
                        {unit.chunk_text}
                      </div>
                      {unit.citation && (
                        <div className="text-[11px] text-slate-400 font-mono bg-space-950/60 px-3 py-2 rounded-lg border border-white/5 flex items-center space-x-2">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Citation Anchor: <strong className="text-slate-300">{unit.citation}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CONVERSATIONAL Q&A VIEW */}
                  {activeTab === 'qa' && (
                    <div className="space-y-2.5">
                      {(!unit.generated_qa_pairs || unit.generated_qa_pairs.length === 0) ? (
                        <div className="text-slate-500 text-xs italic py-3 text-center bg-space-950/40 rounded-xl">
                          No synthetic conversational Q&A pairs generated for this unit.
                        </div>
                      ) : (
                        unit.generated_qa_pairs.map((qa, qIdx) => (
                          <div
                            key={qIdx}
                            className="bg-space-950/90 p-3.5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-start space-x-2.5">
                              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                Q{qIdx + 1}
                              </span>
                              <span className="text-xs text-slate-200 font-semibold">{qa.question}</span>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-space-900 text-slate-400 font-mono border border-white/5">
                                {qa.intent}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                {qa.target_persona}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: AGENTIC TABULAR VIEW */}
                  {activeTab === 'tabular' && (
                    <div>
                      {(!unit.tabular_representation || Object.keys(unit.tabular_representation).length === 0) ? (
                        <div className="text-slate-500 text-xs italic py-3 text-center bg-space-950/40 rounded-xl">
                          No structured key-value attributes extracted.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-space-950/90 shadow-inner">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-space-900 border-b border-white/10 text-slate-400">
                                <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px] w-1/3">Extracted Attribute / Key</th>
                                <th className="py-2.5 px-4 font-bold uppercase tracking-wider text-[10px] w-2/3">Structured Representation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono">
                              {Object.entries(unit.tabular_representation).map(([key, val]) => (
                                <tr key={key} className="hover:bg-white/[0.02]">
                                  <td className="py-2.5 px-4 text-cyan-300 font-semibold break-all">{key}</td>
                                  <td className="py-2.5 px-4 text-slate-200 break-all font-sans text-xs">
                                    {typeof val === 'object' ? JSON.stringify(val, null, 1) : String(val)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
