import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDot, Plus, Check } from 'lucide-react';
import { adminGet } from '@/lib/admin/api';

interface Props {
  companyId: string;
  currentPhase: string;
}



export function WorkflowProgressTracker({ companyId, currentPhase }: Props) {
  const [workflows, setWorkflows] = useState<any[]>([]);

  const fetchWorkflows = () => {
    if (companyId) {
      adminGet<{ data: any[] }>(`/companies/${companyId}/workflows`)
        .then(res => {
          if (res.data) setWorkflows(res.data);
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [companyId]);


  if (currentPhase === 'closed') {
    return (
      <div className="w-full bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <h3 className="text-red-900 font-bold">Company Closed</h3>
          <p className="text-sm text-red-700">This company's lifecycle has ended.</p>
        </div>
      </div>
    );
  }

  const getWorkflowProgress = (type: string) => {
    const wf = workflows.find(w => w.workflow_type === type);
    if (!wf) return 0;
    const status = wf.status.toUpperCase();
    if (['ACKNOWLEDGED', 'COMPLETED', 'RECEIVED'].includes(status)) return 1;
    if (['IN_PROGRESS', 'SENT_TO_MARK', 'WAITING_RESPONSE', 'SENT', 'REQUESTED', 'PREPARED'].includes(status)) return 0.5;
    return 0;
  };

  // Build dynamic PHASES array based on existing workflows
  const basePhases = [{ id: 'interested', label: 'Interested' }];
  
  const brochureProg = getWorkflowProgress('brochure');
  basePhases.push({ id: 'brochure', label: 'Brochure Ack' });

  // Add any custom workflows that are NOT standard
  const standardTypes = ['brochure', 'jnf', 'database', 'drive'];
  const customWorkflows = workflows.filter(w => !standardTypes.includes(w.workflow_type));
  
  customWorkflows.forEach(cw => {
    basePhases.push({ id: cw.workflow_type, label: cw.display_name });
  });

  const jnfProg = getWorkflowProgress('jnf');
  basePhases.push({ id: 'jnf', label: 'JNF Ack' });

  const dbProg = getWorkflowProgress('database');
  basePhases.push({ id: 'database', label: 'Database Ack' });

  const driveProg = getWorkflowProgress('drive');
  basePhases.push({ id: 'completed', label: 'Completed' });

  const PHASES = basePhases;

  // Calculate dynamic activeIndex
  let activeIndex = 0;
  let prevCompleted = true;

  if (prevCompleted) {
    activeIndex += brochureProg;
    if (brochureProg < 1) prevCompleted = false;
  }

  // Custom workflows progress
  customWorkflows.forEach(cw => {
    if (prevCompleted) {
      const prog = getWorkflowProgress(cw.workflow_type);
      activeIndex += prog;
      if (prog < 1) prevCompleted = false;
    }
  });

  if (prevCompleted) {
    activeIndex += jnfProg;
    if (jnfProg < 1) prevCompleted = false;
  }

  if (prevCompleted) {
    activeIndex += dbProg;
    if (dbProg < 1) prevCompleted = false;
  }

  if (prevCompleted) {
    if (currentPhase === 'completed' || driveProg === 1) {
      activeIndex += 1;
    } else {
      activeIndex += driveProg;
    }
  }

  return (
    <div className="w-full relative px-2">
      <div className="flex items-center justify-between relative">
        {/* Background Line Container spanning exactly between centers */}
        <div className="absolute left-[16px] right-[16px] top-1/2 -translate-y-1/2 h-[2px] z-0">
          <div className="w-full h-full bg-gray-200 absolute top-0 left-0"></div>
          {/* Active Line */}
          <div 
            className="h-full bg-[#27ae60] absolute top-0 left-0 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, (activeIndex / Math.max(1, PHASES.length - 1)) * 100)}%` }}
          ></div>
        </div>

        {/* Steps */}
        {PHASES.map((phase, idx) => {
          const isCompleted = idx <= Math.floor(activeIndex);
          const isCurrent = idx === Math.ceil(activeIndex) && activeIndex > Math.floor(activeIndex);
          const isPending = !isCompleted && !isCurrent;

          return (
            <div key={phase.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 relative z-10
                  ${isCompleted ? 'border-2 border-[#27ae60] bg-white text-[#27ae60]' : ''}
                  ${isCurrent ? 'bg-[#27ae60] text-white shadow-[0_0_15px_rgba(39,174,96,0.5)]' : ''}
                  ${isPending ? 'border-2 border-gray-300 bg-white text-gray-300' : ''}
                `}
              >
                 {isCompleted && <Check size={16} strokeWidth={3} />}
                 {isCurrent && <CircleDot size={16} strokeWidth={3} />}
                 {isPending && <CircleDot size={16} strokeWidth={3} />}
              </div>
              
              <span className={`text-[13px] font-medium whitespace-nowrap absolute -bottom-8
                ${isCurrent || isCompleted ? 'text-gray-700' : 'text-gray-500'}
              `}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-10"></div> {/* Spacer for the absolute labels */}
    </div>
  );
}
