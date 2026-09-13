import React from 'react';
import { FileText, Cpu, Cloud, GitFork, Layers, CheckCircle, Clock } from 'lucide-react';

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
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
    switch (id) {
      case 'layout_parsing':
        return <FileText className={`w-5 h-5 ${status === 'running' ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />;
      case 'macro_metadata':
        return <Cpu className={`w-5 h-5 ${status === 'running' ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />;
      case 'gcs_archival':
        return <Cloud className={`w-5 h-5 ${status === 'running' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />;
      case 'revision_deduplication':
        return <GitFork className={`w-5 h-5 ${status === 'running' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />;
      case 'tri_view_synthesis':
        return <Layers className={`w-5 h-5 ${status === 'running' ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Architecture Workflow & Ingestion Pipeline Progress
          </h3>
          <p className="text-xs text-slate-400">
            Real-time visual state machine orchestrating Document AI, Gemini 3.1, and Cloud Spanner
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
              className={`relative flex flex-col justify-between p-3.5 rounded-lg border transition-all ${
                isRunning
                  ? 'bg-slate-800/90 border-blue-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                  : isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">0{idx + 1}</span>
                    <div className="p-1 rounded bg-slate-800/80">
                      {getIcon(stage.id, stage.status)}
                    </div>
                  </div>
                  {isRunning && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Done
                    </span>
                  )}
                </div>

                <h4 className={`text-xs font-semibold leading-snug ${isRunning ? 'text-blue-300' : isCompleted ? 'text-emerald-300' : 'text-slate-300'}`}>
                  {stage.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  {stage.subtitle}
                </p>
              </div>

              {stage.metric && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-300 font-medium truncate">
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
