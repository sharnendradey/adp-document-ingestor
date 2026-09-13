import React, { useState } from 'react';
import { UploadCloud, Play, Check, AlertCircle, FileText, Sparkles, ShieldCheck, Database, Layers } from 'lucide-react';

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
    <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 text-adp-crimson shadow-glow-red">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h2 className="text-sm md:text-base font-extrabold text-white tracking-tight">
              Custom Document Upload & Live Pipeline
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
              GCS Auto-Staging
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Drop your client document (.pdf, .docx, .xlsx, .html, .csv) — file is immediately persisted into GCS bucket staging, decomposed via Google Document AI, and indexed in Spanner.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-sm self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
              ? 'border-adp-red bg-red-950/20 scale-[1.005] shadow-glow-red'
              : selectedFile
              ? 'border-emerald-500/40 bg-space-950/80'
              : 'border-white/10 hover:border-adp-red/50 bg-space-950/60 hover:bg-space-950/80'
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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110 shadow-lg ${
              selectedFile
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-glow-emerald'
                : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 text-adp-crimson shadow-glow-red'
            }`}>
              {selectedFile ? <FileText className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
            </div>

            {selectedFile ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-bold text-white">
                    {selectedFile.name}
                  </p>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Ready to stage to GCS & ingest into Spanner
                </p>
                <p className="text-[11px] text-adp-crimson pt-1 underline font-medium">
                  Click or drag to replace document
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                  Click to choose a file or drag and drop here
                </p>
                <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Supports authentic enterprise formats: <strong>PDF, DOCX, XLSX, HTML, CSV</strong>. The file will be kept in Google Cloud Storage staging before pipeline execution.
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Auto-Generated Metadata & Revision Version */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-space-950/60 p-4 rounded-xl border border-white/5 text-xs shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Document ID:
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {selectedFile ? `DOC_${selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24).toUpperCase()}` : 'Auto-generated on upload'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Primary key deterministically bound via SHA-256 layout hash & Gemini DSRF taxonomy
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Revision:
            </label>
            <div className="flex items-center bg-space-900 border border-white/10 rounded-lg px-2.5 py-1">
              <span className="text-slate-400 font-mono text-xs mr-1">v</span>
              <input
                type="number"
                min="1"
                max="99"
                value={version}
                onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
                className="w-10 bg-transparent text-xs text-white font-mono font-bold focus:outline-none text-center"
                title="Revision version for deduplication tracking"
              />
            </div>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Target Bucket: <code className="text-cyan-400 font-mono text-[11px]">gs://adp-questa-document-ingest-poc/staging_uploads/</code></span>
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="flex items-center justify-center space-x-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-adp-red to-adp-dark hover:from-red-500 hover:to-red-700 text-white font-bold text-xs shadow-glow-red hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
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
