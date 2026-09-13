import React from 'react';
import { FileText, Cpu, Cloud, GitFork, Layers, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

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
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (status === 'running') {
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    }
    switch (id) {
      case 'layout_parsing':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      case 'macro_metadata':
        return <Cpu className="w-4 h-4 text-blue-600" />;
      case 'gcs_archival':
        return <Cloud className="w-4 h-4 text-cyan-600" />;
      case 'revision_deduplication':
        return <GitFork className="w-4 h-4 text-purple-600" />;
      case 'tri_view_synthesis':
        return <Layers className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Architecture Workflow & Ingestion Pipeline Progress
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time visual state machine orchestrating Gemini Multimodal, Macro DSRF Classification, and Spanner Child Tables
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
                  ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-300'
                  : isCompleted
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 text-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">0{idx + 1}</span>
                    <div className={`p-1.5 rounded-lg border ${
                      isRunning 
                        ? 'bg-blue-100 border-blue-200' 
                        : isCompleted 
                        ? 'bg-emerald-100 border-emerald-200' 
                        : 'bg-white border-slate-200'
                    }`}>
                      {getIcon(stage.id, stage.status)}
                    </div>
                  </div>

                  {isRunning && (
                    <span className="text-[9px] font-mono font-bold text-blue-700 uppercase tracking-wider bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                      Active
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Done
                    </span>
                  )}
                </div>

                <h4 className={`text-xs font-bold leading-snug tracking-tight ${
                  isRunning ? 'text-blue-950' : isCompleted ? 'text-emerald-950' : 'text-slate-800'
                }`}>
                  {stage.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {stage.subtitle}
                </p>
              </div>

              {stage.metric && (
                <div className="mt-3 pt-2 border-t border-slate-200/80 text-[10px] font-mono font-semibold text-slate-700 truncate">
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

