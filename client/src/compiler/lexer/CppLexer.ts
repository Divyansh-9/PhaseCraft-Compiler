import { Lexer, TokenType } from './Lexer';
import type { Token } from './Lexer';

export const CppTokenType = {
  ...TokenType,
  Cout: 'Cout',
  Cin: 'Cin',
  Endl: 'Endl',
  Using: 'Using',
  Namespace: 'Namespace',
  Std: 'Std',
  ShiftLeft: 'ShiftLeft', // <<
  ShiftRight: 'ShiftRight', // >>
} as const;

export class CppLexer extends Lexer {
  constructor(input: string) {
    super(input);
  }

  protected override nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return this.createToken(TokenType.EOF, '');
    }

    // Check for << before single characters
    if (this.input.startsWith('<<', this.position)) {
      const token = this.createToken(CppTokenType.ShiftLeft, '<<');
      this.position += 2;
      this.column += 2;
      return token;
    }

    // Check for >>
    if (this.input.startsWith('>>', this.position)) {
      const token = this.createToken(CppTokenType.ShiftRight, '>>');
      this.position += 2;
      this.column += 2;
      return token;
    }

    // Use base lexer for everything else
    const token = super.nextToken();
    
    // Check if identifier is 'cout' etc
    if (token.type === TokenType.Identifier) {
        switch (token.value) {
            case 'cout': token.type = CppTokenType.Cout; break;
            case 'cin': token.type = CppTokenType.Cin; break;
            case 'endl': token.type = CppTokenType.Endl; break;
            case 'using': token.type = CppTokenType.Using; break;
            case 'namespace': token.type = CppTokenType.Namespace; break;
            case 'std': token.type = CppTokenType.Std; break;
        }
    }
    
    return token;
  }
}
