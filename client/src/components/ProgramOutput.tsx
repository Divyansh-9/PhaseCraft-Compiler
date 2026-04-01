import React, { useEffect, useState, useRef } from 'react';
import { Interpreter } from '../services/Interpreter';
import type { Quadruple } from '../compiler/ir/IRGenerator';

interface ProgramOutputProps {
  ir: Quadruple[];
  error: string | null;
  code: string;
}

const ProgramOutput: React.FC<ProgramOutputProps> = ({ ir, error, code }) => {
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'empty' | 'running'>('idle');
  const runningRef = useRef(false);

  useEffect(() => {
    // Determine initial state
    if (!code || code.trim() === '') {
      setStatus('empty');
      setOutputLines(["No source code provided."]);
      return;
    }

    if (error) {
      setStatus('error');
      setOutputLines(["Program execution failed due to errors."]);
      return;
    }

    if (ir.length === 0) {
      setStatus('idle');
      setOutputLines(["(Waiting for compilation...)"]);
      return;
    }

    // Cancel any previous run
    runningRef.current = false;
    
    // Start new execution context
    let isActive = true; // Local flag for this specific effect run
    runningRef.current = true;
    
    const run = async () => {
         setStatus('running'); 
         if (isActive) setOutputLines([]); // Clear only if this is the active run
         
         const interpreter = new Interpreter();
         const accumulatedOutput: string[] = [];

         try {
             await interpreter.execute(
                 ir,
                 (line) => {
                     if (!isActive) return;
                     accumulatedOutput.push(line);
                     setOutputLines(prev => [...prev, line]);
                 },
                 async (varName) => {
                     if (!isActive) return null;
                     
                     // Yield to UI to ensure previous Print statements are rendered
                     await new Promise(r => setTimeout(r, 100));
                     
                     const val = prompt(`Device Terminal Input for '${varName}':`);
                     if (val !== null && isActive) {
                         // Echo input
                         setOutputLines(prev => [...prev, val]);
                         accumulatedOutput.push(val);
                     }
                     return val;
                 }
             );
             
             if (isActive) {
                 if (accumulatedOutput.length === 0 && ir.length > 0) {
                     setOutputLines(["Nothing to be printed"]);
                 }
                 setStatus('success');
             }
         } catch (e) {
             if (isActive) {
                 setOutputLines(prev => [...prev, `Runtime Error: ${e}`]);
                 setStatus('error');
             }
         }
    };
    
    // Slight delay to ensure React state has settled from compilation before running heavy logic
    const timer = setTimeout(() => {
        run();
    }, 50);
    
    return () => {
        isActive = false;
        runningRef.current = false;
        clearTimeout(timer);
    };

  }, [ir, error, code]); // Re-run when IR updates

  return (
    <div style={{
      display: 'flex',  
      flexDirection: 'column', 
      height: '100%', 
      fontFamily: "'Fira Code', monospace",
      color: '#d4d4d4'
    }}>
      <div className="panel-header" style={{
        padding: '10px 15px', 
        borderBottom: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 600,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span>Device Terminal</span>
        <div style={{width: 8, height: 8, borderRadius: '50%', background: status === 'error' ? '#ff4444' : '#00ff88'}}></div>
      </div>
      
      <div style={{
        flex: 1, 
        padding: '15px', 
        overflowY: 'auto',
        fontSize: '14px',
        lineHeight: '1.5',
        background: '#121212' // Darker terminal background
      }}>
        <div style={{
          color: '#888', 
          marginBottom: '10px', 
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          OUTPUT:
        </div>
        
        {outputLines.map((line, idx) => (
           <div key={idx} style={{ 
              color: status === 'error' ? '#ff6b6b' : '#eee',
              wordBreak: 'break-word',
              fontFamily: 'Consolas, "Courier New", monospace'
           }}>
             {line}
           </div>
        ))}

        {status === 'success' && outputLines[0] !== "Nothing to be printed" && (
           <div style={{marginTop: '10px', color: '#00ff88', fontSize: '12px'}}>
              Process finished with exit code 0
           </div>
        )}
      </div>
    </div>
  );
};

export default ProgramOutput;
