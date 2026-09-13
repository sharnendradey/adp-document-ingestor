import { IngestionEvent, SampleDocument, KnowledgeUnit, ParentDocument } from '../types/ingestion';

export async function fetchSampleDocuments(): Promise<{ total_files: number; categories: Record<string, SampleDocument[]> }> {
  const res = await fetch('/api/v1/ingest/samples');
  if (!res.ok) throw new Error('Failed to fetch sample documents');
  return res.json();
}

export async function uploadDocumentFile(file: File, documentId?: string, version: number = 1) {
  const formData = new FormData();
  formData.append('file', file);
  if (documentId) formData.append('document_id', documentId);
  formData.append('version', String(version));

  const res = await fetch('/api/v1/ingest/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

export async function triggerIngestionProcess(params: {
  job_id?: string;
  file_path?: string;
  filename?: string;
  raw_text?: string;
  document_id?: string;
  version?: number;
}) {
  const res = await fetch('/api/v1/ingest/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to trigger ingestion process');
  return res.json();
}

export function subscribeIngestionTelemetry(
  jobId: string,
  onEvent: (event: IngestionEvent) => void,
  onError?: (err: any) => void
): () => void {
  const eventSource = new EventSource(`/api/v1/ingest/stream/${jobId}`);

  eventSource.onmessage = (e) => {
    try {
      const data: IngestionEvent = JSON.parse(e.data);
      onEvent(data);
      if (data.event_type === 'job_completed' || data.event_type === 'error') {
        eventSource.close();
      }
    } catch (err) {
      console.error('SSE parse error:', err);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchDocumentDetails(documentId: string): Promise<{
  document: ParentDocument;
  total_units: number;
  knowledge_units: KnowledgeUnit[];
}> {
  const res = await fetch(`/api/v1/ingest/document/${encodeURIComponent(documentId)}`);
  if (!res.ok) throw new Error(`Failed to fetch document ${documentId}`);
  return res.json();
}
