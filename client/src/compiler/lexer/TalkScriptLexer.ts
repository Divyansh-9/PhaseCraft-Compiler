export const TalkScriptTokenType = {
  // Structure Keywords
  Begin: 'Begin',
  End: 'End',
  Program: 'Program',

  // Variable & Type Keywords
  Create: 'Create',
  Variable: 'Variable',
  NumberKeyword: 'NumberKeyword',
  Function: 'Function',

  // Assignment Keywords
  Set: 'Set',
  To: 'To',
  As: 'As',
  Equal: 'Equal',

  // Arithmetic Keywords
  Add: 'Add',
  Subtract: 'Subtract',
  Multiply: 'Multiply',
  Divide: 'Divide',
  From: 'From',
  By: 'By',
  Plus: 'Plus',
  Minus: 'Minus',

  // I/O Keywords
  Display: 'Display',
  Show: 'Show',
  Print: 'Print',
  Store: 'Store',

  // Control Flow Keywords
  If: 'If',
  Then: 'Then',
  Otherwise: 'Otherwise',
  Else: 'Else',
  While: 'While',
  Repeat: 'Repeat',
  Times: 'Times',

  // Logic & Comparison Keywords
  Is: 'Is',
  Greater: 'Greater',
  Less: 'Less',
  Than: 'Than',
  Not: 'Not',
  And: 'And',
  Or: 'Or',

  // Container Keywords
  In: 'In',
  Into: 'Into',
  Result: 'Result',
  Call: 'Call',
  With: 'With',
  Return: 'Return',

  // Identifiers & Literals
  Identifier: 'Identifier',
  Number: 'Number',
  String: 'String',

  // Operators (symbolic fallback)
  Assign: 'Assign',
  PlusOp: 'PlusOp',
  MinusOp: 'MinusOp',
  MultiplyOp: 'MultiplyOp',
  DivideOp: 'DivideOp',
  GreaterThan: 'GreaterThan',
  LessThan: 'LessThan',
  EqualOp: 'EqualOp',
  NotEqualOp: 'NotEqualOp',
  LParen: 'LParen',
  RParen: 'RParen',

  // Separators
  Newline: 'Newline',
  EOF: 'EOF',
  Unknown: 'Unknown'
} as const;

export type TalkScriptTokenType = typeof TalkScriptTokenType[keyof typeof TalkScriptTokenType];

export interface Token {
  type: TalkScriptTokenType;
  value: string;
  line: number;
  column: number;
}

export class TalkScriptLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.position = 0;
    this.line = 1;
    this.column = 1;

    const tokens: Token[] = [];
    let token = this.nextToken();
    while (token.type !== TalkScriptTokenType.EOF) {
      // Skip consecutive newlines
      if (token.type === TalkScriptTokenType.Newline) {
        if (tokens.length === 0 || tokens[tokens.length - 1].type === TalkScriptTokenType.Newline) {
          token = this.nextToken();
          continue;
        }
      }
      tokens.push(token);
      token = this.nextToken();
    }
    tokens.push(token);
    return tokens;
  }

  private nextToken(): Token {
    this.skipSpacesAndTabs();

    if (this.position >= this.input.length) {
      return this.createToken(TalkScriptTokenType.EOF, '');
    }

    const char = this.input[this.position];

    // Newline → statement boundary
    if (char === '\n') {
      const tok = this.createToken(TalkScriptTokenType.Newline, '\\n');
      this.position++;
      this.line++;
      this.column = 1;
      return tok;
    }

    if (char === '\r') {
      this.position++;
      return this.nextToken();
    }

    // String literals
    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(char)) {
      return this.readWord();
    }

    // Numbers (int and float)
    if (/[0-9]/.test(char)) {
      return this.readNumber();
    }

    // Multi-character operators
    if (char === '!' && this.peek() === '=') {
      const tok = this.createToken(TalkScriptTokenType.NotEqualOp, '!=');
      this.position += 2;
      this.column += 2;
      return tok;
    }
    if (char === '=' && this.peek() === '=') {
      const tok = this.createToken(TalkScriptTokenType.EqualOp, '==');
      this.position += 2;
      this.column += 2;
      return tok;
    }

    // Single character operators
    switch (char) {
      case '+': return this.advanceSingle(TalkScriptTokenType.PlusOp, char);
      case '-': return this.advanceSingle(TalkScriptTokenType.MinusOp, char);
      case '*': return this.advanceSingle(TalkScriptTokenType.MultiplyOp, char);
      case '/': return this.advanceSingle(TalkScriptTokenType.DivideOp, char);
      case '=': return this.advanceSingle(TalkScriptTokenType.Assign, char);
      case '>': return this.advanceSingle(TalkScriptTokenType.GreaterThan, char);
      case '<': return this.advanceSingle(TalkScriptTokenType.LessThan, char);
      case '(': return this.advanceSingle(TalkScriptTokenType.LParen, char);
      case ')': return this.advanceSingle(TalkScriptTokenType.RParen, char);
    }

    // Skip unknown, advance
    const tok = this.createToken(TalkScriptTokenType.Unknown, char);
    this.position++;
    this.column++;
    return tok;
  }

  private skipSpacesAndTabs() {
    while (this.position < this.input.length) {
      const c = this.input[this.position];
      if (c === ' ' || c === '\t') {
        this.position++;
        this.column++;
      } else {
        break;
      }
    }
  }

  private readWord(): Token {
    const startCol = this.column;
    const startPos = this.position;

    while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
      this.position++;
      this.column++;
    }

    const value = this.input.slice(startPos, this.position);
    const type = this.getKeywordType(value);
    return { type, value, line: this.line, column: startCol };
  }

  private readNumber(): Token {
    const startCol = this.column;
    const startPos = this.position;

    while (this.position < this.input.length && /[0-9]/.test(this.input[this.position])) {
      this.position++;
      this.column++;
    }

    // Decimal part
    if (this.position < this.input.length && this.input[this.position] === '.') {
      this.position++;
      this.column++;
      while (this.position < this.input.length && /[0-9]/.test(this.input[this.position])) {
        this.position++;
        this.column++;
      }
    }

    const value = this.input.slice(startPos, this.position);
    return { type: TalkScriptTokenType.Number, value, line: this.line, column: startCol };
  }

  private readString(quote: string): Token {
    const startCol = this.column;
    this.position++; // skip opening quote
    this.column++;

    let value = '';
    while (this.position < this.input.length && this.input[this.position] !== quote) {
      if (this.input[this.position] === '\\' && this.position + 1 < this.input.length) {
        // Escape sequences
        this.position++;
        this.column++;
        const esc = this.input[this.position];
        if (esc === 'n') value += '\n';
        else if (esc === 't') value += '\t';
        else if (esc === '\\') value += '\\';
        else if (esc === quote) value += quote;
        else value += esc;
      } else {
        value += this.input[this.position];
      }
      this.position++;
      this.column++;
    }

    if (this.position < this.input.length) {
      this.position++; // skip closing quote
      this.column++;
    }

    return { type: TalkScriptTokenType.String, value, line: this.line, column: startCol };
  }

  private advanceSingle(type: TalkScriptTokenType, value: string): Token {
    const tok = this.createToken(type, value);
    this.position++;
    this.column++;
    return tok;
  }

  private createToken(type: TalkScriptTokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column };
  }

  private peek(): string {
    if (this.position + 1 >= this.input.length) return '';
    return this.input[this.position + 1];
  }

  private getKeywordType(value: string): TalkScriptTokenType {
    switch (value.toLowerCase()) {
      // Structure
      case 'begin': return TalkScriptTokenType.Begin;
      case 'end': return TalkScriptTokenType.End;
      case 'program': return TalkScriptTokenType.Program;

      // Variable & Types
      case 'create': return TalkScriptTokenType.Create;
      case 'variable': return TalkScriptTokenType.Variable;
      case 'number': return TalkScriptTokenType.NumberKeyword;
      case 'function': return TalkScriptTokenType.Function;

      // Assignment
      case 'set': return TalkScriptTokenType.Set;
      case 'to': return TalkScriptTokenType.To;
      case 'as': return TalkScriptTokenType.As;
      case 'equal': return TalkScriptTokenType.Equal;

      // Arithmetic words
      case 'add': return TalkScriptTokenType.Add;
      case 'subtract': return TalkScriptTokenType.Subtract;
      case 'multiply': return TalkScriptTokenType.Multiply;
      case 'divide': return TalkScriptTokenType.Divide;
      case 'from': return TalkScriptTokenType.From;
      case 'by': return TalkScriptTokenType.By;
      case 'plus': return TalkScriptTokenType.Plus;
      case 'minus': return TalkScriptTokenType.Minus;

      // I/O
      case 'display': return TalkScriptTokenType.Display;
      case 'show': return TalkScriptTokenType.Show;
      case 'print': return TalkScriptTokenType.Print;
      case 'store': return TalkScriptTokenType.Store;

      // Control Flow
      case 'if': return TalkScriptTokenType.If;
      case 'then': return TalkScriptTokenType.Then;
      case 'otherwise': return TalkScriptTokenType.Otherwise;
      case 'else': return TalkScriptTokenType.Else;
      case 'while': return TalkScriptTokenType.While;
      case 'repeat': return TalkScriptTokenType.Repeat;
      case 'times': return TalkScriptTokenType.Times;

      // Comparison & Logic
      case 'is': return TalkScriptTokenType.Is;
      case 'greater': return TalkScriptTokenType.Greater;
      case 'less': return TalkScriptTokenType.Less;
      case 'than': return TalkScriptTokenType.Than;
      case 'not': return TalkScriptTokenType.Not;
      case 'and': return TalkScriptTokenType.And;
      case 'or': return TalkScriptTokenType.Or;

      // Container/Misc
      case 'in': return TalkScriptTokenType.In;
      case 'into': return TalkScriptTokenType.Into;
      case 'result': return TalkScriptTokenType.Result;
      case 'call': return TalkScriptTokenType.Call;
      case 'with': return TalkScriptTokenType.With;
      case 'return': return TalkScriptTokenType.Return;

      default: return TalkScriptTokenType.Identifier;
    }
  }
}
