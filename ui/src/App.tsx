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
import { Sparkles, Layers, Database, RefreshCw, CheckCircle2 } from 'lucide-react';

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

        // Load first document details if none loaded yet
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
        // Upload custom file
        const uploadRes = await uploadDocumentFile(params.file, params.documentId, params.version);
        jobId = uploadRes.job_id;
      } else if (params.samplePath) {
        // Ingest existing sample file
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

      // Subscribe to real-time SSE stream
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

    // 1. Append to terminal logs
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

    // 2. Update Architecture Stepper stages
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

      // Fetch completed document details to show in inspector
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-adp-red selection:text-white">
      {/* Sliding Expandable Search & Intelligence Drawer */}
      <ExpandableSearchDrawer
        isOpen={isSearchOpen}
        onToggle={() => setIsSearchOpen((prev) => !prev)}
      />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSearchOpen ? 'md:pl-[480px]' : 'pl-0'
        }`}
      >
        {/* Sticky Global Navbar */}
        <Navbar
          onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
          isSearchOpen={isSearchOpen}
          totalDocs={totalDocsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Architecture Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-adp-red/10 border border-adp-red/30 text-adp-red">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-100">
                  Questa Governed Document Ingestion & Search Engine
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Enterprise architecture implementing <strong>Google Document AI Layout Parser</strong>, 
                Macro DSRF Taxonomy, GCS Canonical Partitioning, Syntactic Revision Deduplication, 
                and Cloud Spanner Child Tables with ScaNN pre-filtered mathematical search.
              </p>
            </div>

            {/* Document Switcher / Refresh */}
            <div className="flex items-center space-x-3 shrink-0">
              {availableDocs.length > 0 && (
                <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                  <Database className="w-3.5 h-3.5 text-slate-500 ml-1" />
                  <select
                    value={selectedDocId}
                    onChange={(e) => handleDocumentSelect(e.target.value)}
                    className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[220px] truncate"
                  >
                    {availableDocs.map((doc) => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.document_title || doc.document_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={loadCatalog}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh catalog from Cloud Spanner"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section 1: Ingestion Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12">
              <IngestionUploader
                onStartIngestion={handleStartIngestion}
                isLoading={isStreaming}
              />
            </div>
          </div>

          {/* Section 2: Architecture Workflow Stepper Diagram */}
          <div>
            <WorkflowStepper stages={stages} />
          </div>

          {/* Section 3: Live SSE Telemetry Terminal */}
          <div>
            <IngestionTerminal
              logs={logs}
              isStreaming={isStreaming}
              onClear={() => setLogs([])}
            />
          </div>

          {/* Section 4: Post-Ingestion Document Inspector */}
          {currentDocument && (
            <div className="space-y-6 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Governed Document & Knowledge Unit Details
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Active Document ID: {currentDocument.document_id}
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
      </div>
    </div>
  );
};

export default App;
