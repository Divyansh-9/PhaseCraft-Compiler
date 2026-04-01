import React, { useState, useRef, useEffect } from 'react';
import type { 
  Program, ASTNode, BinaryExpression, Assignment, 
  VariableDeclaration, NumericLiteral, StringLiteral, Identifier, PrintStatement,
  FunctionDeclaration, BlockStatement, IfStatement, WhileStatement, ForStatement, ReturnStatement 
} from '../compiler/parser/AST';
import '../Parser.css';

interface ParserPhaseProps {
  ast: Program | null;
  error: string | null;
  language?: string;
}

const getNodeClass = (type: string): string => {
  if (type === 'Program') return 'node-program';
  if (type === 'FunctionDeclaration') return 'node-program';
  if (type === 'IfStatement' || type === 'WhileStatement' || type === 'ForStatement') return 'node-expr';
  if (type === 'ReturnStatement') return 'node-print';
  if (type === 'VariableDeclaration' || type === 'Assignment') return 'node-decl';
  if (type === 'BinaryExpression') return 'node-expr';
  if (type === 'PrintStatement') return 'node-print';
  if (type === 'BlockStatement') return 'node-leaf';
  if (type === 'StringLiteral') return 'node-print';
  return 'node-leaf';
};

const TreeNode: React.FC<{ node: ASTNode | any, label?: string }> = ({ node, label }) => {
  if (!node) return null;

  let displayLabel = label || node.type;
  let displayValue = '';
  let children: React.ReactNode[] = [];

  switch (node.type) {
    case 'Program':
      displayLabel = 'Program';
      children = (node as Program).body.map((stmt, i) => <TreeNode key={i} node={stmt} />);
      break;

    case 'FunctionDeclaration':
      displayLabel = 'Function';
      const func = node as FunctionDeclaration;
      displayValue = `${func.name}()`;
      children.push(<TreeNode key="body" node={func.body} />);
      break;

    case 'BlockStatement':
      displayLabel = 'Block';
      const block = node as BlockStatement;
      children = block.body.map((stmt, i) => <TreeNode key={i} node={stmt} />);
      break;

    case 'IfStatement':
      displayLabel = 'If';
      const ifStmt = node as IfStatement;
      children.push(<TreeNode key="cond" node={ifStmt.condition} label="Condition" />);
      children.push(<TreeNode key="cons" node={ifStmt.consequent} label="Then" />);
      if (ifStmt.alternate) {
        children.push(<TreeNode key="alt" node={ifStmt.alternate} label="Otherwise" />);
      }
      break;

    case 'WhileStatement':
      displayLabel = 'While';
      const whileStmt = node as WhileStatement;
      children.push(<TreeNode key="cond" node={whileStmt.condition} label="Condition" />);
      children.push(<TreeNode key="body" node={whileStmt.body} label="Body" />);
      break;

    case 'ForStatement':
      displayLabel = 'Repeat';
      const forStmt = node as ForStatement;
      children.push(<TreeNode key="init" node={forStmt.init} label="Init" />);
      children.push(<TreeNode key="cond" node={forStmt.condition} label="Condition" />);
      children.push(<TreeNode key="body" node={forStmt.body} label="Body" />);
      children.push(<TreeNode key="update" node={forStmt.update} label="Update" />);
      break;

    case 'ReturnStatement':
      displayLabel = 'Return';
      const retStmt = node as ReturnStatement;
      children.push(<TreeNode key="arg" node={retStmt.argument} />);
      break;
      
    case 'VariableDeclaration':
      displayLabel = 'Declaration';
      const varDecl = node as VariableDeclaration;
      displayValue = `${varDecl.varType} ${varDecl.identifier}`;
      children.push(<TreeNode key="val" node={varDecl.value} />);
      break;

    case 'Assignment':
      displayLabel = 'Assignment';
      const assign = node as Assignment;
      displayValue = `${assign.identifier} =`;
      children.push(<TreeNode key="val" node={assign.value} />);
      break;

    case 'PrintStatement':
      displayLabel = 'Print';
      const print = node as PrintStatement;
      children.push(<TreeNode key="expr" node={print.expression} />);
      break;

    case 'BinaryExpression':
      displayLabel = 'Expression';
      const bin = node as BinaryExpression;
      displayValue = bin.operator;
      children.push(<TreeNode key="left" node={bin.left} />);
      children.push(<TreeNode key="right" node={bin.right} />);
      break;

    case 'NumericLiteral':
      displayLabel = 'Number';
      displayValue = (node as NumericLiteral).value.toString();
      break;

    case 'StringLiteral':
      displayLabel = 'String';
      displayValue = `"${(node as StringLiteral).value}"`;
      break;

    case 'Identifier':
      displayLabel = 'ID';
      displayValue = (node as Identifier).name;
      break;
  }

  return (
    <li>
      <div className={`tf-nc ${getNodeClass(node.type)}`} title="Click to view rule">
        <span className="node-label">{displayLabel}</span>
        {displayValue && <span className="node-value">{displayValue}</span>}
      </div>
      {children.length > 0 && (
        <ul>
          {children}
        </ul>
      )}
    </li>
  );
};

// Grammar rules for different languages
const C_RULES = [
  "Program → FunctionDecl*",
  "FunctionDecl → int id () Block",
  "Block → { Statement* }",
  "Statement → Decl | Assign | Print | If | While | Return | Block",
  "If → if ( Expr ) Stmt",
  "While → while ( Expr ) Stmt",
  "Return → return Expr ;",
  "Decl → int id = Expr ;",
  "Assign → id = Expr ;",
  "Expr → Relational",
  "Relational → Additive { (<|>) Additive }*",
  "Additive → Term { (+|-) Term }*",
  "Term → Factor { (*|/) Factor }*",
  "Factor → ( Expr ) | Number | ID"
];

const NLP_RULES = [
  "Program → begin program Body end program",
  "Body → Statement*",
  "Statement → VarDecl | Assign | Print | IfStmt | Repeat | While | FuncDecl",
  "VarDecl → create variable ID [equal to Expr]",
  "VarDecl → create number ID as Expr",
  "Assign → set ID to Expr",
  "Assign → add Expr to ID",
  "Assign → subtract Expr from ID",
  "Assign → multiply ID by Expr",
  "Assign → divide ID by Expr",
  "Assign → store Expr in ID",
  "Print → display Expr | show Expr | print Expr",
  "IfStmt → if Expr then Body [otherwise Body] end if",
  "Repeat → repeat Expr times Body end repeat",
  "While → while Expr Body end while",
  "FuncDecl → create function ID Body end function",
  "Expr → Comparison",
  "Comparison → Additive { (greater than|less than|is) Additive }*",
  "Additive → Primary { (plus|minus|+|-) Primary }*",
  "Primary → Number | String | ID | ( Expr )"
];

const ParserPhase: React.FC<ParserPhaseProps> = ({ ast, error, language }) => {
  
  const rules = language === 'TalkScript' ? NLP_RULES : C_RULES;

  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startDragging = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      if (newWidth > 150 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging]);

  return (
    <div className="parser-container fade-in" ref={containerRef}>
      
      <div className="explanation-panel">
        <p><strong>Syntax Analysis (Parsing)</strong> analyzes the token stream against the grammar rules to build an Abstract Syntax Tree (AST) representing the program's structure.</p>
      </div>

      <div className="parser-layout" style={{ gridTemplateColumns: `1fr 4px ${sidebarWidth}px` }}>
        
        {/* Main Tree View */}
        <div className="tree-viewport">
          {!ast && !error && <div>Parsing...</div>}
          
          {error && (
            <div style={{color: 'var(--accent-error)', textAlign: 'center', marginTop: '50px'}}>
              <h3>Syntax Error</h3>
              <p>Cannot build tree due to parsing errors.</p>
            </div>
          )}

          {ast && !error && (
            <div className="tf-tree">
              <ul>
                 <TreeNode node={ast} />
              </ul>
            </div>
          )}
        </div>

        {/* Drag Handle */}
        <div 
           className={`resize-handle ${isDragging ? 'active' : ''}`}
           onMouseDown={startDragging}
        />

        {/* Sidebar */}
        <div className="parser-sidebar">
           {/* Status Panel */}
           <div className="status-panel">
              <div className="panel-title">Parser Status</div>
              {error ? (
                <div className="status-invalid">
                   <span>✗ Syntax Error Found</span>
                </div>
              ) : (
                <div className="status-valid">
                   <span>✓ Valid Program</span>
                </div>
              )}
           </div>

           {/* Grammar Rules Panel */}
           <div className="grammar-panel">
             <div className="panel-title">
               {language === 'TalkScript' ? 'NLP Grammar Rules' : 'Grammar Rules'}
             </div>
             <ul className="rule-list">
               {rules.map((rule, i) => (
                 <li key={i} className="rule-item">{rule}</li>
               ))}
             </ul>
           </div>
        </div>

      </div>
    </div>
  );
};

export default ParserPhase;
