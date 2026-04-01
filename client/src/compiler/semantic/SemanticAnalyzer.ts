import type { ASTNode, Program, Expression, BinaryExpression, Assignment, VariableDeclaration, PrintStatement, ScanStatement, ScanExpression, FunctionDeclaration, BlockStatement, IfStatement, WhileStatement, ForStatement, ReturnStatement } from '../parser/AST';
import { SymbolTable } from './SymbolTable';

export class SemanticAnalyzer {
  private symbolTable: SymbolTable;

  constructor() {
    this.symbolTable = new SymbolTable();
  }

  public analyze(node: Program): { symbolTable: SymbolTable } {
    this.symbolTable.clear();
    this.visit(node);
    return { symbolTable: this.symbolTable };
  }

  private visit(node: ASTNode) {
    if (!node) return;
    switch (node.type) {
      case 'Program':
        (node as Program).body.forEach(stmt => this.visit(stmt));
        break;
      case 'FunctionDeclaration':
        this.visitFunctionDeclaration(node as FunctionDeclaration);
        break;
      case 'BlockStatement':
        this.visitBlockStatement(node as BlockStatement);
        break;
      case 'VariableDeclaration':
        this.visitVariableDeclaration(node as VariableDeclaration);
        break;
      case 'Assignment':
        this.visitAssignment(node as Assignment);
        break;
      case 'IfStatement':
        this.visitIfStatement(node as IfStatement);
        break;
      case 'WhileStatement':
        this.visitWhileStatement(node as WhileStatement);
        break;
      case 'ForStatement':
        this.visitForStatement(node as ForStatement);
        break;
      case 'ReturnStatement':
        this.visitReturnStatement(node as ReturnStatement);
        break;
      case 'PrintStatement':
        this.visitPrintStatement(node as PrintStatement);
        break;
      case 'ScanStatement':
        this.visitScanStatement(node as ScanStatement);
        break;
    }
  }

  private visitScanStatement(node: ScanStatement) {
    // Check if variable is defined?
    const variable = this.symbolTable.lookup(node.variable);
    if (!variable) {
       // Warning or Error? Let's just warn or ignore for now as C allows forward declarations sometimes (not really for vars but..)
       // console.warn(`Variable ${node.variable} used in scan but not defined (or scope issue).`);
    }
  }

  private visitFunctionDeclaration(node: FunctionDeclaration) {
    // Define function name in current scope (global usually)
    this.symbolTable.define(node.name, 'function', node.line || 0);
    
    // Enter new scope for function body
    // Ideally SymbolTable should support enterScope/exitScope
    // For this simple version, we'll just visit the body.
    // If we wanted true scoping we'd need to extend SymbolTable.
    // We'll assume the BlockStatement handles the "block" aspect, 
    // but function scopes are often separate.
    this.visit(node.body);
  }

  private visitBlockStatement(node: BlockStatement) {
    // Ideally: this.symbolTable.enterScope();
    node.body.forEach(stmt => this.visit(stmt));
    // Ideally: this.symbolTable.exitScope();
  }

  private visitIfStatement(node: IfStatement) {
    this.visitExpression(node.condition);
    this.visit(node.consequent);
    if (node.alternate) {
      this.visit(node.alternate);
    }
  }

  private visitWhileStatement(node: WhileStatement) {
    this.visitExpression(node.condition);
    this.visit(node.body);
  }

  private visitForStatement(node: ForStatement) {
    this.visit(node.init);
    this.visitExpression(node.condition);
    this.visit(node.update);
    this.visit(node.body);
  }

  private visitReturnStatement(node: ReturnStatement) {
    this.visitExpression(node.argument);
  }

  private visitVariableDeclaration(node: VariableDeclaration) {
    this.visitExpression(node.value);
    this.symbolTable.define(node.identifier, node.varType, node.line || 0);
  }

  private visitPrintStatement(node: PrintStatement) {
    this.visitExpression(node.expression);
  }

  private visitAssignment(node: Assignment) {
    this.visitExpression(node.value);
    // Ideally check if variable exists:
    // if (!this.symbolTable.lookup(node.identifier)) ...
  }

  private visitExpression(node: Expression) {
    if (!node) return;
    // Handle binary expressions (logic + arithmetic)
    if (node.type === 'BinaryExpression') {
      const binExpr = node as BinaryExpression;
      this.visitExpression(binExpr.left);
      this.visitExpression(binExpr.right);
    } else if (node.type === 'Identifier') {
       // Check usage
    }
  }
}
