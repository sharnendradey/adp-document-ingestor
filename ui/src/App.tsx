import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WorkflowStepper, WorkflowStageState } from './components/WorkflowStepper';
import { IngestionTerminal, TerminalLogLine } from './components/IngestionTerminal';
import { IngestionUploader } from './components/IngestionUploader';
import { DocumentMetadataCard } from './components/DocumentMetadataCard';
import { TriViewKnowledgeUnit } from './components/TriViewKnowledgeUnit';
import { UploadedDocumentsLibrary } from './components/UploadedDocumentsLibrary';
import { ExpandableSearchDrawer } from './components/ExpandableSearchDrawer';
import { 
  uploadDocumentFile, 
  triggerIngestionProcess, 
  subscribeIngestionTelemetry, 
  fetchDocumentDetails,
  fetchCatalogDocuments
} from './api/ingestionApi';
import { IngestionEvent, ParentDocument, KnowledgeUnit } from './types/ingestion';
import { 
  Sparkles, 
  Layers, 
  Database, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Zap, 
  FileUp, 
  Library, 
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

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

type ActiveTab = 'ingest' | 'library' | 'inspector';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingest');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stages, setStages] = useState<WorkflowStageState[]>(INITIAL_STAGES);
  const [logs, setLogs] = useState<TerminalLogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Ingested Document State
  const [currentDocument, setCurrentDocument] = useState<ParentDocument | null>(null);
  const [knowledgeUnits, setKnowledgeUnits] = useState<KnowledgeUnit[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [totalDocsCount, setTotalDocsCount] = useState<number>(24);
  const [availableDocs, setAvailableDocs] = useState<ParentDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);

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
    setIsCatalogLoading(true);
    try {
      const data = await fetchCatalogDocuments(100);
      setAvailableDocs(data.documents || []);
      setTotalDocsCount(data.total || 24);

      if (!currentDocument && data.documents && data.documents.length > 0) {
        const firstDocId = data.documents[0].document_id;
        setSelectedDocId(firstDocId);
        loadDocumentDetails(firstDocId);
      }
    } catch (err) {
      console.warn('Could not load catalog documents on mount:', err);
    } finally {
      setIsCatalogLoading(false);
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

  const handleDocumentSelect = (docId: string, switchTab: boolean = true) => {
    setSelectedDocId(docId);
    loadDocumentDetails(docId);
    if (switchTab) {
      setActiveTab('inspector');
    }
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
    setActiveTab('ingest');
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

          {/* Top Quick Actions */}
          <div className="flex items-center space-x-3 shrink-0 relative z-10">
            {availableDocs.length > 0 && (
              <div className="flex items-center space-x-2 bg-space-950/90 px-3 py-2 rounded-xl border border-white/10 shadow-inner">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <select
                  value={selectedDocId}
                  onChange={(e) => handleDocumentSelect(e.target.value, false)}
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer max-w-[200px] truncate"
                  title="Quick-switch active catalog document"
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
              disabled={isCatalogLoading}
              className="p-2.5 rounded-xl bg-space-950/90 hover:bg-space-800 border border-white/10 text-slate-400 hover:text-white transition-all shadow-inner cursor-pointer"
              title="Refresh catalog from Cloud Spanner"
            >
              <RefreshCw className={`w-4 h-4 ${isCatalogLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Segmented Top View Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center space-x-2">
            {/* Tab 1: Ingestion & Live Pipeline */}
            <button
              onClick={() => setActiveTab('ingest')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'ingest'
                  ? 'bg-gradient-to-r from-red-600 to-adp-red text-white shadow-glow-red border border-red-500/40'
                  : 'bg-space-900/80 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>Document Upload & Live Pipeline</span>
              {isStreaming && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </button>

            {/* Tab 2: Uploaded Documents Library */}
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-red-600 to-adp-red text-white shadow-glow-red border border-red-500/40'
                  : 'bg-space-900/80 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Uploaded Documents Library</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 border border-white/10">
                {totalDocsCount}
              </span>
            </button>

            {/* Tab 3: Document & Knowledge Unit Inspector */}
            {currentDocument && (
              <button
                onClick={() => setActiveTab('inspector')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  activeTab === 'inspector'
                    ? 'bg-gradient-to-r from-red-600 to-adp-red text-white shadow-glow-red border border-red-500/40'
                    : 'bg-space-900/80 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="max-w-[200px] truncate">
                  Inspect: {currentDocument.document_title || currentDocument.document_id}
                </span>
              </button>
            )}
          </div>

          {/* Quick Notice */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spanner ABAC Enforcement Active</span>
          </div>
        </div>

        {/* TAB 1: DOCUMENT INGESTION & LIVE PIPELINE */}
        {activeTab === 'ingest' && (
          <div className="space-y-6">
            {/* Document Upload & Client Sample Picker */}
            <IngestionUploader
              onStartIngestion={handleStartIngestion}
              isLoading={isStreaming}
            />

            {/* 5-Stage Visual Workflow Architecture Progress */}
            <WorkflowStepper stages={stages} />

            {/* Live SSE Telemetry Terminal */}
            <IngestionTerminal
              logs={logs}
              isStreaming={isStreaming}
              onClear={() => setLogs([])}
            />

            {/* If a document is loaded, show quick inspector access banner */}
            {currentDocument && (
              <div className="bg-space-900/70 p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Active Document: {currentDocument.document_title || currentDocument.document_id}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {knowledgeUnits.length} child knowledge units indexed in Cloud Spanner child table
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('inspector')}
                  className="px-4 py-2 rounded-xl bg-space-950 hover:bg-space-800 text-slate-200 hover:text-white border border-white/10 text-xs font-bold transition-all shadow-inner cursor-pointer"
                >
                  View Full Metadata & Chunks →
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UPLOADED DOCUMENTS LIBRARY (FULL SPANNER CATALOG) */}
        {activeTab === 'library' && (
          <UploadedDocumentsLibrary
            documents={availableDocs}
            selectedDocId={selectedDocId}
            onSelectDocument={(docId) => handleDocumentSelect(docId, true)}
            onRefresh={loadCatalog}
            isLoading={isCatalogLoading}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {/* TAB 3: POST-INGESTION DOCUMENT & KNOWLEDGE UNIT INSPECTOR */}
        {activeTab === 'inspector' && currentDocument && (
          <div className="space-y-6">
            {/* Inspector Navigation Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-space-950/70 px-4 py-3 rounded-xl border border-white/5">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveTab('library')}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Library</span>
                </button>
                <span className="text-slate-600">|</span>
                <span className="text-xs font-bold text-white">
                  Inspecting: <span className="text-slate-300 font-mono">{currentDocument.document_id}</span>
                </span>
              </div>

              {availableDocs.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500">Switch Document:</span>
                  <select
                    value={selectedDocId}
                    onChange={(e) => handleDocumentSelect(e.target.value, false)}
                    className="bg-space-900 border border-white/10 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer max-w-[220px] truncate"
                  >
                    {availableDocs.map((doc) => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.document_title || doc.document_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Macro Document Metadata Card */}
            <DocumentMetadataCard
              document={currentDocument}
              metrics={metrics}
            />

            {/* Tri-View Knowledge Units with FAQ Questions per Chunk & Runtime Metadata */}
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
