import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WorkflowStepper, WorkflowStageState } from './components/WorkflowStepper';
import { IngestionTerminal, TerminalLogLine } from './components/IngestionTerminal';
import { IngestionUploader } from './components/IngestionUploader';
import { DocumentMetadataCard } from './components/DocumentMetadataCard';
import { TriViewKnowledgeUnit } from './components/TriViewKnowledgeUnit';
import { ExpandableSearchDrawer } from './components/ExpandableSearchDrawer';
import { 
  uploadDocumentFile, 
  triggerIngestionProcess, 
  subscribeIngestionTelemetry, 
  fetchDocumentDetails 
} from './api/ingestionApi';
import { IngestionEvent, ParentDocument, KnowledgeUnit } from './types/ingestion';
import { Sparkles, Layers, Database, RefreshCw, Search, ShieldCheck, Zap } from 'lucide-react';

const INITIAL_STAGES: WorkflowStageState[] = [
  {
    id: 'layout_parsing',
    name: 'Layout Parser',
    subtitle: 'DocAI visual element & table extraction',
    status: 'idle',
  },
  {
    id: 'macro_metadata',
    name: 'Macro Taxonomy',
    subtitle: 'DSRF Domain & catalog classification',
    status: 'idle',
  },
  {
    id: 'gcs_archival',
    name: 'GCS Archival',
    subtitle: 'Canonical structured folder storage',
    status: 'idle',
  },
  {
    id: 'revision_deduplication',
    name: 'Revision Dedup',
    subtitle: 'Syntactic SHA-256 chunk revision binding',
    status: 'idle',
  },
  {
    id: 'tri_view_synthesis',
    name: 'Tri-View Units',
    subtitle: 'Spanner Child Table & ScaNN vectors',
    status: 'idle',
  },
];

export const App: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stages, setStages] = useState<WorkflowStageState[]>(INITIAL_STAGES);
  const [logs, setLogs] = useState<TerminalLogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Ingested Document State
  const [currentDocument, setCurrentDocument] = useState<ParentDocument | null>(null);
  const [knowledgeUnits, setKnowledgeUnits] = useState<KnowledgeUnit[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(23);
  const [availableDocs, setAvailableDocs] = useState<ParentDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch catalog documents on mount
  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/search/documents?limit=50');
      if (res.ok) {
        const data = await res.json();
        setAvailableDocs(data.documents || []);
        setTotalDocsCount(data.total || 23);

        if (!currentDocument && data.documents && data.documents.length > 0) {
          const firstDocId = data.documents[0].document_id;
          setSelectedDocId(firstDocId);
          loadDocumentDetails(firstDocId);
        }
      }
    } catch (err) {
      console.warn('Could not load catalog documents on mount:', err);
    }
  }, [currentDocument]);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadDocumentDetails = async (docId: string) => {
    try {
      const data = await fetchDocumentDetails(docId);
      setCurrentDocument(data.document);
      setKnowledgeUnits(data.knowledge_units || []);
    } catch (err) {
      console.error('Failed to load document details:', err);
    }
  };

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocId(docId);
    loadDocumentDetails(docId);
  };

  // Start Ingestion Pipeline
  const handleStartIngestion = async (params: {
    file?: File;
    samplePath?: string;
    filename: string;
    documentId?: string;
    version: number;
  }) => {
    setIsStreaming(true);
    setStages(INITIAL_STAGES.map((s) => ({ ...s, status: 'idle', metric: undefined })));
    setLogs([
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        stage: 'INIT',
        message: `Triggering Governed Ingestion for '${params.filename}' (DocID: ${params.documentId || 'AUTO'}, Rev: v${params.version})...`,
      },
    ]);

    try {
      let jobId: string;

      if (params.file) {
        const uploadRes = await uploadDocumentFile(params.file, params.documentId, params.version);
        jobId = uploadRes.job_id;
      } else if (params.samplePath) {
        const triggerRes = await triggerIngestionProcess({
          file_path: params.samplePath,
          document_id: params.documentId,
          version: params.version,
        });
        jobId = triggerRes.job_id;
      } else {
        throw new Error('No file or sample path provided');
      }

      setActiveJobId(jobId);

      subscribeIngestionTelemetry(
        jobId,
        (event: IngestionEvent) => {
          handleIncomingTelemetryEvent(event);
        },
        (err) => {
          console.error('Telemetry stream error:', err);
          setIsStreaming(false);
        }
      );
    } catch (err: any) {
      console.error('Failed to initiate ingestion:', err);
      setIsStreaming(false);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          stage: 'INIT',
          message: `Ingestion failed to dispatch: ${err.message}`,
        },
      ]);
    }
  };

  const handleIncomingTelemetryEvent = (event: IngestionEvent) => {
    const timestamp = event.timestamp || new Date().toISOString();

    if (event.message) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp,
          level: event.level || 'INFO',
          stage: event.stage_id || event.stage_name,
          message: event.message || '',
        },
      ]);
    }

    if (event.event_type === 'stage_started' && event.stage_id) {
      setStages((prev) =>
        prev.map((st) => (st.id === event.stage_id ? { ...st, status: 'running' } : st))
      );
    } else if (event.event_type === 'stage_completed' && event.stage_id) {
      setStages((prev) =>
        prev.map((st) => {
          if (st.id === event.stage_id) {
            let metricText = 'Completed';
            if (event.total_blocks !== undefined) metricText = `${event.total_blocks} Blocks`;
            if (event.canonical_domain) metricText = `${event.canonical_domain}`;
            if (event.gcs_uri) metricText = `Archived`;
            if (event.deduplicated_count !== undefined) {
              metricText = `${event.new_count || 0} New / ${event.deduplicated_count} Dedup`;
            }
            if (event.promoted_count !== undefined) {
              metricText = `${event.promoted_count} Promoted`;
            }
            return { ...st, status: 'completed', metric: metricText };
          }
          return st;
        })
      );
    } else if (event.event_type === 'job_completed') {
      setIsStreaming(false);
      setStages((prev) => prev.map((st) => ({ ...st, status: 'completed' })));

      if (event.metrics) {
        setMetrics(event.metrics);
      }

      if (event.document_id) {
        loadDocumentDetails(event.document_id);
        setSelectedDocId(event.document_id);
        loadCatalog();
      }
    } else if (event.event_type === 'error') {
      setIsStreaming(false);
      if (event.stage_id) {
        setStages((prev) =>
          prev.map((st) => (st.id === event.stage_id ? { ...st, status: 'error' } : st))
        );
      }
    }
  };

  return (
    <div className="ambient-bg min-h-screen text-slate-100 flex flex-col font-sans selection:bg-adp-red selection:text-white relative">
      {/* Sticky Global Navbar */}
      <Navbar
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
        isSearchOpen={isSearchOpen}
        totalDocs={totalDocsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Architecture Hero Banner */}
        <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 text-adp-crimson shadow-glow-red">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight">
                Questa Governed Document Ingestion & Search Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Enterprise architecture operationalizing <strong>Google Cloud Document AI Layout Parser (v1.6)</strong>, 
              Gemini 3.1 Macro DSRF Taxonomy, Structured GCS Archival, Syntactic Revision Deduplication, 
              and Cloud Spanner Two-Table Child Storage with sub-5ms ScaNN vector retrieval.
            </p>
          </div>

          {/* Active Catalog Document Switcher */}
          <div className="flex items-center space-x-3 shrink-0 relative z-10">
            {availableDocs.length > 0 && (
              <div className="flex items-center space-x-2 bg-space-950/90 px-3 py-2 rounded-xl border border-white/10 shadow-inner">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <select
                  value={selectedDocId}
                  onChange={(e) => handleDocumentSelect(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[240px] truncate"
                >
                  {availableDocs.map((doc) => (
                    <option key={doc.document_id} value={doc.document_id} className="bg-space-950 text-slate-200">
                      {doc.document_title || doc.document_id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={loadCatalog}
              className="p-2.5 rounded-xl bg-space-950/90 hover:bg-space-800 border border-white/10 text-slate-400 hover:text-white transition-all shadow-inner"
              title="Refresh catalog from Cloud Spanner"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 1: Ingestion Uploader */}
        <IngestionUploader
          onStartIngestion={handleStartIngestion}
          isLoading={isStreaming}
        />

        {/* Section 2: Architecture Workflow Stepper */}
        <WorkflowStepper stages={stages} />

        {/* Section 3: Live SSE Telemetry Terminal */}
        <IngestionTerminal
          logs={logs}
          isStreaming={isStreaming}
          onClear={() => setLogs([])}
        />

        {/* Section 4: Post-Ingestion Document & Knowledge Unit Inspector */}
        {currentDocument && (
          <div className="space-y-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Governed Document & Child Knowledge Unit Details
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Catalog ID: <strong className="text-slate-300">{currentDocument.document_id}</strong>
              </span>
            </div>

            {/* Macro Document Metadata Card */}
            <DocumentMetadataCard
              document={currentDocument}
              metrics={metrics}
            />

            {/* Tri-View Knowledge Units */}
            <TriViewKnowledgeUnit
              units={knowledgeUnits}
              documentId={currentDocument.document_id}
            />
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) on Bottom Right */}
      <button
        onClick={() => setIsSearchOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-adp-red to-adp-crimson hover:from-red-500 hover:to-red-700 text-white font-bold text-xs shadow-glow-red hover:shadow-2xl active:scale-95 transition-all cursor-pointer group"
        title="Open Search & Intelligence Copilot (⌘K)"
      >
        <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>Agent Intelligence Search</span>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
          ⌘K
        </kbd>
      </button>

      {/* Expandable Search Drawer (ON THE RIGHT) */}
      <ExpandableSearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
};

export default App;
