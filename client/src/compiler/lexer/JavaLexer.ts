import { Lexer, TokenType } from './Lexer';
import type { Token } from './Lexer';

export const JavaTokenType = {
  ...TokenType,
  Public: 'Public',
  Class: 'Class',
  Static: 'Static',
  System: 'System',
  Dot: 'Dot',
  Out: 'Out',
  Println: 'Println',
  Print: 'Print', // Used for System.out.print
  StringKey: 'StringKey', // String
  Args: 'Args',         // args (identifier but common in main)
  LBracket: 'LBracket', // [
  RBracket: 'RBracket', // ]
  Import: 'Import', // Import keyword
  Package: 'Package', // Package keyword
  New: 'New', // new keyword
  Scanner: 'Scanner', // Scanner class
  NextInt: 'NextInt', // nextInt method
  NextDouble: 'NextDouble', // nextDouble method
  NextLine: 'NextLine', // nextLine method
  Next: 'Next', // next method
} as const;

export class JavaLexer extends Lexer {
  constructor(input: string) {
    super(input);
  }

  protected override nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.input.length) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.input[this.position];

    if (char === '.') {
        return this.advancev(JavaTokenType.Dot, '.');
    }
    
    if (char === '[') {
        return this.advancev(JavaTokenType.LBracket, '[');
    }
    
    if (char === ']') {
        return this.advancev(JavaTokenType.RBracket, ']');
    }

    // Capture keywords before standard identifiers
    // We can do this by peeking the identifier, or letting super.nextToken read it and then transforming the type.
    // Transforming after read is easier than reimplementing readIdentifier.
    
    const token = super.nextToken();
    
    // Check keywords
    if (token.type === TokenType.Identifier) {
        switch (token.value) {
            case 'import': token.type = JavaTokenType.Import; break;
            case 'package': token.type = JavaTokenType.Package; break;
            case 'public': token.type = JavaTokenType.Public; break;
            case 'class': token.type = JavaTokenType.Class; break;
            case 'static': token.type = JavaTokenType.Static; break;
            case 'System': token.type = JavaTokenType.System; break;
            case 'out': token.type = JavaTokenType.Out; break;
            case 'println': token.type = JavaTokenType.Println; break;
            case 'print': token.type = JavaTokenType.Print; break;
            case 'String': token.type = JavaTokenType.StringKey; break;
            case 'args': token.type = JavaTokenType.Args; break;
            case 'new': token.type = JavaTokenType.New; break;
            case 'Scanner': token.type = JavaTokenType.Scanner; break;
            case 'nextInt': token.type = JavaTokenType.NextInt; break;
            case 'nextDouble': token.type = JavaTokenType.NextDouble; break;
            case 'nextLine': token.type = JavaTokenType.NextLine; break;
            case 'next': token.type = JavaTokenType.Next; break;
        }
    }
    
    return token;
  }
}
