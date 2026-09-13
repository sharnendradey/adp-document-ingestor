import React, { useState, useEffect } from 'react';
import { UploadCloud, FolderOpen, Play, Check, AlertCircle, FileText, Sparkles, Database, Layers } from 'lucide-react';
import { SampleDocument } from '../types/ingestion';
import { fetchSampleDocuments } from '../api/ingestionApi';

interface IngestionUploaderProps {
  onStartIngestion: (params: {
    file?: File;
    samplePath?: string;
    filename: string;
    documentId?: string;
    version: number;
  }) => void;
  isLoading: boolean;
}

export const IngestionUploader: React.FC<IngestionUploaderProps> = ({ onStartIngestion, isLoading }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleCategories, setSampleCategories] = useState<Record<string, SampleDocument[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('Client Policies');
  const [selectedSamplePath, setSelectedSamplePath] = useState<string>('');
  const [selectedSampleName, setSelectedSampleName] = useState<string>('');
  const [documentId, setDocumentId] = useState<string>('');
  const [version, setVersion] = useState<number>(1);
  const [mode, setMode] = useState<'sample' | 'upload'>('sample');

  useEffect(() => {
    fetchSampleDocuments()
      .then((data) => {
        setSampleCategories(data.categories);
        const policies = data.categories['Client Policies'] || [];
        if (policies.length > 0) {
          setSelectedSamplePath(policies[0].full_path);
          setSelectedSampleName(policies[0].filename);
          setDocumentId(`DOC-${policies[0].filename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20).toUpperCase()}`);
        }
      })
      .catch((err) => console.error('Failed to load sample docs:', err));
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setMode('upload');
      setDocumentId(`DOC-${file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20).toUpperCase()}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setMode('upload');
      setDocumentId(`DOC-${file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20).toUpperCase()}`);
    }
  };

  const handleSampleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fullPath = e.target.value;
    setSelectedSamplePath(fullPath);
    const filename = fullPath.split('/').pop() || '';
    setSelectedSampleName(filename);
    setDocumentId(`DOC-${filename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20).toUpperCase()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'upload' && selectedFile) {
      onStartIngestion({
        file: selectedFile,
        filename: selectedFile.name,
        documentId: documentId || undefined,
        version: version || 1,
      });
    } else if (mode === 'sample' && selectedSamplePath) {
      onStartIngestion({
        samplePath: selectedSamplePath,
        filename: selectedSampleName,
        documentId: documentId || undefined,
        version: version || 1,
      });
    }
  };

  return (
    <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Document Ingestion & Revision Staging
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Select authentic client documents (.pdf, .docx, .xlsx, .html) or upload revisions
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex bg-space-950/80 p-1 rounded-xl border border-white/5 text-xs shadow-inner self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('sample')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'sample' 
                ? 'bg-gradient-to-r from-red-600 to-adp-red text-white shadow-md shadow-red-600/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Client Corpus
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'upload' 
                ? 'bg-gradient-to-r from-red-600 to-adp-red text-white shadow-md shadow-red-600/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Upload
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sample' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Category Select */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Client Document Category:
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    const items = sampleCategories[e.target.value] || [];
                    if (items.length > 0) {
                      setSelectedSamplePath(items[0].full_path);
                      setSelectedSampleName(items[0].filename);
                      setDocumentId(`DOC-${items[0].filename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20).toUpperCase()}`);
                    }
                  }}
                  className="w-full bg-space-950/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red shadow-inner transition-all appearance-none cursor-pointer"
                >
                  {Object.keys(sampleCategories).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({sampleCategories[cat]?.length || 0} files)
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Target Client Document */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-300">
                Target Client Document:
              </label>
              <div className="relative">
                <select
                  value={selectedSamplePath}
                  onChange={handleSampleSelect}
                  className="w-full bg-space-950/90 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red shadow-inner transition-all appearance-none cursor-pointer"
                >
                  {(sampleCategories[selectedCategory] || []).map((doc) => (
                    <option key={doc.full_path} value={doc.full_path}>
                      [{doc.format}] {doc.filename} ({doc.size_display})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs">▼</div>
              </div>
            </div>
          </div>
        ) : (
          /* Custom Drag & Drop Dropzone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-white/10 hover:border-adp-red/60 bg-space-950/60 rounded-2xl p-7 text-center transition-all cursor-pointer group hover:bg-space-950/80"
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx,.xls,.html,.htm,.csv,.txt"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-adp-crimson flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-glow-red">
                <UploadCloud className="w-6 h-6" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-400">
                    Selected: {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB · Ready to ingest
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    Click to select or drag and drop document file
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports .pdf, .docx, .xlsx, .html, .csv (Processed via Google Cloud Document AI & Layout Extractors)
                  </p>
                </div>
              )}
            </label>
          </div>
        )}

        {/* Parameters: Document ID & Revision Version */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-space-950/60 p-3.5 rounded-xl border border-white/5 text-xs shadow-inner">
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Document ID (Catalog Primary Key):
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="e.g. DOC-ADP-TRAVEL-POLICY-V1"
              className="w-full bg-space-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Revision Version:
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={version}
              onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
              className="w-full bg-space-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-adp-red focus:ring-1 focus:ring-adp-red transition-all"
            />
          </div>
        </div>

        {/* CTA Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>GCS Canonical Storage & Spanner Deduplication Active</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || (mode === 'upload' && !selectedFile) || (mode === 'sample' && !selectedSamplePath)}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-adp-red to-adp-dark hover:from-red-500 hover:to-red-700 text-white font-bold text-xs shadow-glow-red hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ingesting Through Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Governed Ingestion</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
