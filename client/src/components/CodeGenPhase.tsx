import React, { useState, useEffect, useRef } from 'react';
import type { CodeGenResult, AssemblyLine } from '../compiler/backend/CodeGenerator';
import '../CodeGen.css';

interface CodeGenPhaseProps {
  result: CodeGenResult | null;
  language?: string;
}

const CodeGenPhase: React.FC<CodeGenPhaseProps> = ({ result, language }) => {
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<'assembly' | 'cpp'>('assembly');
  const [registers, setRegisters] = useState<Record<string, string>>({
    'R0': '0', 'R1': '0', 'R2': '0', 'SP': 'Stack'
  });
  
  const terminalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (result && result.code.length > 0) {
      let currentLine = 0;
      const interval = setInterval(() => {
         if (currentLine >= result.code.length) {
             clearInterval(interval);
             setActiveLineIndex(-1);
             return;
         }
         
         setActiveLineIndex(currentLine);
         simulateRegisterUpdate(result.code[currentLine]);
         
         if (terminalRef.current) {
             const lineEl = terminalRef.current.children[currentLine] as HTMLElement;
             if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
         }

         currentLine++;
      }, 100);

      return () => clearInterval(interval);
    }
  }, [result]);

  // Auto-switch to C++ tab for TalkScript
  useEffect(() => {
    if (language === 'TalkScript' && result?.cppCode) {
      setActiveTab('cpp');
    } else {
      setActiveTab('assembly');
    }
  }, [language, result]);

  const simulateRegisterUpdate = (line: AssemblyLine) => {
      const parts = line.text.trim().replace(',', '').split(' ');
      const op = parts[0];
      
      setRegisters(prev => {
          const next = { ...prev };
          
          if (op === 'MOV') {
              const dest = parts[1];
              const src = parts[2];
              if (dest in next) {
                  if (src in next) next[dest] = next[src];
                  else next[dest] = src;
              }
          } else if (['ADD', 'SUB', 'MUL', 'DIV'].includes(op)) {
              const dest = parts[1];
              if (dest in next) {
                  next[dest] = 'Result';
              }
          } else if (op === 'LOAD') {
              const dest = parts[1];
              const src = parts[2];
              if (dest in next) {
                  next[dest] = src.replace('[','').replace(']','');
              }
          }
          
          return next;
      });
  };

  if (!result) return <div>No Code Generated</div>;

  return (
    <div className="codegen-container fade-in">
       <div className="explanation-panel">
         <p><strong>Code Generation</strong> translates intermediate representation into target-specific code by allocating registers, assigning memory, and selecting instructions.</p>
       </div>

      {/* Tab Switcher for TalkScript */}
      {result.cppCode && (
        <div className="codegen-tabs">
          <button 
            className={`codegen-tab ${activeTab === 'assembly' ? 'active' : ''}`}
            onClick={() => setActiveTab('assembly')}
          >
            Assembly (x86)
          </button>
          <button 
            className={`codegen-tab ${activeTab === 'cpp' ? 'active' : ''}`}
            onClick={() => setActiveTab('cpp')}
          >
            C++ Code
          </button>
        </div>
      )}

      {activeTab === 'cpp' && result.cppCode ? (
        // C++ Code View
        <div className="cpp-output-container">
          <div className="cg-panel" style={{ flex: 1 }}>
            <div className="cg-header" style={{ color: '#4EC9B0' }}>
              Generated C++ Code
              <span style={{ opacity: 0.5 }}>NLP → C++</span>
            </div>
            <div className="terminal-view cpp-code-view">
              {result.cppCode.split('\n').map((line, i) => (
                <div key={i} className="asm-line" style={{ 
                  color: line.trim().startsWith('//') ? '#6A9955' :
                         line.trim().startsWith('#') ? '#C586C0' :
                         line.includes('cout') ? '#DCDCAA' :
                         line.includes('int ') || line.includes('auto ') || line.includes('string ') || line.includes('double ') ? '#569CD6' :
                         '#D4D4D4'
                }}>
                  <span className="line-number">{i + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Assembly View (default)
        <div className="cg-layout">
          {/* Left: Registers & Memory */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {/* Registers */}
              <div className="cg-panel" style={{flex: 1}}>
                   <div className="cg-header">Register Allocation</div>
                   <div style={{overflow: 'auto', flex: 1}}>
                      <table className="data-table">
                          <thead><tr><th>Register</th><th>Value</th></tr></thead>
                          <tbody>
                              {Object.entries(registers).map(([reg, val]) => (
                                  <tr key={reg}>
                                      <td className="reg-name">{reg}</td>
                                      <td className="reg-val">{val}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                   </div>
              </div>
              
              {/* Memory Map */}
              <div className="cg-panel" style={{flex: 1}}>
                   <div className="cg-header">Memory Map</div>
                   <div style={{overflow: 'auto', flex: 1}}>
                      <table className="data-table">
                          <thead><tr><th>Variable</th><th>Address</th></tr></thead>
                          <tbody>
                              {result.memory.length === 0 ? (
                                  <tr><td colSpan={2} style={{textAlign: 'center', color: '#666'}}>No .data segment</td></tr>
                              ) : (
                                  result.memory.map((m, i) => (
                                      <tr key={i}>
                                          <td className="mem-var">{m.name}</td>
                                          <td className="mem-addr">0x{m.address.toString(16).toUpperCase()}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                   </div>
              </div>
          </div>

          {/* Center: Assembly Output */}
          <div className="cg-panel">
              <div className="cg-header">
                  Target Assembly (x86)
                  <span style={{opacity: 0.5}}>{result.code.length} LOC</span>
              </div>
              <div className="terminal-view" ref={terminalRef}>
                  {result.code.map((line, i) => (
                      <div key={i} className={`asm-line ${activeLineIndex === i ? 'active' : ''} ${line.indent ? 'asm-indent' : ''}`}>
                           <span>{line.text}</span>
                           {line.comment && <span className="asm-comment">; {line.comment}</span>}
                      </div>
                  ))}
                  {activeLineIndex === -1 && (
                       <div className="success-banner">
                          <span>✓ Build Successful</span>
                       </div>
                  )}
              </div>
          </div>

          {/* Right: Logs & Mappings */}
          <div className="cg-panel">
              <div className="cg-header">Instruction Selection</div>
              <div className="log-list">
                  {result.logs.map((log, i) => (
                      <div key={i} className="log-item">
                          <span style={{color: 'var(--accent-primary)'}}>➤</span> {log}
                      </div>
                  ))}
              </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CodeGenPhase;
