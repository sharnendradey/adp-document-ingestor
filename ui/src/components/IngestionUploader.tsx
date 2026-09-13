import React, { useState } from 'react';
import { UploadCloud, Play, Check, FileText, ShieldCheck, Database } from 'lucide-react';

interface IngestionUploaderProps {
  onStartIngestion: (params: {
    file: File;
    filename: string;
    documentId?: string;
    version: number;
  }) => void;
  isLoading: boolean;
}

export const IngestionUploader: React.FC<IngestionUploaderProps> = ({ onStartIngestion, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const processFile = (file: File) => {
    setSelectedFile(file);
    const cleanDocId = `DOC_${file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32).toUpperCase()}`;
    setDocumentId(cleanDocId);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    onStartIngestion({
      file: selectedFile,
      filename: selectedFile.name,
      documentId: documentId.trim() || undefined,
      version: version || 1,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-adp-red">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h2 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight">
              Custom Document Upload & Live Pipeline
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              GCS Auto-Staging
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Drop your client document (.pdf, .docx, .xlsx, .html, .csv) — file is persisted into GCS bucket staging, decomposed via Gemini 3.5 Multimodal Layout, and indexed in Spanner.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-[11px]">Real-Time Telemetry Active</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Custom Drag & Drop Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer group relative overflow-hidden ${
            isDragging
              ? 'border-adp-red bg-red-50/60 scale-[1.005]'
              : selectedFile
              ? 'border-emerald-300 bg-emerald-50/30'
              : 'border-slate-300 hover:border-adp-red/60 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.xlsx,.xls,.html,.htm,.csv,.txt"
          />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-105 shadow-xs ${
              selectedFile
                ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-adp-red'
            }`}>
              {selectedFile ? <FileText className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
            </div>

            {selectedFile ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-bold text-slate-900">
                    {selectedFile.name}
                  </p>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Ready to stage to GCS & ingest into Spanner
                </p>
                <p className="text-[11px] text-adp-crimson pt-1 underline font-medium">
                  Click or drag to replace document
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                  Click to choose a file or drag and drop here
                </p>
                <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
                  Supports authentic enterprise formats: <strong>PDF, DOCX, XLSX, HTML, CSV</strong>. The file will be kept in Google Cloud Storage staging before pipeline execution.
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Auto-Generated Metadata & Revision Version */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Document ID:
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedFile ? `DOC_${selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24).toUpperCase()}` : 'Auto-generated on upload'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Primary key deterministically bound via SHA-256 layout hash & Gemini DSRF taxonomy
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Revision:
            </label>
            <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-mono text-xs mr-1">v</span>
              <input
                type="number"
                min="1"
                max="99"
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-xs text-slate-900 font-mono font-bold focus:outline-none text-center"
                title="Revision version for deduplication tracking"
              />
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Target Bucket: <code className="text-cyan-700 font-mono text-[11px] bg-cyan-50 px-1 py-0.5 rounded border border-cyan-200">gs://adp-questa-document-ingest-poc/staging_uploads/</code></span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-adp-red to-adp-dark hover:from-red-500 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ingesting Through Governed Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Upload to GCS & Start Live Ingestion</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};


