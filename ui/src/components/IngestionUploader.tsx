import React, { useState, useEffect } from 'react';
import { UploadCloud, FolderOpen, Play, Check, AlertCircle, FileText, ChevronDown } from 'lucide-react';
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
        // Default to first policy
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Document Ingestion & Revision Staging
          </h2>
          <p className="text-xs text-slate-400">
            Select authentic client documents (.pdf, .docx, .xlsx, .html) or upload revisions
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('sample')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              mode === 'sample' ? 'bg-adp-red text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Client Corpus
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              mode === 'upload' ? 'bg-adp-red text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Upload
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sample' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Document Category:
              </label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-adp-red"
              >
                {Object.keys(sampleCategories).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({sampleCategories[cat]?.length || 0} files)
                  </option>
                ))}
              </select>
            </div>

            {/* File Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Client Document:
              </label>
              <select
                value={selectedSamplePath}
                onChange={handleSampleSelect}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-adp-red"
              >
                {(sampleCategories[selectedCategory] || []).map((doc) => (
                  <option key={doc.full_path} value={doc.full_path}>
                    [{doc.format}] {doc.filename} ({doc.size_display})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Drag & Drop Upload */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-700 hover:border-adp-red bg-slate-950/60 rounded-xl p-6 text-center transition-colors cursor-pointer"
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.docx,.xlsx,.xls,.html,.htm,.csv,.txt"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              {selectedFile ? (
                <p className="text-xs font-medium text-emerald-400">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium text-slate-300">
                    Click to select or drag and drop document file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports .pdf, .docx, .xlsx, .html, .csv (Processed via Google Document AI & Layout Extractors)
                  </p>
                </>
              )}
            </label>
          </div>
        )}

        {/* Ingestion Parameters: Document ID and Revision Version */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Document ID (Catalog Primary Key):
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="e.g. DOC-ADP-TRAVEL-POLICY-V1"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-adp-red"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Revision Version:
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={version}
              onChange={(e) => setVersion(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-adp-red"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>GCS Partitioning & Spanner Deduplication Enabled</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || (mode === 'upload' && !selectedFile) || (mode === 'sample' && !selectedSamplePath)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-adp-red to-red-700 hover:from-red-600 hover:to-red-800 text-white font-semibold text-xs shadow-lg shadow-adp-red/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
