import { TalkScriptTokenType, type Token } from '../lexer/TalkScriptLexer';
import type { 
  Program, Statement, Expression, BinaryExpression, VariableDeclaration, 
  PrintStatement, Assignment, IfStatement, WhileStatement, ForStatement,
  BlockStatement, NumericLiteral, StringLiteral, Identifier, FunctionDeclaration,
  ReturnStatement
} from '../parser/AST';

export class TalkScriptParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Program {
    const program: Program = {
      type: 'Program',
      body: []
    };

    // Skip 'begin program'
    if (this.match(TalkScriptTokenType.Begin)) {
      this.advance();
      this.skipNewlines();
      if (this.match(TalkScriptTokenType.Program)) {
        this.advance();
      }
      this.skipNewlines();
    }

    while (!this.isAtEnd() && !this.match(TalkScriptTokenType.End)) {
      this.skipNewlines();
      if (this.isAtEnd() || this.match(TalkScriptTokenType.End)) break;

      const stmt = this.parseStatement();
      if (stmt) {
        program.body.push(stmt);
      }
      this.skipNewlines();
    }

    // Consume 'end program' if present
    if (this.match(TalkScriptTokenType.End)) {
      this.advance();
      if (this.match(TalkScriptTokenType.Program)) {
        this.advance();
      }
    }

    return program;
  }

  private parseStatement(): Statement | null {
    this.skipNewlines();
    if (this.isAtEnd()) return null;

    // create variable / create number / create function
    if (this.match(TalkScriptTokenType.Create)) {
      return this.parseCreate();
    }

    // set x to 5
    if (this.match(TalkScriptTokenType.Set)) {
      return this.parseAssignment();
    }

    // add 5 to x / add a and b into sum
    if (this.match(TalkScriptTokenType.Add)) {
      return this.parseAdd();
    }

    // subtract 3 from x
    if (this.match(TalkScriptTokenType.Subtract)) {
      return this.parseSubtract();
    }

    // multiply x by 2
    if (this.match(TalkScriptTokenType.Multiply)) {
      return this.parseMultiply();
    }

    // divide x by 3
    if (this.match(TalkScriptTokenType.Divide)) {
      return this.parseDivide();
    }

    // store result in total
    if (this.match(TalkScriptTokenType.Store)) {
      return this.parseStore();
    }

    // display x / show x / print x
    if (this.match(TalkScriptTokenType.Display) || 
        this.match(TalkScriptTokenType.Show) || 
        this.match(TalkScriptTokenType.Print)) {
      return this.parseDisplay();
    }

    // if ... then ... otherwise/else ... end if
    if (this.match(TalkScriptTokenType.If)) {
      return this.parseIf();
    }

    // repeat N times ... end repeat
    if (this.match(TalkScriptTokenType.Repeat)) {
      return this.parseRepeat();
    }

    // while ... end while
    if (this.match(TalkScriptTokenType.While)) {
      return this.parseWhile();
    }

    // call functionName
    if (this.match(TalkScriptTokenType.Call)) {
      return this.parseCall();
    }

    // return expr
    if (this.match(TalkScriptTokenType.Return)) {
      return this.parseReturn();
    }

    // Unknown token — skip to prevent infinite loops
    const current = this.tokens[this.position];
    if (current && current.type !== TalkScriptTokenType.EOF) {
      this.advance();
    }
    return null;
  }

  // create variable x / create variable x equal to 10 / create number x as 5 / create function f
  private parseCreate(): Statement {
    const token = this.consume(TalkScriptTokenType.Create);

    // create function name ... end function
    if (this.match(TalkScriptTokenType.Function)) {
      return this.parseFunctionDecl(token);
    }

    // create number x as 5
    if (this.match(TalkScriptTokenType.NumberKeyword)) {
      this.advance();
      const id = this.consume(TalkScriptTokenType.Identifier);
      this.consume(TalkScriptTokenType.As);
      const value = this.parseExpression();

      return {
        type: 'VariableDeclaration',
        varType: 'int',
        identifier: id.value,
        value: value,
        line: id.line
      };
    }

    // create variable x [equal to EXPR]
    this.consume(TalkScriptTokenType.Variable);
    const id = this.consume(TalkScriptTokenType.Identifier);

    let value: Expression = { type: 'NumericLiteral', value: 0 };
    let varType = 'int';

    // Optional: equal to EXPR
    if (this.match(TalkScriptTokenType.Equal)) {
      this.advance(); // consume 'equal'
      if (this.match(TalkScriptTokenType.To)) {
        this.advance(); // consume 'to'
      }
      value = this.parseExpression();

      // Infer type
      if (value.type === 'StringLiteral') {
        varType = 'string';
      } else if (value.type === 'NumericLiteral') {
        varType = String((value as NumericLiteral).value).includes('.') ? 'float' : 'int';
      }
    }
    // Alternative: set to / as
    else if (this.match(TalkScriptTokenType.As)) {
      this.advance();
      value = this.parseExpression();
      if (value.type === 'StringLiteral') varType = 'string';
    }
    else if (this.match(TalkScriptTokenType.To)) {
      this.advance();
      value = this.parseExpression();
      if (value.type === 'StringLiteral') varType = 'string';
    }

    return {
      type: 'VariableDeclaration',
      varType,
      identifier: id.value,
      value: value,
      line: token.line
    };
  }

  // create function name ... end function
  private parseFunctionDecl(createToken: Token): FunctionDeclaration {
    this.consume(TalkScriptTokenType.Function);
    const name = this.consume(TalkScriptTokenType.Identifier);
    this.skipNewlines();

    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isEndOf(TalkScriptTokenType.Function)) break;
      if (this.match(TalkScriptTokenType.End)) break;

      const s = this.parseStatement();
      if (s) body.push(s);
    }

    this.consume(TalkScriptTokenType.End);
    this.consume(TalkScriptTokenType.Function);

    return {
      type: 'FunctionDeclaration',
      name: name.value,
      body: { type: 'BlockStatement', body, line: createToken.line },
      line: createToken.line
    };
  }

  // set x to EXPR
  private parseAssignment(): Assignment {
    const token = this.consume(TalkScriptTokenType.Set);
    const id = this.consume(TalkScriptTokenType.Identifier);
    this.consume(TalkScriptTokenType.To);
    const value = this.parseExpression();

    return {
      type: 'Assignment',
      identifier: id.value,
      value: value,
      line: token.line
    };
  }

  // add EXPR to ID / add a and b into sum
  private parseAdd(): Assignment {
    const token = this.consume(TalkScriptTokenType.Add);
    const firstExpr = this.parseExpression();

    // add a and b into sum
    if (this.match(TalkScriptTokenType.And)) {
      this.advance();
      const secondExpr = this.parseExpression();
      this.consume(TalkScriptTokenType.Into);
      const id = this.consume(TalkScriptTokenType.Identifier);

      return {
        type: 'Assignment',
        identifier: id.value,
        value: {
          type: 'BinaryExpression',
          operator: '+',
          left: firstExpr,
          right: secondExpr,
          line: token.line
        },
        line: token.line
      };
    }

    // add 5 to x → x = x + 5
    this.consume(TalkScriptTokenType.To);
    const id = this.consume(TalkScriptTokenType.Identifier);

    return {
      type: 'Assignment',
      identifier: id.value,
      value: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: id.value, line: id.line },
        right: firstExpr,
        line: token.line
      },
      line: token.line
    };
  }

  // subtract 3 from x → x = x - 3
  private parseSubtract(): Assignment {
    const token = this.consume(TalkScriptTokenType.Subtract);
    const expr = this.parseExpression();
    this.consume(TalkScriptTokenType.From);
    const id = this.consume(TalkScriptTokenType.Identifier);

    return {
      type: 'Assignment',
      identifier: id.value,
      value: {
        type: 'BinaryExpression',
        operator: '-',
        left: { type: 'Identifier', name: id.value, line: id.line },
        right: expr,
        line: token.line
      },
      line: token.line
    };
  }

  // multiply x by 2 → x = x * 2
  private parseMultiply(): Assignment {
    const token = this.consume(TalkScriptTokenType.Multiply);
    const id = this.consume(TalkScriptTokenType.Identifier);
    this.consume(TalkScriptTokenType.By);
    const expr = this.parseExpression();

    return {
      type: 'Assignment',
      identifier: id.value,
      value: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Identifier', name: id.value, line: id.line },
        right: expr,
        line: token.line
      },
      line: token.line
    };
  }

  // divide x by 3 → x = x / 3
  private parseDivide(): Assignment {
    const token = this.consume(TalkScriptTokenType.Divide);
    const id = this.consume(TalkScriptTokenType.Identifier);
    this.consume(TalkScriptTokenType.By);
    const expr = this.parseExpression();

    return {
      type: 'Assignment',
      identifier: id.value,
      value: {
        type: 'BinaryExpression',
        operator: '/',
        left: { type: 'Identifier', name: id.value, line: id.line },
        right: expr,
        line: token.line
      },
      line: token.line
    };
  }

  // store EXPR in ID
  private parseStore(): Assignment {
    const token = this.consume(TalkScriptTokenType.Store);
    const valueExpr = this.parseExpression();
    this.consume(TalkScriptTokenType.In);
    const id = this.consume(TalkScriptTokenType.Identifier);

    return {
      type: 'Assignment',
      identifier: id.value,
      value: valueExpr,
      line: token.line
    };
  }

  // display EXPR / show EXPR / print EXPR
  private parseDisplay(): PrintStatement {
    const token = this.advance(); // consume display/show/print
    const expr = this.parseExpression();

    return {
      type: 'PrintStatement',
      expression: expr,
      line: token.line
    };
  }

  // if COND then BODY [otherwise/else BODY] end if
  private parseIf(): IfStatement {
    const token = this.consume(TalkScriptTokenType.If);
    const condition = this.parseExpression();

    // Require 'then'
    if (!this.match(TalkScriptTokenType.Then)) {
      throw new Error(`Missing 'then' in if statement at line ${token.line}`);
    }
    this.consume(TalkScriptTokenType.Then);
    this.skipNewlines();

    // Parse consequent body
    const consequentBody: Statement[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.match(TalkScriptTokenType.Otherwise) || this.match(TalkScriptTokenType.Else)) break;
      if (this.isEndOf(TalkScriptTokenType.If)) break;
      if (this.match(TalkScriptTokenType.End)) break;

      const s = this.parseStatement();
      if (s) consequentBody.push(s);
    }

    const consequent: BlockStatement = {
      type: 'BlockStatement',
      body: consequentBody,
      line: token.line
    };

    // Optional: otherwise / else
    let alternate: BlockStatement | undefined;
    if (this.match(TalkScriptTokenType.Otherwise) || this.match(TalkScriptTokenType.Else)) {
      this.advance();
      this.skipNewlines();

      const alternateBody: Statement[] = [];
      while (!this.isAtEnd()) {
        this.skipNewlines();
        if (this.isEndOf(TalkScriptTokenType.If)) break;
        if (this.match(TalkScriptTokenType.End)) break;

        const s = this.parseStatement();
        if (s) alternateBody.push(s);
      }

      alternate = {
        type: 'BlockStatement',
        body: alternateBody,
        line: token.line
      };
    }

    // Consume 'end if'
    this.consume(TalkScriptTokenType.End);
    this.consume(TalkScriptTokenType.If);

    return {
      type: 'IfStatement',
      condition,
      consequent,
      alternate,
      line: token.line
    };
  }

  // repeat N times BODY end repeat
  // Desugars into: for (_i = 0; _i < N; _i = _i + 1) { body }
  private parseRepeat(): ForStatement {
    const token = this.consume(TalkScriptTokenType.Repeat);
    
    // Parse the count expression
    const countExpr = this.parseExpression();

    // Expect 'times'
    if (!this.match(TalkScriptTokenType.Times)) {
      throw new Error(`Missing 'times' after repeat count at line ${token.line}`);
    }
    this.consume(TalkScriptTokenType.Times);
    this.skipNewlines();

    // Parse body
    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isEndOf(TalkScriptTokenType.Repeat)) break;
      if (this.match(TalkScriptTokenType.End)) break;

      const s = this.parseStatement();
      if (s) body.push(s);
    }

    this.consume(TalkScriptTokenType.End);
    this.consume(TalkScriptTokenType.Repeat);

    // Generate a unique counter variable
    const counterName = `_repeat_i_${token.line}`;

    const init: VariableDeclaration = {
      type: 'VariableDeclaration',
      varType: 'int',
      identifier: counterName,
      value: { type: 'NumericLiteral', value: 0 },
      line: token.line
    };

    const condition: BinaryExpression = {
      type: 'BinaryExpression',
      operator: '<',
      left: { type: 'Identifier', name: counterName, line: token.line },
      right: countExpr,
      line: token.line
    };

    const update: Assignment = {
      type: 'Assignment',
      identifier: counterName,
      value: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Identifier', name: counterName, line: token.line },
        right: { type: 'NumericLiteral', value: 1 },
        line: token.line
      },
      line: token.line
    };

    return {
      type: 'ForStatement',
      init,
      condition,
      update,
      body: { type: 'BlockStatement', body, line: token.line },
      line: token.line
    };
  }

  // while COND ... end while
  private parseWhile(): WhileStatement {
    const token = this.consume(TalkScriptTokenType.While);
    const condition = this.parseExpression();
    this.skipNewlines();

    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isEndOf(TalkScriptTokenType.While)) break;
      if (this.match(TalkScriptTokenType.End)) break;

      const s = this.parseStatement();
      if (s) body.push(s);
    }

    this.consume(TalkScriptTokenType.End);
    this.consume(TalkScriptTokenType.While);

    return {
      type: 'WhileStatement',
      condition,
      body: { type: 'BlockStatement', body, line: token.line },
      line: token.line
    };
  }

  // call functionName
  private parseCall(): PrintStatement {
    const token = this.consume(TalkScriptTokenType.Call);
    const name = this.consume(TalkScriptTokenType.Identifier);

    // We model function calls as print statements that call the function
    // This is a simplification for the mini-compiler
    return {
      type: 'PrintStatement',
      expression: { type: 'Identifier', name: name.value, line: name.line },
      line: token.line
    };
  }

  // return EXPR
  private parseReturn(): ReturnStatement {
    const token = this.consume(TalkScriptTokenType.Return);
    const expr = this.parseExpression();

    return {
      type: 'ReturnStatement',
      argument: expr,
      line: token.line
    };
  }

  // ---- Expression Parsing ----

  private parseExpression(): Expression {
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive();

    while (true) {
      // x greater than y / x > y
      if (this.match(TalkScriptTokenType.Greater)) {
        this.advance();
        if (this.match(TalkScriptTokenType.Than)) this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '>', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      // x less than y / x < y
      if (this.match(TalkScriptTokenType.Less)) {
        this.advance();
        if (this.match(TalkScriptTokenType.Than)) this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '<', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      // x equal to y / x is y / x == y
      if (this.match(TalkScriptTokenType.Is)) {
        this.advance();
        // "is not" → !=
        if (this.match(TalkScriptTokenType.Not)) {
          this.advance();
          const right = this.parseAdditive();
          left = { type: 'BinaryExpression', operator: '!=', left, right, line: (left as any).line } as BinaryExpression;
          continue;
        }
        // "is equal to" → ==
        if (this.match(TalkScriptTokenType.Equal)) {
          this.advance();
          if (this.match(TalkScriptTokenType.To)) this.advance();
        }
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '==', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      // "not equal to"
      if (this.match(TalkScriptTokenType.Not)) {
        this.advance();
        if (this.match(TalkScriptTokenType.Equal)) {
          this.advance();
          if (this.match(TalkScriptTokenType.To)) this.advance();
        }
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '!=', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      // Symbolic operators
      if (this.match(TalkScriptTokenType.GreaterThan)) {
        this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '>', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      if (this.match(TalkScriptTokenType.LessThan)) {
        this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '<', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      if (this.match(TalkScriptTokenType.EqualOp)) {
        this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '==', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      if (this.match(TalkScriptTokenType.NotEqualOp)) {
        this.advance();
        const right = this.parseAdditive();
        left = { type: 'BinaryExpression', operator: '!=', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }

      break;
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (true) {
      if (this.match(TalkScriptTokenType.Plus) || this.match(TalkScriptTokenType.PlusOp)) {
        this.advance();
        const right = this.parseMultiplicative();
        left = { type: 'BinaryExpression', operator: '+', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }
      if (this.match(TalkScriptTokenType.Minus) || this.match(TalkScriptTokenType.MinusOp)) {
        this.advance();
        const right = this.parseMultiplicative();
        left = { type: 'BinaryExpression', operator: '-', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }
      break;
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parsePrimary();

    while (true) {
      if (this.match(TalkScriptTokenType.MultiplyOp)) {
        this.advance();
        const right = this.parsePrimary();
        left = { type: 'BinaryExpression', operator: '*', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }
      if (this.match(TalkScriptTokenType.DivideOp)) {
        this.advance();
        const right = this.parsePrimary();
        left = { type: 'BinaryExpression', operator: '/', left, right, line: (left as any).line } as BinaryExpression;
        continue;
      }
      break;
    }

    return left;
  }

  private parsePrimary(): Expression {
    // Numbers
    if (this.match(TalkScriptTokenType.Number)) {
      const t = this.advance();
      return { type: 'NumericLiteral', value: parseFloat(t.value), line: t.line };
    }

    // String literals
    if (this.match(TalkScriptTokenType.String)) {
      const t = this.advance();
      return { type: 'StringLiteral', value: t.value, line: t.line };
    }

    // Parenthesized expression
    if (this.match(TalkScriptTokenType.LParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.consume(TalkScriptTokenType.RParen);
      return expr;
    }

    // 'result' as identifier
    if (this.match(TalkScriptTokenType.Result)) {
      const t = this.advance();
      return { type: 'Identifier', name: 'result', line: t.line };
    }

    // Identifiers
    if (this.match(TalkScriptTokenType.Identifier)) {
      const t = this.advance();
      return { type: 'Identifier', name: t.value, line: t.line };
    }

    // Error
    const current = this.tokens[this.position];
    throw new Error(`Unexpected token '${current?.value}' (${current?.type}) at line ${current?.line}`);
  }

  // ---- Utility Methods ----

  private match(type: TalkScriptTokenType): boolean {
    if (this.position >= this.tokens.length) return false;
    return this.tokens[this.position].type === type;
  }

  private consume(type: TalkScriptTokenType): Token {
    if (this.match(type)) {
      return this.advance();
    }
    const current = this.tokens[this.position];
    const typeName = type.toString();
    
    // Provide helpful error messages
    let hint = '';
    if (type === TalkScriptTokenType.Then) hint = ` — Missing 'then' in if statement`;
    if (type === TalkScriptTokenType.Times) hint = ` — Missing 'times' after repeat count`;
    if (type === TalkScriptTokenType.To) hint = ` — Missing 'to' keyword`;
    if (type === TalkScriptTokenType.Variable) hint = ` — Expected 'variable' keyword after 'create'`;
    if (type === TalkScriptTokenType.From) hint = ` — Missing 'from' keyword (subtract X from Y)`;
    if (type === TalkScriptTokenType.By) hint = ` — Missing 'by' keyword (multiply/divide X by Y)`;

    throw new Error(
      `Expected '${typeName}' but found '${current?.value}' (${current?.type}) at line ${current?.line}${hint}`
    );
  }

  private advance(): Token {
    return this.tokens[this.position++];
  }

  private isAtEnd(): boolean {
    if (this.position >= this.tokens.length) return true;
    return this.tokens[this.position].type === TalkScriptTokenType.EOF;
  }

  private skipNewlines() {
    while (this.position < this.tokens.length && this.tokens[this.position].type === TalkScriptTokenType.Newline) {
      this.position++;
    }
  }

  // Check if current position is "end <keyword>" sequence
  private isEndOf(keyword: TalkScriptTokenType): boolean {
    if (!this.match(TalkScriptTokenType.End)) return false;
    if (this.position + 1 >= this.tokens.length) return false;
    return this.tokens[this.position + 1].type === keyword;
  }
}
