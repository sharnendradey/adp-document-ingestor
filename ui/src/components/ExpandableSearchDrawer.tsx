import React, { useState } from 'react';
import { 
  Search, 
  X, 
  UserCheck, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  AlertTriangle,
  GitFork,
  BookOpen,
  Pin,
  PinOff,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SearchResult, UserRole } from '../types/search';
import { executeEntitledQuery } from '../api/searchApi';

interface ExpandableSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const DEFAULT_ROLES: UserRole[] = [
  { id: 'EMPLOYEE', label: 'Employee', description: 'Self-Service workforce view' },
  { id: 'HR_PRACTITIONER', label: 'HR Practitioner', description: 'Privileged HR operations' },
  { id: 'CLIENT_ADMIN', label: 'Client Admin', description: 'Enterprise configurations' },
];

const SUGGESTED_QUERIES = [
  'What is the daily maximum meal reimbursement policy?',
  'What is the bereavement leave policy for immediate family?',
  'How do I configure direct deposit batch processing?',
  'What are the standard mileage reimbursement guidelines?'
];

export const ExpandableSearchDrawer: React.FC<ExpandableSearchDrawerProps> = ({
  isOpen,
  onClose,
  isPinned = false,
  onTogglePin,
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
    <>
      {/* Dimmed Backdrop Overlay (Only in slide-over mode when open) */}
      {!isPinned && (
        <div
          onClick={onClose}
          className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* Right Drawer Panel */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 bg-white border-l border-slate-200 shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
          isOpen
            ? 'w-full sm:w-[500px] translate-x-0 opacity-100'
            : 'w-[500px] translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Ambient Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-adp-red to-purple-600" />

        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-adp-red shadow-xs">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Entitled Search & Intelligence
                </h2>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  ScaNN
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                ABAC-governed Cloud Spanner vector retrieval & Agent Synthesizer
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onTogglePin && (
              <button
                onClick={onTogglePin}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isPinned 
                    ? 'bg-adp-red text-white border-adp-red' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent'
                }`}
                title={isPinned ? 'Unpin drawer' : 'Pin drawer to right side'}
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
              title="Close Search Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Persona Switcher */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-xs">
            <label className="block text-[11px] font-semibold text-slate-700 mb-2 flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-adp-red" />
              <span>Simulated Runtime Role (ABAC):</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEFAULT_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center border ${
                    selectedRole === role.id
                      ? 'bg-adp-red text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
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
                placeholder="Ask any policy or governance question..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red shadow-xs transition-all"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-2 p-2 rounded-lg bg-adp-red hover:bg-red-700 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="mt-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Suggested Inquiries:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearch(sq)}
                    className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all shadow-xs"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Search Results */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              {/* Telemetry Bar */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="flex items-center space-x-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Latency: <strong className="text-slate-900">{result.latency_ms}ms</strong></span>
                </span>
                <span className="font-mono text-emerald-700 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{result.total_chunks_retrieved} Units Matched</span>
                </span>
              </div>

              {/* Circuit Breaker Escalation */}
              {result.circuit_breaker.escalated && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Frontline Associate Escalation</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {result.circuit_breaker.reason || 'Query escalated to human frontline compliance officer.'}
                  </p>
                  <div className="text-[10px] font-mono text-amber-800 bg-white px-2 py-1 rounded border border-amber-200">
                    Target: {result.circuit_breaker.escalation_target}
                  </div>
                </div>
              )}

              {/* Intent Analysis Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Gemini 3.5 Intent Understanding</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    {(result.intent.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Primary Intent</span>
                    <span className="text-slate-800 font-semibold">{result.intent.primary_intent}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Product / BU</span>
                    <span className="text-slate-800 font-semibold">
                      {result.intent.target_product} · {result.intent.target_business_unit}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider mb-1">
                    Required Roles Check
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {result.intent.required_roles.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white text-blue-700 border border-blue-200 font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Agent Analysis Card (Grounded in Spanner Data) */}
              <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200 rounded-xl p-4 space-y-3 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>Agent Grounded Analysis</span>
                        <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Cloud Spanner
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Synthesized directly from live Spanner knowledge units
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                      result.response.confidence_rating === 'GREEN_CERTIFIED' || result.response.confidence_rating === 'HIGH'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {result.response.confidence_display} Conf
                  </span>
                </div>

                <div className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-text">
                  {result.response.answer}
                </div>

                {result.response.citation && (
                  <div className="pt-2 border-t border-emerald-100 text-[11px] text-slate-600 flex items-center space-x-1.5 font-mono">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">Citation: <strong className="text-slate-800">{result.response.citation}</strong></span>
                  </div>
                )}
              </div>

              {/* Contributing Chunks */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contributing Knowledge Units ({result.response.contributing_chunks.length})
                </span>

                <div className="space-y-2">
                  {result.response.contributing_chunks.map((chunk) => {
                    const isExpanded = expandedChunkId === chunk.chunk_id;
                    const boundDocs = chunk.bound_document_ids || [chunk.document_id];

                    return (
                      <div
                        key={chunk.chunk_id}
                        className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2 hover:border-slate-300 transition-all shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="font-mono text-[11px] font-bold text-slate-800">
                              {chunk.chunk_id}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                              [{boundDocs.map((d) => d.split('-').pop()).join(', ')}]
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-emerald-700 shrink-0">
                            Sim: {(chunk.similarity * 100).toFixed(1)}%
                          </span>
                        </div>

                        <p className={`text-slate-600 text-[11px] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {chunk.text_snippet}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                          <span className="truncate mr-2">{chunk.citation}</span>
                          <button
                            onClick={() => setExpandedChunkId(isExpanded ? null : chunk.chunk_id)}
                            className="text-adp-red hover:text-red-700 font-semibold flex items-center space-x-0.5 shrink-0"
                          >
                            <span>{isExpanded ? 'Less' : 'More'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
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
    </>
  );
};
