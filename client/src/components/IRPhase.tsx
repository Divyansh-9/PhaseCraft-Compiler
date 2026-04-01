import React, { useState, useEffect } from 'react';
import type { Quadruple } from '../compiler/ir/IRGenerator';
import '../IR.css';

interface IRPhaseProps {
  ir: Quadruple[];
}

// Visual component for a single instruction
const InstructionRow: React.FC<{ qt: Quadruple }> = ({ qt }) => {
  const { op, arg1, arg2, result } = qt;
  
  // Render logic based on op type
  let content;
  if (op === '=') {
    content = (
      <>
        <span className="tk-res">{result}</span>
        <span className="tk-op">=</span>
        <span className="tk-arg">{arg1}</span>
      </>
    );
  } else if (op === 'param' || op === 'call') {
    content = (
      <>
        <span className="tk-keyword">{op}</span>
        <span className="tk-arg"> {arg1}</span>
        {arg2 && <span className="tk-arg">, {arg2}</span>}
      </>
    );
  } else {
    // Binary Op
    content = (
      <>
        <span className="tk-res">{result}</span>
        <span className="tk-op">=</span>
        <span className="tk-arg">{arg1}</span>
        <span className="tk-op">{op}</span>
        <span className="tk-arg">{arg2}</span>
      </>
    );
  }

  return (
    <div className="tac-instruction">
      <div className="tac-id">{qt.id}</div>
      <div className="tac-code">{content}</div>
    </div>
  );
};

const IRPhase: React.FC<IRPhaseProps> = ({ ir }) => {
  const [temps, setTemps] = useState<{name: string, desc: string}[]>([]);

  useEffect(() => {
    // Extract temps and their meanings from the IR descriptions we added
    const extractedTemps: {name: string, desc: string}[] = [];
    ir.forEach(q => {
      // If result is a temp variable (t1, t2...)
      if (q.result && q.result.startsWith('t')) {
        // Use the description we generated in IRGenerator
        let meaning = q.description || '';
        
        // Cleanup the meaning string to be more "table-like"
        if (meaning.startsWith('Temp ')) {
            meaning = meaning.substring(meaning.indexOf('=') + 1).trim();
        }

        extractedTemps.push({
          name: q.result,
          desc: meaning || 'Intermediate Result'
        });
      }
    });
    setTemps(extractedTemps);
  }, [ir]);

  return (
    <div className="ir-container fade-in">
      <div className="explanation-panel">
         <p><strong>Intermediate Code Generation</strong> converts the syntax tree into a machine-independent representation called three-address code. It simplifies expressions and prepares the program for optimization.</p>
      </div>

      <div className="ir-layout">
        
        {/* Left Column: TAC View */}
        <div className="ir-panel">
          <div className="ir-section-header">
            Three Address Code
            <span style={{opacity: 0.5}}>{ir.length} Instructions</span>
          </div>
          <div className="tac-list">
             {ir.length === 0 ? (
               <div style={{padding: '20px', color: '#666', textAlign: 'center'}}>No code generated yet</div>
             ) : (
                ir.map((qt) => <InstructionRow key={qt.id} qt={qt} />)
             )}
          </div>
        </div>

        {/* Right Column: Breakdown & Temps */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
           
           {/* Section 4: Temp Variable Tracker */}
           <div className="ir-panel" style={{flex: 1}}>
              <div className="ir-section-header">Temp Variable Tracker</div>
              <div className="temp-table-container">
                <table className="temp-table">
                  <thead>
                    <tr>
                      <th>Temp</th>
                      <th>Meaning / Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temps.length === 0 ? (
                      <tr><td colSpan={2} style={{textAlign: 'center', color: '#666'}}>No temporary variables used</td></tr>
                    ) : (
                      temps.map((t, i) => (
                        <tr key={i}>
                          <td><span className="temp-badge">{t.name}</span></td>
                          <td className="temp-desc">{t.desc}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </div>

           {/* Section 2: Expression Breakdown (Compact) */}
           <div className="ir-panel" style={{height: '40%'}}>
              <div className="ir-section-header">Instruction Breakdown</div>
              <div className="expression-breakdown" style={{overflowY: 'auto'}}>
                 {ir.filter(x => x.result.startsWith('t')).map((qt, i) => (
                   <div key={i} className="breakdown-step" style={{animationDelay: `${i * 0.1}s`}}>
                      <span className="temp-badge">{qt.result}</span>
                      <span className="breakdown-arrow">←</span>
                      <span>{qt.arg1} {qt.op} {qt.arg2}</span>
                   </div>
                 ))}
                 {ir.length > 0 && ir.filter(x => x.result.startsWith('t')).length === 0 && (
                   <div style={{padding: '10px', color: '#888'}}>No complex expressions to break down.</div>
                 )}
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};

export default IRPhase;
