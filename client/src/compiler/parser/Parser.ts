import { type Token, TokenType } from '../lexer/Lexer';
import type { 
  Program, Statement, Expression, BinaryExpression, VariableDeclaration, 
  PrintStatement, Assignment, FunctionDeclaration, BlockStatement, 
  IfStatement, WhileStatement, ForStatement, ReturnStatement 
} from './AST';

export class Parser {
  protected tokens: Token[];
  protected position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): Program {
    const program: Program = {
      type: 'Program',
      body: []
    };

    while (this.position < this.tokens.length && this.tokens[this.position].type !== TokenType.EOF) {
      program.body.push(this.parseStatement());
    }

    return program;
  }

  protected parseStatement(): Statement {
    if (this.match(TokenType.LBrace)) {
      return this.parseBlock();
    }

    if (this.match(TokenType.If)) {
      return this.parseIf();
    }

    if (this.match(TokenType.While)) {
      return this.parseWhile();
    }

    if (this.match(TokenType.For)) {
      return this.parseFor();
    }

    if (this.match(TokenType.Do)) {
      return this.parseDoWhile();
    }

    if (this.match(TokenType.Return)) {
      return this.parseReturn();
    }

    // break / continue — treat as no-op for the visualizer
    if (this.match(TokenType.Break)) {
      this.advance();
      this.consume(TokenType.SemiColon);
      return { type: 'ReturnStatement', argument: { type: 'NumericLiteral', value: 0 } } as ReturnStatement;
    }

    if (this.match(TokenType.Continue)) {
      this.advance();
      this.consume(TokenType.SemiColon);
      return { type: 'ReturnStatement', argument: { type: 'NumericLiteral', value: 0 } } as ReturnStatement;
    }

    // Check for Type Declaration (int, float, double, void, etc.)
    if (this.isTypeKeyword()) {
      const typeToken = this.advance();
      
      // Handle pointer types: int* or int *
      if (this.match(TokenType.Multiply)) {
        this.advance(); // skip *
      }
      
      const identifier = this.consume(TokenType.Identifier);
      
      // Function Declaration check
      if (this.match(TokenType.LParen)) {
         return this.parseFunction(identifier);
      }

      // Variable Declaration
      const vars: VariableDeclaration[] = [];
      
      let initValue: Expression = { type: 'NumericLiteral', value: 0, line: identifier.line };
      if (this.match(TokenType.Assign)) {
         this.advance();
         initValue = this.parseExpression();
      }
      
      vars.push({
        type: 'VariableDeclaration',
        varType: typeToken.value,
        identifier: identifier.value,
        value: initValue,
        line: identifier.line
      });
      
      while (this.match(TokenType.Comma)) {
          this.advance();
          
          // Handle pointer in comma-separated: int a, *b;
          if (this.match(TokenType.Multiply)) {
            this.advance();
          }
          
          const nextId = this.consume(TokenType.Identifier);
          let nextValue: Expression = { type: 'NumericLiteral', value: 0, line: nextId.line };
          
          if (this.match(TokenType.Assign)) {
              this.advance();
              nextValue = this.parseExpression();
          }
          vars.push({
              type: 'VariableDeclaration',
              varType: typeToken.value,
              identifier: nextId.value,
              value: nextValue,
              line: nextId.line
          });
      }

      this.consume(TokenType.SemiColon);
      
      if (vars.length === 1) return vars[0];
      return {
          type: 'BlockStatement',
          body: vars
      } as BlockStatement;
    }

    if (this.match(TokenType.Print)) {
      const printToken = this.consume(TokenType.Print);
      this.consume(TokenType.LParen);
      const expression = this.parseExpression();
      this.consume(TokenType.RParen);
      this.consume(TokenType.SemiColon);
      return {
        type: 'PrintStatement',
        expression,
        line: printToken.line
      } as PrintStatement;
    }

    // Check for identifier-based statements (assignment, function calls)
    if (this.match(TokenType.Identifier)) {
       const idToken = this.tokens[this.position];
       
       // Special handling for printf
       if (idToken.value === 'printf') {
          this.advance();
          this.consume(TokenType.LParen);
          
          const statements: Statement[] = [];
          
          if (!this.match(TokenType.RParen)) {
             let expr = this.parseExpression();
             
             if (this.match(TokenType.Comma)) {
                  const args: Expression[] = [expr];
                  while (this.match(TokenType.Comma)) {
                      this.advance();
                      args.push(this.parseExpression());
                  }
                  
                  for (const arg of args) {
                       if (args.length > 1 && arg.type === 'StringLiteral' && (arg as any).value.includes('%')) {
                           continue;
                       }
                       statements.push({
                           type: 'PrintStatement',
                           expression: arg,
                           line: idToken.line
                       });
                  }
                  
             } else {
                 statements.push({
                      type: 'PrintStatement',
                      expression: expr,
                      line: idToken.line
                 });
             }
          }
          
          this.consume(TokenType.RParen);
          this.consume(TokenType.SemiColon);
          
          if (statements.length === 1) return statements[0];
          return {
              type: 'BlockStatement',
              body: statements
          };
       }

       // Special handling for scanf
       if (idToken.value === 'scanf') {
          this.advance();
          this.consume(TokenType.LParen);
          this.parseExpression(); // format string (ignore)
          
          const statements: Statement[] = [];
          while (this.match(TokenType.Comma)) {
              this.advance();
              if (this.match(TokenType.Ampersand)) {
                  this.advance();
              }
              const varToken = this.consume(TokenType.Identifier);
              statements.push({
                  type: 'ScanStatement',
                  variable: varToken.value,
                  line: varToken.line
              } as any);
          }
          this.consume(TokenType.RParen);
          this.consume(TokenType.SemiColon);
          
          if (statements.length === 1) return statements[0];
          return {
              type: 'BlockStatement',
              body: statements
          };
       }

       // Check for identifier++ or identifier--
       if (this.position + 1 < this.tokens.length) {
           const nextType = this.tokens[this.position + 1].type;
           if (nextType === TokenType.Increment || nextType === TokenType.Decrement) {
               const id = this.advance();
               const op = this.advance();
               // optional semicolon (for-loop update may or may not have it)
               if (this.match(TokenType.SemiColon)) this.advance();
               const opStr = op.type === TokenType.Increment ? '+' : '-';
               return {
                   type: 'Assignment',
                   identifier: id.value,
                   value: {
                       type: 'BinaryExpression',
                       left: { type: 'Identifier', name: id.value, line: id.line },
                       right: { type: 'NumericLiteral', value: 1, line: id.line },
                       operator: opStr,
                       line: id.line
                   } as BinaryExpression,
                   line: id.line
               } as Assignment;
           }
           
           // Compound assignments: +=, -=
           if (nextType === TokenType.PlusAssign || nextType === TokenType.MinusAssign) {
               const id = this.advance();
               const op = this.advance();
               const expr = this.parseExpression();
               this.consume(TokenType.SemiColon);
               const opStr = op.type === TokenType.PlusAssign ? '+' : '-';
               return {
                   type: 'Assignment',
                   identifier: id.value,
                   value: {
                       type: 'BinaryExpression',
                       left: { type: 'Identifier', name: id.value, line: id.line },
                       right: expr,
                       operator: opStr,
                       line: id.line
                   } as BinaryExpression,
                   line: id.line
               } as Assignment;
           }
       }
    }

    // Default to assignment: identifier = expression;
    const identifier = this.consume(TokenType.Identifier);
    this.consume(TokenType.Assign);
    const expression = this.parseExpression();
    this.consume(TokenType.SemiColon);

    return {
      type: 'Assignment',
      identifier: identifier.value,
      value: expression,
      line: identifier.line
    } as Assignment;
  }

  protected parseFunction(identifier: Token): FunctionDeclaration {
    this.consume(TokenType.LParen);
    // Skip function parameters (consume everything until RParen)
    let depth = 1;
    while (depth > 0 && !this.match(TokenType.EOF)) {
        if (this.match(TokenType.LParen)) depth++;
        if (this.match(TokenType.RParen)) depth--;
        if (depth > 0) this.advance();
    }
    this.consume(TokenType.RParen);
    const body = this.parseBlock();
    return {
      type: 'FunctionDeclaration',
      name: identifier.value,
      body,
      line: identifier.line
    };
  }

  protected parseBlock(): BlockStatement {
    const brace = this.consume(TokenType.LBrace);
    const body: Statement[] = [];
    while (!this.match(TokenType.RBrace) && !this.match(TokenType.EOF)) {
      body.push(this.parseStatement());
    }
    this.consume(TokenType.RBrace);
    return {
      type: 'BlockStatement',
      body,
      line: brace.line
    };
  }

  protected parseIf(): IfStatement {
    const token = this.consume(TokenType.If);
    this.consume(TokenType.LParen);
    const condition = this.parseExpression();
    this.consume(TokenType.RParen);
    const consequent = this.parseStatement();
    
    let alternate: Statement | undefined;
    if (this.match(TokenType.Else)) {
        this.advance();
        alternate = this.parseStatement();
    }
    
    return {
      type: 'IfStatement',
      condition,
      consequent,
      alternate,
      line: token.line
    } as any;
  }

  protected parseWhile(): WhileStatement {
    const token = this.consume(TokenType.While);
    this.consume(TokenType.LParen);
    const condition = this.parseExpression();
    this.consume(TokenType.RParen);
    const body = this.parseStatement();
    return {
      type: 'WhileStatement',
      condition,
      body,
      line: token.line
    };
  }

  protected parseFor(): ForStatement {
    const token = this.consume(TokenType.For);
    this.consume(TokenType.LParen);
    
    // Init: either a declaration or an assignment
    let init: Statement;
    if (this.isTypeKeyword()) {
      // e.g. int i = 0;
      const typeToken = this.advance();
      const id = this.consume(TokenType.Identifier);
      let initVal: Expression = { type: 'NumericLiteral', value: 0, line: id.line };
      if (this.match(TokenType.Assign)) {
          this.advance();
          initVal = this.parseExpression();
      }
      this.consume(TokenType.SemiColon);
      init = {
        type: 'VariableDeclaration',
        varType: typeToken.value,
        identifier: id.value,
        value: initVal,
        line: id.line
      } as VariableDeclaration;
    } else {
      // e.g. i = 0;
      const id = this.consume(TokenType.Identifier);
      this.consume(TokenType.Assign);
      const expr = this.parseExpression();
      this.consume(TokenType.SemiColon);
      init = {
        type: 'Assignment',
        identifier: id.value,
        value: expr,
        line: id.line
      } as Assignment;
    }
    
    // Condition
    const condition = this.parseExpression();
    this.consume(TokenType.SemiColon);
    
    // Update: handle i++, i--, i = expr, i += expr, etc.
    let update: Statement;
    const updateId = this.consume(TokenType.Identifier);
    
    if (this.match(TokenType.Increment)) {
      this.advance();
      update = {
        type: 'Assignment',
        identifier: updateId.value,
        value: {
          type: 'BinaryExpression',
          left: { type: 'Identifier', name: updateId.value, line: updateId.line },
          right: { type: 'NumericLiteral', value: 1, line: updateId.line },
          operator: '+',
          line: updateId.line
        } as BinaryExpression,
        line: updateId.line
      } as Assignment;
    } else if (this.match(TokenType.Decrement)) {
      this.advance();
      update = {
        type: 'Assignment',
        identifier: updateId.value,
        value: {
          type: 'BinaryExpression',
          left: { type: 'Identifier', name: updateId.value, line: updateId.line },
          right: { type: 'NumericLiteral', value: 1, line: updateId.line },
          operator: '-',
          line: updateId.line
        } as BinaryExpression,
        line: updateId.line
      } as Assignment;
    } else if (this.match(TokenType.PlusAssign)) {
      this.advance();
      const expr = this.parseExpression();
      update = {
        type: 'Assignment',
        identifier: updateId.value,
        value: {
          type: 'BinaryExpression',
          left: { type: 'Identifier', name: updateId.value, line: updateId.line },
          right: expr,
          operator: '+',
          line: updateId.line
        } as BinaryExpression,
        line: updateId.line
      } as Assignment;
    } else if (this.match(TokenType.MinusAssign)) {
      this.advance();
      const expr = this.parseExpression();
      update = {
        type: 'Assignment',
        identifier: updateId.value,
        value: {
          type: 'BinaryExpression',
          left: { type: 'Identifier', name: updateId.value, line: updateId.line },
          right: expr,
          operator: '-',
          line: updateId.line
        } as BinaryExpression,
        line: updateId.line
      } as Assignment;
    } else {
      // id = expr
      this.consume(TokenType.Assign);
      const expr = this.parseExpression();
      update = {
        type: 'Assignment',
        identifier: updateId.value,
        value: expr,
        line: updateId.line
      } as Assignment;
    }
    
    this.consume(TokenType.RParen);
    const body = this.parseStatement();
    
    return {
      type: 'ForStatement',
      init,
      condition,
      update,
      body,
      line: token.line
    };
  }

  protected parseDoWhile(): WhileStatement {
    const token = this.consume(TokenType.Do);
    const body = this.parseStatement();
    this.consume(TokenType.While);
    this.consume(TokenType.LParen);
    const condition = this.parseExpression();
    this.consume(TokenType.RParen);
    this.consume(TokenType.SemiColon);
    // Represent do-while as while (the body executes at least once, but for visualization we treat it as while)
    return {
      type: 'WhileStatement',
      condition,
      body,
      line: token.line
    };
  }

  protected parseReturn(): ReturnStatement {
    const token = this.consume(TokenType.Return);
    let argument: Expression = { type: 'NumericLiteral', value: 0, line: token.line };
    if (!this.match(TokenType.SemiColon)) {
      argument = this.parseExpression();
    }
    this.consume(TokenType.SemiColon);
    return {
      type: 'ReturnStatement',
      argument,
      line: token.line
    };
  }

  protected parseExpression(): Expression {
    return this.parseLogicalOr();
  }

  protected parseLogicalOr(): Expression {
    let left = this.parseLogicalAnd();
    while (this.match(TokenType.LogicalOr)) {
      const operator = this.advance().value;
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryExpression', left, right, operator } as BinaryExpression;
    }
    return left;
  }

  protected parseLogicalAnd(): Expression {
    let left = this.parseEquality();
    while (this.match(TokenType.LogicalAnd)) {
      const operator = this.advance().value;
      const right = this.parseEquality();
      left = { type: 'BinaryExpression', left, right, operator } as BinaryExpression;
    }
    return left;
  }

  protected parseEquality(): Expression {
    let left = this.parseRelational();

    while (this.match(TokenType.Eq) || this.match(TokenType.Neq)) {
      const operator = this.advance().value;
      const right = this.parseRelational();
      left = {
        type: 'BinaryExpression',
        left,
        right,
        operator
      } as BinaryExpression;
    }

    return left;
  }

  protected parseRelational(): Expression {
    let left = this.parseAdditive();

    while (this.match(TokenType.LessThan) || this.match(TokenType.GreaterThan) ||
           this.match(TokenType.LessEq) || this.match(TokenType.GreaterEq)) {
      const operator = this.advance().value;
      const right = this.parseAdditive();
      left = {
        type: 'BinaryExpression',
        left,
        right,
        operator
      } as BinaryExpression;
    }

    return left;
  }

  protected parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.match(TokenType.Plus) || this.match(TokenType.Minus)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = {
        type: 'BinaryExpression',
        left,
        right,
        operator
      } as BinaryExpression;
    }

    return left;
  }

  protected parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.match(TokenType.Multiply) || this.match(TokenType.Divide) || this.match(TokenType.Modulo)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = {
        type: 'BinaryExpression',
        left,
        right,
        operator
      } as BinaryExpression;
    }

    return left;
  }

  protected parseUnary(): Expression {
    // Handle unary minus: -expr
    if (this.match(TokenType.Minus)) {
      this.advance();
      const operand = this.parsePrimary();
      return {
        type: 'BinaryExpression',
        left: { type: 'NumericLiteral', value: 0 } as any,
        right: operand,
        operator: '-'
      } as BinaryExpression;
    }
    // Handle logical NOT: !expr
    if (this.match(TokenType.Not)) {
      this.advance();
      const operand = this.parsePrimary();
      return {
        type: 'BinaryExpression',
        left: operand,
        right: { type: 'NumericLiteral', value: 0 } as any,
        operator: '=='
      } as BinaryExpression;
    }
    // Handle prefix ++/-- on expressions
    if (this.match(TokenType.Increment) || this.match(TokenType.Decrement)) {
      const op = this.advance();
      const id = this.consume(TokenType.Identifier);
      const opStr = op.type === TokenType.Increment ? '+' : '-';
      return {
        type: 'BinaryExpression',
        left: { type: 'Identifier', name: id.value, line: id.line },
        right: { type: 'NumericLiteral', value: 1, line: id.line },
        operator: opStr
      } as BinaryExpression;
    }
    return this.parsePrimary();
  }

  protected parsePrimary(): Expression {
    if (this.match(TokenType.Number)) {
      const token = this.advance();
      return {
        type: 'NumericLiteral',
        value: parseFloat(token.value),
        line: token.line
      };
    }

    if (this.match(TokenType.String)) {
      const token = this.advance();
      return {
        type: 'StringLiteral',
        value: token.value,
        line: token.line
      };
    }

    if (this.match(TokenType.Identifier)) {
      const token = this.advance();
      
      // Check for postfix ++ / -- in expressions
      if (this.match(TokenType.Increment) || this.match(TokenType.Decrement)) {
        // Don't consume — keep it for later. Just return the identifier.
        // The post-increment semantics is complex; for the visualizer, just treat as the identifier value.
      }
      
      // Check for function call: id(...)
      if (this.match(TokenType.LParen)) {
        this.advance(); // consume (
        // Skip arguments
        let depth = 1;
        while (depth > 0 && !this.match(TokenType.EOF)) {
          if (this.match(TokenType.LParen)) depth++;
          if (this.match(TokenType.RParen)) depth--;
          if (depth > 0) this.advance();
        }
        this.consume(TokenType.RParen);
        // Return as identifier (function return value)
        return {
          type: 'Identifier',
          name: token.value,
          line: token.line
        };
      }
      
      return {
        type: 'Identifier',
        name: token.value,
        line: token.line
      };
    }

    if (this.match(TokenType.LParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.consume(TokenType.RParen);
      return expr;
    }
    
    // Handle type casts like (int)expr
    if (this.isTypeKeyword()) {
      this.advance(); // skip type keyword
      return this.parsePrimary();
    }

    const current = this.tokens[this.position];
    throw new Error(`Unexpected token at line ${current?.line || '?'}: ${current?.type} (${current?.value})`);
  }

  protected match(type: TokenType | string): boolean {
    if (this.position >= this.tokens.length) return false;
    return this.tokens[this.position].type === type;
  }

  protected consume(type: TokenType | string): Token {
    if (this.match(type)) {
      return this.advance();
    }
    const current = this.tokens[this.position];
    throw new Error(`Expected ${type} but found ${current?.type} at line ${current?.line}`);
  }

  protected advance(): Token {
    return this.tokens[this.position++];
  }

  protected isTypeKeyword(): boolean {
    if (this.position >= this.tokens.length) return false;
    const type = this.tokens[this.position].type;
    return (
      type === TokenType.Int || 
      type === TokenType.Float || 
      type === TokenType.Double || 
      type === TokenType.Char || 
      type === TokenType.Void ||
      type === TokenType.Long ||
      type === TokenType.Short ||
      type === TokenType.Signed || 
      type === TokenType.Unsigned 
    );
  }
}
