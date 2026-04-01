export const TokenType = {
  Identifier: 'Identifier',
  Number: 'Number',
  Plus: 'Plus',
  Minus: 'Minus',
  Multiply: 'Multiply',
  Divide: 'Divide',
  Assign: 'Assign',
  SemiColon: 'SemiColon',
  LParen: 'LParen',
  RParen: 'RParen',
  LBrace: 'LBrace',
  RBrace: 'RBrace',
  LessThan: 'LessThan',
  LessEq: 'LessEq',
  GreaterThan: 'GreaterThan',
  GreaterEq: 'GreaterEq',
  Print: 'Print',
  String: 'String',
  Comma: 'Comma',
  Ampersand: 'Ampersand',
  Modulo: 'Modulo',
  Eq: 'Eq',
  Neq: 'Neq',
  LogicalAnd: 'LogicalAnd',   // &&
  LogicalOr: 'LogicalOr',     // ||
  Not: 'Not',                 // !
  Increment: 'Increment',     // ++
  Decrement: 'Decrement',     // --
  PlusAssign: 'PlusAssign',   // +=
  MinusAssign: 'MinusAssign', // -=
  // C Keywords
  Auto: 'Auto', Break: 'Break', Case: 'Case', Char: 'Char', Const: 'Const', 
  Continue: 'Continue', Default: 'Default', Do: 'Do', Double: 'Double', 
  Else: 'Else', Enum: 'Enum', Extern: 'Extern', Float: 'Float', For: 'For', 
  Goto: 'Goto', If: 'If', Int: 'Int', Long: 'Long', Register: 'Register', 
  Return: 'Return', Short: 'Short', Signed: 'Signed', Sizeof: 'Sizeof', 
  Static: 'Static', Struct: 'Struct', Switch: 'Switch', Typedef: 'Typedef', 
  Union: 'Union', Unsigned: 'Unsigned', Void: 'Void', Volatile: 'Volatile', 
  While: 'While',
  
  Colon: 'Colon',
  ColonColon: 'ColonColon',
  
  EOF: 'EOF',
  Unknown: 'Unknown'
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];

export interface Token {
  type: TokenType | string; // Allow string for extensibility with TalkScript
  value: string;
  line: number;
  column: number;
}

export class Lexer {
  protected input: string;
  protected position: number = 0;
  protected line: number = 1;
  protected column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    // Reset state
    this.position = 0;
    this.line = 1;
    this.column = 1;

    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token); // Push EOF
    return tokens;
  }

  protected nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.input[this.position];

    if (/[a-zA-Z]/.test(char)) {
      return this.readIdentifier();
    }

    if (/[0-9]/.test(char)) {
      return this.readNumber();
    }

    if (char === '"') {
      return this.readString();
    }

    if (char === '#') {
      // Preprocessor directive - skip until newline
      while (this.position < this.input.length && this.input[this.position] !== '\n') {
        this.position++;
      }
      return this.nextToken();
    }

    // Single-line comments //
    if (char === '/' && this.peek() === '/') {
      while (this.position < this.input.length && this.input[this.position] !== '\n') {
        this.position++;
      }
      return this.nextToken();
    }

    // Multi-line comments /* ... */
    if (char === '/' && this.peek() === '*') {
      this.position += 2;
      this.column += 2;
      while (this.position < this.input.length) {
        if (this.input[this.position] === '*' && this.position + 1 < this.input.length && this.input[this.position + 1] === '/') {
          this.position += 2;
          this.column += 2;
          break;
        }
        if (this.input[this.position] === '\n') { this.line++; this.column = 1; }
        else { this.column++; }
        this.position++;
      }
      return this.nextToken();
    }

    switch (char) {
      case '+': 
        if (this.peek() === '+') {
           const token = this.createToken(TokenType.Increment, '++');
           this.position += 2; this.column += 2;
           return token;
        }
        if (this.peek() === '=') {
           const token = this.createToken(TokenType.PlusAssign, '+=');
           this.position += 2; this.column += 2;
           return token;
        }
        return this.advancev(TokenType.Plus, char);
      case '-': 
        if (this.peek() === '-') {
           const token = this.createToken(TokenType.Decrement, '--');
           this.position += 2; this.column += 2;
           return token;
        }
        if (this.peek() === '=') {
           const token = this.createToken(TokenType.MinusAssign, '-=');
           this.position += 2; this.column += 2;
           return token;
        }
        return this.advancev(TokenType.Minus, char);
      case '*': return this.advancev(TokenType.Multiply, char);
      case '/': return this.advancev(TokenType.Divide, char);
      case '%': return this.advancev(TokenType.Modulo, char);
      case '=': 
        if (this.peek() === '=') {
           const token = this.createToken(TokenType.Eq, '==');
           this.position += 2;
           this.column += 2;
           return token;
        }
        return this.advancev(TokenType.Assign, char);
      case '!':
         if (this.peek() === '=') {
            const token = this.createToken(TokenType.Neq, '!=');
            this.position += 2;
            this.column += 2;
            return token;
         }
         return this.advancev(TokenType.Not, char);
      case '&':
         if (this.peek() === '&') {
            const token = this.createToken(TokenType.LogicalAnd, '&&');
            this.position += 2;
            this.column += 2;
            return token;
         }
         return this.advancev(TokenType.Ampersand, char);
      case '|':
         if (this.peek() === '|') {
            const token = this.createToken(TokenType.LogicalOr, '||');
            this.position += 2;
            this.column += 2;
            return token;
         }
         return this.advancev(TokenType.Unknown, char);
      case ';': return this.advancev(TokenType.SemiColon, char);
      case '(': return this.advancev(TokenType.LParen, char);
      case ')': return this.advancev(TokenType.RParen, char);
      case '{': return this.advancev(TokenType.LBrace, char);
      case '}': return this.advancev(TokenType.RBrace, char);
      case '<': 
        if (this.peek() === '=') {
           const token = this.createToken(TokenType.LessEq, '<=');
           this.position += 2;
           this.column += 2;
           return token;
        }
        return this.advancev(TokenType.LessThan, char);
      case '>': 
        if (this.peek() === '=') {
           const token = this.createToken(TokenType.GreaterEq, '>=');
           this.position += 2;
           this.column += 2;
           return token;
        }
        return this.advancev(TokenType.GreaterThan, char);
      case ',': return this.advancev(TokenType.Comma, char);
      case ':': 
        if (this.peek() === ':') {
           const token = this.createToken(TokenType.ColonColon, '::');
           this.position += 2;
           this.column += 2;
           return token;
        }
        return this.advancev(TokenType.Colon, char);
      default: return this.advancev(TokenType.Unknown, char);
    }
  }
  
  protected skipWhitespace() {
     while (this.position < this.input.length) {
       const char = this.input[this.position];
       if (char === ' ' || char === '\t') {
         this.position++;
         this.column++;
       } else if (char === '\n') {
         this.position++;
         this.line++;
         this.column = 1;
       } else if (char === '\r') {
         this.position++;
       } else {
         break;
       }
     }
  }
  
  protected createToken(type: TokenType | string, value: string): Token {
    return { type, value, line: this.line, column: this.column };
  }

  protected advancev(type: TokenType | string, value: string): Token {
    const token = this.createToken(type, value);
    this.position++;
    this.column++;
    return token;
  }

  protected readIdentifier(): Token {
    let value = '';
    const startColumn = this.column;
    
    while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
      this.column++;
    }
    
    let type: TokenType = TokenType.Identifier;
    switch (value) {
      case 'auto': type = TokenType.Auto; break;
      case 'break': type = TokenType.Break; break;
      case 'case': type = TokenType.Case; break;
      case 'char': type = TokenType.Char; break;
      case 'const': type = TokenType.Const; break;
      case 'continue': type = TokenType.Continue; break;
      case 'default': type = TokenType.Default; break;
      case 'do': type = TokenType.Do; break;
      case 'double': type = TokenType.Double; break;
      case 'else': type = TokenType.Else; break;
      case 'enum': type = TokenType.Enum; break;
      case 'extern': type = TokenType.Extern; break;
      case 'float': type = TokenType.Float; break;
      case 'for': type = TokenType.For; break;
      case 'goto': type = TokenType.Goto; break;
      case 'if': type = TokenType.If; break;
      case 'int': type = TokenType.Int; break;
      case 'long': type = TokenType.Long; break;
      case 'register': type = TokenType.Register; break;
      case 'return': type = TokenType.Return; break;
      case 'short': type = TokenType.Short; break;
      case 'signed': type = TokenType.Signed; break;
      case 'sizeof': type = TokenType.Sizeof; break;
      case 'static': type = TokenType.Static; break;
      case 'struct': type = TokenType.Struct; break;
      case 'switch': type = TokenType.Switch; break;
      case 'typedef': type = TokenType.Typedef; break;
      case 'union': type = TokenType.Union; break;
      case 'unsigned': type = TokenType.Unsigned; break;
      case 'void': type = TokenType.Void; break;
      case 'volatile': type = TokenType.Volatile; break;
      case 'while': type = TokenType.While; break;
      case 'print': type = TokenType.Print; break; // Existing custom keyword
    }

    // Adjust column for token creation to point to start
    const token = { type, value, line: this.line, column: startColumn };
    return token;
  }

  protected readNumber(): Token {
    let value = '';
    const startColumn = this.column;

    // Read integer part
    while (this.position < this.input.length && /[0-9]/.test(this.input[this.position])) {
      value += this.input[this.position];
      this.position++;
      this.column++;
    }

    // Read decimal part if present
    if (this.position < this.input.length && this.input[this.position] === '.') {
      value += '.';
      this.position++;
      this.column++;
      
      // Read fractional part
      while (this.position < this.input.length && /[0-9]/.test(this.input[this.position])) {
        value += this.input[this.position];
        this.position++;
        this.column++;
      }
    }

    return { type: TokenType.Number, value, line: this.line, column: startColumn };
  }

  protected readString(): Token {
    const startColumn = this.column;
    this.position++; // skip start quote
    this.column++;
    
    let value = '';
    while (this.position < this.input.length && this.input[this.position] !== '"') {
      const char = this.input[this.position];
      value += char;
      this.position++;
      this.column++;
      if (char === '\n') {
        this.line++;
        this.column = 1;
      }
    }
    
    if (this.position < this.input.length) {
      this.position++; // skip end quote
      this.column++;
    }

    return { type: TokenType.String, value, line: this.line, column: startColumn };
  }

  protected peek(): string {
     // Check if next char is within bounds
     if (this.position + 1 >= this.input.length) return '';
     return this.input[this.position + 1]; // Correct logic
  }
}
