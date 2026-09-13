import React from 'react';
import { FileText, Cpu, Cloud, GitFork, Layers, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export interface WorkflowStageState {
  id: string;
  name: string;
  subtitle: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  metric?: string;
}

interface WorkflowStepperProps {
  stages: WorkflowStageState[];
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ stages }) => {
  const getIcon = (id: string, status: string) => {
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    if (status === 'running') {
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    }
    switch (id) {
      case 'layout_parsing':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'macro_metadata':
        return <Cpu className="w-4 h-4 text-blue-400" />;
      case 'gcs_archival':
        return <Cloud className="w-4 h-4 text-cyan-400" />;
      case 'revision_deduplication':
        return <GitFork className="w-4 h-4 text-purple-400" />;
      case 'tri_view_synthesis':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-space-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Architecture Workflow & Ingestion Pipeline Progress
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time visual state machine orchestrating Document AI, Gemini 3.1 Macro Classification, and Spanner Child Tables
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isRunning = stage.status === 'running';

          return (
            <div
              key={stage.id}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 ${
                isRunning
                  ? 'bg-gradient-to-b from-blue-950/50 to-space-950 border-blue-500/60 shadow-glow-blue ring-1 ring-blue-500/40'
                  : isCompleted
                  ? 'bg-gradient-to-b from-emerald-950/30 to-space-950 border-emerald-500/40 shadow-sm'
                  : 'bg-space-950/60 border-white/5 text-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">0{idx + 1}</span>
                    <div className={`p-1.5 rounded-lg border ${
                      isRunning ? 'bg-blue-500/10 border-blue-500/30' : isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-space-900 border-white/5'
                    }`}>
                      {getIcon(stage.id, stage.status)}
                    </div>
                  </div>

                  {isRunning && (
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded-full animate-pulse">
                      Active
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                </div>

                <h4 className={`text-xs font-bold leading-snug tracking-tight ${
                  isRunning ? 'text-blue-300' : isCompleted ? 'text-emerald-300' : 'text-slate-300'
                }`}>
                  {stage.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {stage.subtitle}
                </p>
              </div>

              {stage.metric && (
                <div className="mt-3 pt-2 border-t border-white/5 text-[10px] font-mono font-semibold text-slate-300 truncate">
                  {stage.metric}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
