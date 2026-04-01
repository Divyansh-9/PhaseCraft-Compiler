import React, { useMemo } from 'react';
import type { Quadruple } from '../compiler/ir/IRGenerator';
import '../Optimizer.css';

interface OptimizerPhaseProps {
  originalIr: Quadruple[];
  optimizedIr: Quadruple[];
}

// Helper to format instruction as string
const formatInstr = (q: Quadruple) => {
  if (q.op === '=') return `${q.result} = ${q.arg1}`;
  if (q.op === 'print' || q.op === 'param' || q.op === 'call') return `${q.op} ${q.arg1} ${q.arg2}`;
  return `${q.result} = ${q.arg1} ${q.op} ${q.arg2}`;
};

const OptimizerPhase: React.FC<OptimizerPhaseProps> = ({ originalIr, optimizedIr }) => {

  // Calculate generic stats
  const reduction = Math.round((1 - optimizedIr.length / Math.max(1, originalIr.length)) * 100);
  const tempsBefore = new Set(originalIr.map(x => x.result).filter(x => x.startsWith('t'))).size;
  const tempsAfter = new Set(optimizedIr.map(x => x.result).filter(x => x.startsWith('t'))).size;
  
  // Diff Calculation Logic (Visual Mapping)
  const diffMap = useMemo(() => {
    // We want to map original IDs to statuses
    // optimizedIr contains the survivors. Some may be modified.
    // originalIr contains everything.
    
    // Map of optimized instructions by ID for quick lookup
    const optMap = new Map<number, Quadruple>();
    optimizedIr.forEach(q => optMap.set(q.id, q));

    return { optMap };
  }, [originalIr, optimizedIr]);

  return (
    <div className="optimizer-container fade-in">
       <div className="explanation-panel">
         <p><strong>Code Optimization</strong> improves efficiency by removing redundant computations and simplifying instructions without changing program meaning.</p>
      </div>

      <div className="opt-layout">
        
        {/* Left: Original IR (Diff View) */}
        <div className="opt-panel">
          <div className="opt-header">
            Before Optimization
            <span style={{opacity: 0.5}}>{originalIr.length} Instr</span>
          </div>
          <div className="code-view">
            {originalIr.map(q => {
               const existsInOpt = diffMap.optMap.has(q.id);
               // If it's not in optimized map, it was REMOVED (Dead Code or Folded)
               // If it IS in optimized map, check if content changed
               let statusClass = '';
               
               if (!existsInOpt) {
                 statusClass = 'removed';
               } else {
                 const newQ = diffMap.optMap.get(q.id)!;
                 // formatting comparison is crude but works for demo
                 if (formatInstr(q) !== formatInstr(newQ)) {
                   statusClass = 'replaced';
                 }
               }

               return (
                 <div key={q.id} className={`diff-line ${statusClass}`}>
                   <span style={{color: '#666', width: '25px', fontSize:'0.8em'}}>{q.id}</span>
                   <span>{formatInstr(q)}</span>
                 </div>
               );
            })}
          </div>
        </div>

        {/* Right: Optimized IR */}
        <div className="opt-panel">
          <div className="opt-header" style={{color: 'var(--accent-success)'}}>
            After Optimization
            <span style={{opacity: 0.5}}>{optimizedIr.length} Instr</span>
          </div>
          <div className="code-view">
             {optimizedIr.length === 0 ? (
               <div style={{color: '#666', textAlign: 'center', marginTop: '50px'}}>Generic Empty Block</div>
             ) : (
               optimizedIr.map((q, i) => (
                 <div key={i} className="diff-line new" style={{border: 'none', background: 'transparent'}}>
                    <span style={{color: '#666', width: '25px', fontSize:'0.8em'}}>{q.id}</span>
                    <span style={{color: 'var(--text-main)'}}>{formatInstr(q)}</span>
                 </div>
               ))
             )}
          </div>
        </div>

      </div>

      {/* Stats Panel */}
      <div className="stats-grid">
         <div className="stat-card">
           <div className="stat-val" style={{color: reduction > 0 ? 'var(--accent-success)' : 'white'}}>
             {reduction}%
           </div>
           <div className="stat-label">Code Size Reduction</div>
         </div>
         <div className="stat-card">
           <div className="stat-val">{Math.max(0, tempsBefore - tempsAfter)}</div>
           <div className="stat-label">Temp Vars Eliminated</div>
         </div>
         <div className="stat-card">
           <div className="stat-val">{optimizedIr.length}</div>
           <div className="stat-label">Final Instructions</div>
         </div>
      </div>

    </div>
  );
};

export default OptimizerPhase;
