import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Check, Trash2, ArrowDown } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.stage ? `[${l.stage}] ` : ''}${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'SUCCESS':
        return 'text-emerald-700 font-bold';
      case 'WARN':
      case 'WARNING':
        return 'text-amber-700 font-bold';
      case 'ERROR':
        return 'text-red-700 font-bold';
      case 'DEDUP':
        return 'text-cyan-700 font-bold';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col h-[360px] font-mono">
      {/* Terminal Title Bar */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
        {/* macOS Dots + Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400 border border-rose-500/40 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/40 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-500/40 inline-block" />
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-800 text-[11px]">Live Architecture Telemetry (SSE)</span>
          </div>

          {isStreaming && (
            <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>STREAMING</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 rounded text-[10px] transition-colors border ${
              autoScroll ? 'bg-slate-100 text-slate-800 border-slate-300 font-semibold' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200'
            }`}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
          >
            Auto-scroll
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors shadow-xs"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors shadow-xs"
              title="Clear terminal window"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 text-[11px] overflow-y-auto space-y-1.5 leading-relaxed text-slate-800 bg-white select-text">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 italic space-y-1">
            <span>Terminal standby. Start an ingestion job to stream live architectural events.</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 hover:bg-slate-50 px-1.5 py-0.5 rounded transition-colors">
              <span className="text-slate-400 select-none text-[10px] shrink-0 font-mono">
                {log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp}
              </span>
              <span className={`text-[10px] uppercase shrink-0 ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>
              {log.stage && (
                <span className="text-blue-700 text-[10px] font-semibold shrink-0">
                  [{log.stage}]
                </span>
              )}
              <span className="text-slate-800 break-all font-sans text-xs">{log.message}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
