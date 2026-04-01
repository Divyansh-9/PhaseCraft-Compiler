import { useState, useEffect, useRef, useCallback } from 'react';
import { Lexer, type Token } from './compiler/lexer/Lexer';
import { TalkScriptLexer, type Token as TalkScriptToken } from './compiler/lexer/TalkScriptLexer';
import { CppLexer } from './compiler/lexer/CppLexer';
import { JavaLexer } from './compiler/lexer/JavaLexer';

import { Parser } from './compiler/parser/Parser';
import { TalkScriptParser } from './compiler/parser/TalkScriptParser';
import { CppParser } from './compiler/parser/CppParser';
import { JavaParser } from './compiler/parser/JavaParser';

import type { Program } from './compiler/parser/AST';
import { SemanticAnalyzer } from './compiler/semantic/SemanticAnalyzer';
import type { Symbol } from './compiler/semantic/SymbolTable';
import { IRGenerator, type Quadruple } from './compiler/ir/IRGenerator';
import { Optimizer } from './compiler/optimizer/Optimizer';
import { CodeGenerator, type CodeGenResult } from './compiler/backend/CodeGenerator';
import LexerPhase from './components/LexerPhase';
import ParserPhase from './components/ParserPhase';
import IRPhase from './components/IRPhase';
import OptimizerPhase from './components/OptimizerPhase';
import CodeGenPhase from './components/CodeGenPhase';
import SplashScreen from './components/SplashScreen';
import CodeEditor from './components/CodeEditor';
import VoiceInput from './components/VoiceInput';
import AIAssistant from './components/AIAssistant';
import ProgramOutput from './components/ProgramOutput';
import './App.css';
import './Lexer.css';

import type { Statement, VariableDeclaration, PrintStatement, Assignment, BinaryExpression, NumericLiteral, Identifier, Expression, BlockStatement, IfStatement, WhileStatement, ReturnStatement, FunctionDeclaration } from './compiler/parser/AST';
import type { AssemblyLine, VariableInfo } from './compiler/backend/CodeGenerator';

// --- C Backend API Helper ---
const API_BASE = '/api';

interface BackendASTNode {
  type: string;
  value: string;
  left: BackendASTNode | null;
  right: BackendASTNode | null;
}

interface BackendResponse {
  tokens?: { type: string; value: string; line: number }[];
  ast?: BackendASTNode | null;
  assembly?: string[];
  optimized?: boolean;
  error?: string;
}

// Convert backend expression node to frontend Expression type
function convertBackendExpr(node: BackendASTNode): Expression {
  if (node.type === 'Literal') {
    return { type: 'NumericLiteral', value: Number(node.value) } as NumericLiteral;
  }
  if (node.type === 'Identifier') {
    return { type: 'Identifier', name: node.value } as Identifier;
  }
  if (node.type === 'BinaryOp') {
    return {
      type: 'BinaryExpression',
      operator: node.value,
      left: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
      right: node.right ? convertBackendExpr(node.right) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
    } as BinaryExpression;
  }
  return { type: 'NumericLiteral', value: 0 } as NumericLiteral;
}

// Convert a backend AST node to a frontend Statement
function convertBackendStatement(node: BackendASTNode): Statement | null {
  if (node.type === 'VarDecl') {
    return {
      type: 'VariableDeclaration',
      varType: 'int',
      identifier: node.value,
      value: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
    } as VariableDeclaration;
  }
  if (node.type === 'Assign') {
    return {
      type: 'Assignment',
      identifier: node.value,
      value: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
    } as Assignment;
  }
  if (node.type === 'Print') {
    return {
      type: 'PrintStatement',
      expression: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
    } as PrintStatement;
  }
  if (node.type === 'Return') {
    return {
      type: 'ReturnStatement',
      argument: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
    } as ReturnStatement;
  }
  if (node.type === 'If') {
    return {
      type: 'IfStatement',
      condition: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
      consequent: node.right ? convertBackendStatement(node.right)! : { type: 'BlockStatement', body: [] } as BlockStatement,
    } as IfStatement;
  }
  if (node.type === 'While') {
    return {
      type: 'WhileStatement',
      condition: node.left ? convertBackendExpr(node.left) : { type: 'NumericLiteral', value: 0 } as NumericLiteral,
      body: node.right ? convertBackendStatement(node.right)! : { type: 'BlockStatement', body: [] } as BlockStatement,
    } as WhileStatement;
  }
  if (node.type === 'Block' || node.type === 'Seq') {
    const stmts: Statement[] = [];
    collectStatements(node, stmts);
    return { type: 'BlockStatement', body: stmts } as BlockStatement;
  }
  return null;
}

// Collect statements from Seq chains
function collectStatements(node: BackendASTNode, out: Statement[]): void {
  if (node.type === 'Seq') {
    if (node.left) {
      const s = convertBackendStatement(node.left);
      if (s) out.push(s);
    }
    if (node.right) collectStatements(node.right, out);
  } else if (node.type === 'Block') {
    if (node.left) collectStatements(node.left, out);
  } else {
    const s = convertBackendStatement(node);
    if (s) out.push(s);
  }
}

// Convert backend AST to a Program
function convertBackendToProgram(root: BackendASTNode): Program {
  const body: Statement[] = [];
  
  if (root.type === 'Program' && root.left) {
    if (root.left.type === 'Function') {
      // Unwrap Function -> Block -> Seq chain
      const funcNode = root.left;
      const funcBody: Statement[] = [];
      if (funcNode.left) collectStatements(funcNode.left, funcBody);
      
      const funcDecl: FunctionDeclaration = {
        type: 'FunctionDeclaration',
        name: funcNode.value || 'main',
        body: { type: 'BlockStatement', body: funcBody } as BlockStatement,
      };
      body.push(funcDecl);
    } else {
      collectStatements(root.left, body);
    }
  }
  
  return { type: 'Program', body };
}

// Convert backend token format to frontend Token format
function convertBackendTokens(tokens: { type: string; value: string; line: number }[]): Token[] {
  return tokens.map((t, i) => ({
    type: t.type as any,
    value: t.value,
    line: t.line,
    column: i,
  }));
}

// Convert backend assembly lines to CodeGenResult
function convertBackendAssembly(lines: string[]): CodeGenResult {
  const asmLines: AssemblyLine[] = lines.map((line, i) => ({
    text: line,
    indent: line.startsWith('  '),
    irId: i,
  }));
  
  const memory: VariableInfo[] = [];
  
  return {
    code: asmLines,
    memory,
    logs: ['Generated by C Backend (compiler.exe)'],
  };
}

type Phase = 'Lexer' | 'Parser' | 'Semantic' | 'IR' | 'Optimizer' | 'CodeGen';

// --- Icons ---
const Icons = {
  Play: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  Code: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  Tree: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"></circle><path d="M12 8v5"></path><path d="M5 21v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path></svg>,
  Table: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>,
  Layers: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  Cpu: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
};

// --- Main App ---

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState<'C' | 'CPP' | 'Java' | 'TalkScript'>('C');
  const [code, setCode] = useState(`int a = 10;
int b = 20;
int c = a + b * 2;
print(c);`); 
  
  const [activePhase, setActivePhase] = useState<Phase>('Lexer');
  const [useCBackend, setUseCBackend] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  
  // Compiler State
  const [tokens, setTokens] = useState<Token[]>([]);
  const [ast, setAst] = useState<Program | null>(null);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [ir, setIr] = useState<Quadruple[]>([]);
  const [optimizedIr, setOptimizedIr] = useState<Quadruple[]>([]);
  const [assembly, setAssembly] = useState<CodeGenResult | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const editorRef = useRef<any>(null);

  // Check if backend server is reachable
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(() => setBackendAvailable(true))
      .catch(() => setBackendAvailable(false));
  }, []);

  // --- Voice & Editor Handlers ---
  const handleEditorInstance = (editor: any) => {
    editorRef.current = editor;
  };

  const handleVoiceInput = (text: string) => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const position = editor.getPosition();
      
      const op = {
          range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
          },
          text: text + " ",
          forceMoveMarkers: true
      };
      
      editor.executeEdits("voice-input", [op]);
      editor.focus();
  };

  const handleAIFix = (newCode: string) => {
      setCode(newCode);
      setTimeout(() => runCompiler(), 100);
  };

  // Resize Logic
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: any) => {
    if (isResizing) {
      const newHeight = window.innerHeight - mouseMoveEvent.clientY - 30; 
      if (newHeight > 100 && newHeight < window.innerHeight - 200) {
        setTerminalHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Constants for Phases
  const PHASES: {id: Phase, name: string, icon: any}[] = [
    { id: 'Lexer', name: 'Lexical Analysis', icon: Icons.Code },
    { id: 'Parser', name: 'Syntax Analysis', icon: Icons.Tree },
    { id: 'Semantic', name: 'Semantic Analysis', icon: Icons.Table },
    { id: 'IR', name: 'Intermediate Code', icon: Icons.Layers },
    { id: 'Optimizer', name: 'Optimization', icon: Icons.Zap },
    { id: 'CodeGen', name: 'Code Generation', icon: Icons.Cpu },
  ];

  const runCompilerLocal = () => {
    setIsCompiling(true);
    setError(null);
    
    setTokens([]);
    setAst(null);
    setSymbols([]);
    setIr([]);
    setOptimizedIr([]);
    setAssembly(null);

    setTimeout(() => {
      try {
        let t: Token[];
        let program: Program;

        if (language === 'TalkScript') {
             const lexer = new TalkScriptLexer(code);
             t = lexer.tokenize();
             setTokens(t);
             const parser = new TalkScriptParser(t as TalkScriptToken[]);
             program = parser.parse();
             setAst(program);
        } else if (language === 'CPP') {
             const lexer = new CppLexer(code);
             t = lexer.tokenize();
             setTokens(t);
             const parser = new CppParser(t as Token[]);
             program = parser.parse();
             setAst(program);
        } else if (language === 'Java') {
             const lexer = new JavaLexer(code);
             t = lexer.tokenize();
             setTokens(t);
             const parser = new JavaParser(t as Token[]);
             program = parser.parse();
             setAst(program);
        } else {
             const lexer = new Lexer(code);
             t = lexer.tokenize();
             setTokens(t);
             const parser = new Parser(t);
             program = parser.parse();
             setAst(program);
        }

        const analyzer = new SemanticAnalyzer();
        const { symbolTable } = analyzer.analyze(program);
        setSymbols(symbolTable.getAll());

        const irGen = new IRGenerator();
        const tac = irGen.generate(program);
        setIr(tac);

        const optimizer = new Optimizer();
        const optTac = optimizer.optimize(tac);
        setOptimizedIr(optTac);

        const codeGen = new CodeGenerator();
        const asm = codeGen.generate(optTac);
        setAssembly(asm);

      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred during compilation");
      } finally {
        setIsCompiling(false);
      }
    }, 100);
  };

  const runCompilerBackend = async () => {
    setIsCompiling(true);
    setError(null);
    setTokens([]);
    setAst(null);
    setSymbols([]);
    setIr([]);
    setOptimizedIr([]);
    setAssembly(null);

    try {
      const response = await fetch(`${API_BASE}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data: BackendResponse = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Map backend response to frontend state
      if (data.tokens) {
        setTokens(convertBackendTokens(data.tokens));
      }

      if (data.ast) {
        const program = convertBackendToProgram(data.ast);
        setAst(program);
      }

      if (data.assembly) {
        setAssembly(convertBackendAssembly(data.assembly));
      }

      // Note: Semantic, IR, and Optimizer phases are handled internally by the C backend
      // We show the results we get (tokens, AST, assembly)

    } catch (err: any) {
      console.error('Backend compilation error:', err);
      setError(`Backend connection failed: ${err.message}. Is the server running on port 3001?`);
    } finally {
      setIsCompiling(false);
    }
  };

  const runCompiler = () => {
    if (useCBackend && language === 'C') {
      runCompilerBackend();
    } else {
      runCompilerLocal();
    }
  };

  useEffect(() => {
    runCompiler();
  }, []);

  const renderOutput = () => {
    if (activePhase === 'Parser') {
      return <ParserPhase ast={ast} error={error} language={language} />;
    }

    if (error) {
      return (
        <div style={{padding: '20px'}}>
           <h3 style={{color: 'var(--accent-error)', margin: '0 0 15px 0', fontSize: '1.2rem'}}>⚠️ Compilation Error</h3>
           <div style={{
             background: 'rgba(255, 0, 85, 0.1)', 
             border: '1px solid var(--accent-error)', 
             borderRadius: '6px', 
             padding: '20px', 
             fontFamily: 'var(--font-mono)',
             fontSize: '1rem',
             lineHeight: '1.5'
            }}>
             {error}
           </div>
        </div>
      );
    }

    switch (activePhase) {
      case 'Lexer':
        return <LexerPhase tokens={tokens} />;

      case 'Semantic':
        return (
           <div className="vis-container phase-content fade-in">
             <div className="explanation-panel">
               <p><strong>Semantic Analysis</strong> checks for logical consistency, ensuring variables are declared before use and types are compatible, building a Symbol Table.</p>
             </div>
             <div className="vis-header">Symbol Table</div>
             <table style={{width: '100%', textAlign: 'left', borderCollapse: 'collapse'}}>
               <thead>
                 <tr style={{borderBottom: '1px solid #333', color: '#888'}}>
                   <th style={{padding: '8px'}}>Name</th>
                   <th style={{padding: '8px'}}>Type</th>
                   <th style={{padding: '8px'}}>Scope</th>
                 </tr>
               </thead>
               <tbody>
                  {symbols.map((s, i) => (
                    <tr key={i} style={{borderBottom: '1px solid #222'}}>
                      <td style={{padding: '8px', color: 'var(--accent-primary)'}}>{s.name}</td>
                      <td style={{padding: '8px'}}>{s.type}</td>
                      <td style={{padding: '8px'}}>{s.scope}</td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        );
      case 'IR':
        return <IRPhase ir={ir} />;
       case 'Optimizer':
         return <OptimizerPhase originalIr={ir} optimizedIr={optimizedIr} />;
       case 'CodeGen':
         return <CodeGenPhase result={assembly} language={language} />;
      default: return null;
    }
  };

  if (showSplash) {
    return <SplashScreen onStart={() => setShowSplash(false)} />;
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <Icons.Cpu />
          <span>Compiler Visualizer</span>
        </div>
        <div className="controls">
          {/* C Backend Toggle */}
          {language === 'C' && (
            <div 
              onClick={() => {
                if (backendAvailable) setUseCBackend(!useCBackend);
              }}
              title={backendAvailable === false ? 'Backend server not running. Start it with: cd server && npm start' : useCBackend ? 'Using C Backend (compiler.exe)' : 'Using Browser TypeScript Compiler'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: backendAvailable ? 'pointer' : 'not-allowed',
                background: useCBackend ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: useCBackend ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid #444',
                marginRight: '10px',
                transition: 'all 0.3s ease',
                opacity: backendAvailable === false ? 0.4 : 1,
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: useCBackend ? '#00ff88' : (backendAvailable ? '#888' : '#ff4444'),
                boxShadow: useCBackend ? '0 0 8px rgba(0,255,136,0.6)' : 'none',
                transition: 'all 0.3s ease',
              }} />
              <span style={{ fontSize: '0.8rem', color: useCBackend ? '#00ff88' : '#aaa', fontWeight: 500 }}>
                {useCBackend ? 'C Backend' : 'Browser'}
              </span>
            </div>
          )}
          <select 
             className="language-select" 
             value={language} 
             onChange={(e) => {
               const lang = e.target.value as 'C' | 'CPP' | 'Java' | 'TalkScript';
               setLanguage(lang);
               if (lang === 'TalkScript') {
                 setCode(`begin program

create variable x equal to 10
create variable name equal to "hello"
create variable pi equal to 3.14

set x to x plus 5
subtract 3 from x
multiply x by 2

if x greater than 10 then
  display x
otherwise
  display "x is small"
end if

repeat 3 times
  display "hello world"
end repeat

display name
display pi

end program`);
               } else if (lang === 'CPP') {
                 setCode(`int main() {
  int a = 10;
  int b = 20;
  int c = a + b * 2;
  cout << c;
  return 0;
}`);
               } else if (lang === 'Java') {
                 setCode(`public class Main {
  public static void main(String[] args) {
    int a = 10;
    int b = 20;
    int c = a + b * 2;
    System.out.println(c);
  }
}`);
               } else {
                 setCode(`int a = 10;
int b = 20;
int c = a + b * 2;
print(c);`);
               }
             }}
             style={{
               background: '#333', 
               color: 'white', 
               border: '1px solid #444', 
               padding: '5px 10px', 
               borderRadius: '4px',
               marginRight: '10px',
               cursor: 'pointer'
             }}
          >
             <option value="C">C Language</option>
             <option value="CPP">C++ Language</option>
             <option value="Java">Java Language</option>
             <option value="TalkScript">TalkScript (NLP)</option>
          </select>
          <button className="btn" onClick={() => setCode('')} disabled={isCompiling}><Icons.Refresh /> Reset</button>
          <button className="btn btn-primary" onClick={runCompiler} disabled={isCompiling} style={{opacity: isCompiling ? 0.7 : 1}}>
            {isCompiling ? (
              <><span>Compiling...</span></>
            ) : (
              <><Icons.Play /> Re-compile</>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        
        {/* Left: Editor */}
        <div className="panel" style={{ position: 'relative' }}>
          {/* Voice Input FAB */}
          <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 100 }}>
             <VoiceInput 
               onInput={handleVoiceInput} 
               isListening={isListening} 
               onToggle={() => setIsListening(!isListening)} 
             />
          </div>
          <div className="panel-header">
            <span>Input Source</span>
            <Icons.Code />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <CodeEditor 
              code={code}
              language={language}
              onChange={(value) => setCode(value || '')}
              onEditorInstance={handleEditorInstance}
            />
          </div>
        </div>

        {/* Center: Pipeline */}
        <div className="panel" style={{overflow: 'hidden'}}>
          <div className="pipeline-container">
            {PHASES.map((phase, index) => (
              <>
                <div 
                  key={phase.id} 
                  className={`phase-node ${activePhase === phase.id ? 'active' : ''}`}
                  onClick={() => setActivePhase(phase.id)}
                >
                  <div className="phase-icon">
                    <phase.icon />
                  </div>
                  <div className="phase-info">
                    <span className="phase-name">{phase.name}</span>
                    <span className="phase-desc">{activePhase === phase.id ? 'Active' : 'Click to view'}</span>
                  </div>
                  {activePhase === phase.id && (
                    <div style={{position: 'absolute', right: '10px', color: 'var(--accent-primary)'}}>
                         <Icons.Check />
                    </div>
                  )}
                </div>
                {index < PHASES.length - 1 && <div className="pipeline-connector"></div>}
              </>
            ))}
          </div>
        </div>

        {/* Right: Output */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Phase Output (Top) */}
          <div className="panel" style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
             <div className="panel-header">
               <span>Phase Output: {activePhase}</span>
               <Icons.Table />
             </div>
             <div className="output-content" style={{ flex: 1, overflow: 'hidden' }}>
               {renderOutput()}
             </div>
          </div>

          {/* Resizer */}
          <div 
             onMouseDown={startResizing}
             onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}
             onMouseOut={(e) => !isResizing && (e.currentTarget.style.background = 'var(--bg-panel)')}
             style={{ 
               height: '8px', 
               cursor: 'ns-resize', 
               background: isResizing ? 'var(--accent-primary)' : 'var(--bg-panel)',
               borderTop: '1px solid var(--border-color)',
               borderBottom: '1px solid var(--border-color)',
               transition: 'background 0.2s',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               zIndex: 10
             }} 
          >
             <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }}></div>
          </div>

          {/* Program Output (Bottom) */}
          <div className="panel" style={{ height: terminalHeight, minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
             <ProgramOutput 
               ir={optimizedIr.length > 0 ? optimizedIr : ir} 
               error={error} 
               code={code}
             />
          </div>
        
        </div>

      </div>

      {/* Footer Status Bar */}
      <div className="status-bar">
        <div className="status-left">
           <div className="status-item">
             <div className={`status-dot ${error ? 'error' : 'ready'}`}></div>
             <span>{error ? 'Compilation Failed' : 'Ready'}</span>
           </div>
           <div className="status-item">
             <span>Target: x86 Config</span>
           </div>
           <div className="status-item">
             <span style={{ color: useCBackend ? '#00ff88' : '#888' }}>
               {useCBackend ? '⚡ C Backend (compiler.exe)' : '🌐 Browser Compiler (TypeScript)'}
             </span>
           </div>
        </div>
        <div className="status-right">
           <span>v1.0.0 Alpha</span>
        </div>
      </div>
      <AIAssistant 
        code={code}
        error={error}
        language={language}
        onApplyFix={handleAIFix} 
      />
    </div>
  );
}

export default App;
