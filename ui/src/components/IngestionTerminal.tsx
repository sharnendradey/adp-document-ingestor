import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';

export interface TerminalLogLine {
  timestamp: string;
  level: string;
  stage?: string;
  message: string;
}

interface IngestionTerminalProps {
  logs: TerminalLogLine[];
  isStreaming: boolean;
  onClear?: () => void;
}

export const IngestionTerminal: React.FC<IngestionTerminalProps> = ({ logs, isStreaming, onClear }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.stage ? `[${l.stage}] ` : ''}${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'SUCCESS':
        return 'text-emerald-400 font-semibold';
      case 'WARN':
      case 'WARNING':
        return 'text-amber-400 font-semibold';
      case 'ERROR':
        return 'text-red-400 font-semibold';
      case 'DEDUP':
        return 'text-cyan-400 font-semibold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[340px]">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-semibold text-slate-300">Live Telemetry Stream (SSE)</span>
          {isStreaming && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>STREAMING</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto space-y-1.5 leading-relaxed text-slate-300 select-text">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 italic">
            <span>Ready. Start an ingestion job to stream live architecture events.</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 hover:bg-slate-900/40 px-1 py-0.5 rounded">
              <span className="text-slate-500 select-none text-[11px] shrink-0">
                {log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp}
              </span>
              <span className={`text-[11px] uppercase shrink-0 ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>
              {log.stage && (
                <span className="text-blue-400 text-[11px] font-semibold shrink-0">
                  [{log.stage}]
                </span>
              )}
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
