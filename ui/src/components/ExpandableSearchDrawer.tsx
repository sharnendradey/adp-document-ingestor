import React, { useState } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserCheck, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Clock, 
  AlertTriangle,
  GitFork,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { SearchResult, UserRole } from '../types/search';
import { executeEntitledQuery } from '../api/searchApi';

interface ExpandableSearchDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
}

const DEFAULT_ROLES: UserRole[] = [
  { id: 'EMPLOYEE', label: 'Employee', description: 'Self-service queries' },
  { id: 'HR_PRACTITIONER', label: 'HR Practitioner', description: 'Operational HR & benefits' },
  { id: 'CLIENT_ADMIN', label: 'Client Admin', description: 'Enterprise configurations' },
];

const SUGGESTED_QUERIES = [
  'What is the daily maximum meal reimbursement policy?',
  'How do I configure direct deposit batch processing?',
  'What are the bereavement leave guidelines for family members?',
  'What is the standard mileage reimbursement rate?'
];

export const ExpandableSearchDrawer: React.FC<ExpandableSearchDrawerProps> = ({
  isOpen,
  onToggle,
}) => {
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('HR_PRACTITIONER');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q) return;

    if (queryText) setQuery(queryText);
    setIsLoading(true);
    setError(null);

    try {
      const res = await executeEntitledQuery({
        query: q,
        user_role: selectedRole,
        business_unit: 'MAJOR_ACCOUNTS',
        top_k: 5,
      });
      setResult(res);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-50 bg-slate-900/98 backdrop-blur-xl border-r border-slate-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-[480px] translate-x-0' : 'w-0 -translate-x-full'
      }`}
    >
      {/* Drawer Toggle Tab (Visible when open) */}
      <button
        onClick={onToggle}
        className="absolute -right-9 top-20 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-l-0 border-slate-700 rounded-r-lg p-2 shadow-lg transition-colors"
        title="Toggle Search Drawer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-adp-red/10 border border-adp-red/30 text-adp-red">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              Entitled Search & Intelligence
            </h2>
            <p className="text-[11px] text-slate-400">
              ScaNN Pre-filtered Retrieval & Sebastian Synthesizer
            </p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Persona Switcher */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5 text-adp-red" />
            <span>Simulated Runtime Role (RBAC):</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {DEFAULT_ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-all text-center ${
                  selectedRole === role.id
                    ? 'bg-adp-red text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Bar */}
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything from ingested documents..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-adp-red hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>

          {/* Quick Query Chips */}
          <div className="mt-2.5">
            <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">
              Suggested Test Queries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUERIES.map((sq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(sq)}
                  className="text-left text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Search Results */}
        {result && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* Search Telemetry Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              <span className="flex items-center space-x-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Latency: {result.latency_ms}ms</span>
              </span>
              <span className="font-mono text-emerald-400">
                {result.total_chunks_retrieved} Chunks Matched
              </span>
            </div>

            {/* Circuit Breaker Escalation Alert (if triggered) */}
            {result.circuit_breaker.escalated && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs space-y-1">
                <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Frontline Associate Escalation</span>
                </div>
                <p className="text-[11px] text-amber-200/90">
                  {result.circuit_breaker.reason || 'Query escalated to Frontline Associate.'}
                </p>
                <div className="text-[10px] font-mono text-amber-400">
                  Routing: {result.circuit_breaker.escalation_target}
                </div>
              </div>
            )}

            {/* Intent Understanding Breakdown Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Gemini 3.1 Intent Breakdown</span>
                </div>
                <span className="font-mono text-[11px] text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                  {(result.intent.confidence * 100).toFixed(0)}% Conf
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block uppercase font-semibold text-[10px]">Primary Intent</span>
                  <span className="text-slate-200 font-medium">{result.intent.primary_intent}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase font-semibold text-[10px]">Product / BU</span>
                  <span className="text-slate-200 font-medium">
                    {result.intent.target_product} · {result.intent.target_business_unit}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 block uppercase font-semibold text-[10px] mb-1">
                  Required Roles Check
                </span>
                <div className="flex flex-wrap gap-1">
                  {result.intent.required_roles.map((r) => (
                    <span
                      key={r}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-800 font-mono"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sebastian Grounded Answer Card */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Sebastian Grounded Answer
                  </h3>
                </div>

                {/* Confidence Pill */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    result.response.confidence_rating === 'HIGH'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : result.response.confidence_rating === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  {result.response.confidence_rating} ({result.response.confidence_display})
                </span>
              </div>

              {/* Answer Prose */}
              <div className="text-xs text-slate-200 leading-relaxed font-sans select-text whitespace-pre-wrap">
                {result.response.answer}
              </div>

              {/* Citation */}
              {result.response.citation && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center space-x-1.5 font-mono">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Citation: {result.response.citation}</span>
                </div>
              )}
            </div>

            {/* Contributing Chunks Section */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Contributing Knowledge Units ({result.response.contributing_chunks.length})
              </span>

              <div className="space-y-2">
                {result.response.contributing_chunks.map((chunk) => {
                  const isExpanded = expandedChunkId === chunk.chunk_id;
                  const boundDocs = chunk.bound_document_ids || [chunk.document_id];

                  return (
                    <div
                      key={chunk.chunk_id}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 truncate">
                          <span className="font-mono text-[11px] text-slate-300 font-bold">
                            {chunk.chunk_id}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 font-mono">
                            [{boundDocs.map((d) => d.split('-').pop()).join(', ')}]
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                          Sim: {(chunk.similarity * 100).toFixed(1)}%
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                        {chunk.text_snippet}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                        <span>{chunk.citation}</span>
                        <div className="flex items-center space-x-2">
                          <span>{chunk.qa_pairs_count} Q&A</span>
                          <span>·</span>
                          <span>{chunk.tabular_keys_count} Keys</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
