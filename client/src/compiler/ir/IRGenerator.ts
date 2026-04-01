import type { ASTNode, Program, Assignment, Expression, BinaryExpression, NumericLiteral, StringLiteral, Identifier, VariableDeclaration, PrintStatement, ScanStatement, ScanExpression, FunctionDeclaration, BlockStatement, IfStatement, WhileStatement, ForStatement, ReturnStatement } from '../parser/AST';

export interface Quadruple {
  id: number;
  op: string;
  arg1: string;
  arg2: string;
  result: string;
  description?: string; // Description of the operation for visualization
}

export class IRGenerator {
  private tempCounter: number = 0;
  private labelCounter: number = 0;
  private instructions: Quadruple[] = [];

  public generate(node: Program): Quadruple[] {
    this.tempCounter = 1; // Start from t1
    this.labelCounter = 1;
    this.instructions = [];
    this.visit(node);
    return this.instructions;
  }

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private newLabel(): string {
    return `L${this.labelCounter++}`;
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
        (node as BlockStatement).body.forEach(stmt => this.visit(stmt));
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
      case 'Assignment':
        this.visitAssignment(node as Assignment);
        break;
      case 'VariableDeclaration':
        this.visitVariableDeclaration(node as VariableDeclaration);
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
    this.emit('SCAN', '', '', node.variable, `Scan value into ${node.variable}`);
  }

  private visitFunctionDeclaration(node: FunctionDeclaration) {
    this.emit('FUNC_START', node.name, '', '', `Start Function ${node.name}`);
    this.visit(node.body);
    this.emit('FUNC_END', node.name, '', '', `End Function ${node.name}`);
  }

  private visitIfStatement(node: IfStatement) {
    const condition = this.visitExpression(node.condition);
    const labelFalse = this.newLabel();
    const labelEnd = node.alternate ? this.newLabel() : labelFalse;
    
    this.emit('JMP_FALSE', condition, labelFalse, '', `Jump to ${labelFalse} if false`);
    this.visit(node.consequent);
    
    if (node.alternate) {
        this.emit('JMP', labelEnd, '', '', `Jump to end ${labelEnd}`);
        this.emit('LABEL', labelFalse, '', '', `Label ${labelFalse} (Else)`);
        this.visit(node.alternate);
        this.emit('LABEL', labelEnd, '', '', `Label ${labelEnd} (End If)`);
    } else {
        this.emit('LABEL', labelFalse, '', '', `Label ${labelFalse}`);
    }
  }

  private visitWhileStatement(node: WhileStatement) {
    const labelStart = this.newLabel();
    const labelEnd = this.newLabel();

    this.emit('LABEL', labelStart, '', '', `Start Loop ${labelStart}`);
    const condition = this.visitExpression(node.condition);
    this.emit('JMP_FALSE', condition, labelEnd, '', `Exit loop if false`);
    
    this.visit(node.body);
    
    this.emit('JMP', labelStart, '', '', `Jump back to ${labelStart}`);
    this.emit('LABEL', labelEnd, '', '', `End Loop ${labelEnd}`);
  }

  private visitForStatement(node: ForStatement) {
    // Init
    this.visit(node.init);

    const labelStart = this.newLabel();
    const labelEnd = this.newLabel();

    this.emit('LABEL', labelStart, '', '', `Start For-Loop ${labelStart}`);
    const condition = this.visitExpression(node.condition);
    this.emit('JMP_FALSE', condition, labelEnd, '', `Exit for-loop if false`);

    this.visit(node.body);
    this.visit(node.update);

    this.emit('JMP', labelStart, '', '', `Jump back to ${labelStart}`);
    this.emit('LABEL', labelEnd, '', '', `End For-Loop ${labelEnd}`);
  }

  private visitReturnStatement(node: ReturnStatement) {
    const value = this.visitExpression(node.argument);
    this.emit('RET', value, '', '', `Return ${value}`);
  }

  private visitVariableDeclaration(node: VariableDeclaration) {
    const resultAddr = this.visitExpression(node.value);
    this.emit('=', resultAddr, '', node.identifier, `Assign ${resultAddr} to ${node.identifier}`);
  }

  private visitAssignment(node: Assignment) {
    const resultAddr = this.visitExpression(node.value);
    this.emit('=', resultAddr, '', node.identifier, `Update ${node.identifier} with ${resultAddr}`);
  }

  private visitPrintStatement(node: PrintStatement) {
    const addr = this.visitExpression(node.expression);
    this.emit('param', addr, '', '', `Prepare parameter ${addr}`); 
    this.emit('call', 'print', '1', '', `Call print function`); 
  }

  private visitExpression(node: Expression): string {
    if (node.type === 'NumericLiteral') {
      return (node as NumericLiteral).value.toString();
    } else if (node.type === 'StringLiteral') {
      // Just return the raw string value (quoted) for now. The backend can put it in .data if needed.
      return `"${(node as StringLiteral).value}"`;
    } else if (node.type === 'Identifier') {
      return (node as Identifier).name;
    } else if (node.type === 'BinaryExpression') {
      const binExpr = node as BinaryExpression;
      const leftAddr = this.visitExpression(binExpr.left);
      const rightAddr = this.visitExpression(binExpr.right);
      const temp = this.newTemp();
      this.emit(binExpr.operator, leftAddr, rightAddr, temp, `Temp ${temp} = ${leftAddr} ${binExpr.operator} ${rightAddr}`);
      return temp;
    } else if (node.type === 'ScanExpression') {
      const temp = this.newTemp();
      this.emit('SCAN', '', '', temp, `Scan input to temp ${temp}`);
      return temp;
    }
    return '';
  }

  private emit(op: string, arg1: string, arg2: string, result: string, description: string = '') {
    this.instructions.push({
      id: this.instructions.length + 1,
      op,
      arg1,
      arg2,
      result,
      description
    });
  }
}
