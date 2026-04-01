export type NodeType = 
  | 'Program' 
  | 'FunctionDeclaration'
  | 'BlockStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'ForStatement'
  | 'ReturnStatement'
  | 'Assignment' 
  | 'BinaryExpression' 
  | 'NumericLiteral' 
  | 'StringLiteral'
  | 'Identifier' 
  | 'VariableDeclaration' 
  | 'PrintStatement'
  | 'ScanStatement'
  | 'ScanExpression';

export interface ScanExpression extends ASTNode {
  type: 'ScanExpression';
}

export interface ASTNode {
  type: NodeType;
  line?: number;
}

export interface Program extends ASTNode {
  type: 'Program';
  body: Statement[];
}

export type Statement = 
  | Assignment 
  | VariableDeclaration 
  | PrintStatement
  | ScanStatement
  | FunctionDeclaration
  | BlockStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ReturnStatement;

export interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  body: BlockStatement;
}

export interface BlockStatement extends ASTNode {
  type: 'BlockStatement';
  body: Statement[];
}

export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: Expression;
  consequent: Statement;
  alternate?: Statement;
}

export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

export interface ForStatement extends ASTNode {
  type: 'ForStatement';
  init: Statement;
  condition: Expression;
  update: Statement;
  body: Statement;
}

export interface ReturnStatement extends ASTNode {
  type: 'ReturnStatement';
  argument: Expression;
}

export interface VariableDeclaration extends ASTNode {
   type: 'VariableDeclaration';
   varType: string;
   identifier: string;
   value: Expression;
}

export interface PrintStatement extends ASTNode {
   type: 'PrintStatement';
   expression: Expression;
}

export interface ScanStatement extends ASTNode {
  type: 'ScanStatement';
  variable: string;
}

export interface Assignment extends ASTNode {
  type: 'Assignment';
  identifier: string;
  value: Expression;
}

export type Expression = BinaryExpression | NumericLiteral | StringLiteral | Identifier;

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  left: Expression;
  right: Expression;
  operator: string;
}

export interface NumericLiteral extends ASTNode {
  type: 'NumericLiteral';
  value: number;
}

export interface StringLiteral extends ASTNode {
  type: 'StringLiteral';
  value: string;
}

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}