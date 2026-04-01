import { Parser } from './Parser';
import { TokenType } from '../lexer/Lexer';
import type { Token } from '../lexer/Lexer';
import { JavaTokenType } from '../lexer/JavaLexer';
import type { Statement, PrintStatement, FunctionDeclaration } from './AST';

export class JavaParser extends Parser {
  constructor(tokens: Token[]) {
    super(tokens);
  }

  // Java structure is Class -> Methods.
  // We need to override the main loop or parseStatement to handle Class wrapper.
  // Since the base Parser expects a list of Statements (which includes Functions),
  // we can treat the Class wrapper as a container that we just peel off?
  // Or we can parse the Class as a BlockStatement?
  
  // Actually, standard Java is `public class Main { ... }`.
  // If we just parse `public class Main` and then a Block, we can return the body of the class as the Program body?
  // Or we modify what `parse` does.

  public override parse(): any {
    const program = {
      type: 'Program',
      body: [] as Statement[]
    };
    
    // Handle imports/packages (Java specific header)
    while (this.match(JavaTokenType.Import as TokenType) || this.match(JavaTokenType.Package as TokenType)) {
        // Skip until semicolon
        while (!this.match(TokenType.SemiColon) && !this.match(TokenType.EOF)) {
            this.advance();
        }
        if (this.match(TokenType.SemiColon)) this.consume(TokenType.SemiColon);
    }

    // Handle Class Declaration
    if (this.match(JavaTokenType.Public as TokenType) || this.match(JavaTokenType.Class as TokenType)) {
        if (this.match(JavaTokenType.Public as TokenType)) this.consume(JavaTokenType.Public as TokenType);
        this.consume(JavaTokenType.Class as TokenType);
        this.consume(TokenType.Identifier); // Class Name
        this.consume(TokenType.LBrace);
        
        // Handle Class Body (Methods)
        while (!this.match(TokenType.RBrace) && !this.match(TokenType.EOF)) {
            // Check for main method: public static void main ...
            if (this.match(JavaTokenType.Public as TokenType)) {
                 this.consume(JavaTokenType.Public as TokenType);
                 this.consume(JavaTokenType.Static as TokenType);
                 this.consume(TokenType.Void as TokenType);
                 
                 // Check for 'main'
                 const mainToken = this.consume(TokenType.Identifier);
                 if (mainToken.value !== 'main') {
                     throw new Error("Only 'main' method is supported.");
                 }
                 
                 this.consume(TokenType.LParen);
                 // Arguments: String[] args
                 if (this.match(JavaTokenType.StringKey as TokenType)) {
                     this.advance();
                     this.consume(JavaTokenType.LBracket as TokenType); // [
                     this.consume(JavaTokenType.RBracket as TokenType); // ]
                     this.consume(JavaTokenType.Args as TokenType); // args
                 }
                 this.consume(TokenType.RParen);
                 this.consume(TokenType.LBrace);
                 
                 // Main method body - statements
                 while (!this.match(TokenType.RBrace) && !this.match(TokenType.EOF)) {
                     program.body.push(this.parseStatement());
                 }
                 this.consume(TokenType.RBrace); // End of main
            } else {
                 throw new Error("Only 'public static void main' is supported inside class.");
            }
        }
        this.consume(TokenType.RBrace); // End of Class
    } else {
        // If no class wrapper, maybe just statements (unlikely for Java but fallback)
        while (this.position < this.tokens.length && this.tokens[this.position].type !== TokenType.EOF) {
           program.body.push(this.parseStatement());
        }
    }
    
    return program;
  }

  protected override parseStatement(): Statement {
    // System.out.println
    if (this.match(JavaTokenType.System as TokenType)) {
        const sysToken = this.advance();
        if (this.match(JavaTokenType.Dot as TokenType)) {
            this.consume(JavaTokenType.Dot as TokenType);
            this.consume(JavaTokenType.Out as TokenType);
            this.consume(JavaTokenType.Dot as TokenType);
            
            let isPrintln = true;
            if (this.match(JavaTokenType.Print as TokenType)) {
                isPrintln = false;
                this.advance();
            } else if (this.match(JavaTokenType.Println as TokenType)) {
                this.advance();
            } else {
                throw new Error("Expected print or println");
            }
            
            this.consume(TokenType.LParen);
            const expr = this.parseExpression();
            this.consume(TokenType.RParen);
            this.consume(TokenType.SemiColon);
            
            return {
                type: 'PrintStatement',
                expression: expr,
                line: sysToken.line
            } as PrintStatement;
        }
    }
    
    // Scanner sc = new Scanner(System.in);
    if (this.match(JavaTokenType.Scanner as TokenType)) {
        const scannerToken = this.advance();
        const id = this.consume(TokenType.Identifier);
        this.consume(TokenType.Assign);
        this.consume(JavaTokenType.New as TokenType);
        this.consume(JavaTokenType.Scanner as TokenType);
        this.consume(TokenType.LParen);
        // System.in (ignore or consume)
        if (this.match(JavaTokenType.System as TokenType)) {
             this.advance();
             this.consume(JavaTokenType.Dot as TokenType);
             // assume 'in' follows but we don't have In in TokenType, it's Identifier 'in'
             this.consume(TokenType.Identifier); 
        }
        this.consume(TokenType.RParen);
        this.consume(TokenType.SemiColon);
        
        return {
            type: 'VariableDeclaration',
            varType: 'Scanner',
            identifier: id.value,
            value: { type: 'NumericLiteral', value: 0 }, 
            line: scannerToken.line
        } as any;
    }

    return super.parseStatement();
  }

  protected override parsePrimary(): any {
      // Check for Identifier.method() -> Scanner access
      if (this.match(TokenType.Identifier)) {
          // Lookahead for dot
          if (this.position + 1 < this.tokens.length && this.tokens[this.position + 1].type === JavaTokenType.Dot) {
              const idToken = this.advance(); // id
              this.advance(); // dot
              
              // methods: nextInt, nextDouble, etc.
              let methodType = '';
              if (this.match(JavaTokenType.NextInt as TokenType)) {
                  methodType = 'ScannerInt';
                  this.advance();
              } else if (this.match(JavaTokenType.NextDouble as TokenType)) {
                  methodType = 'ScannerDouble';
                  this.advance();
              } else if (this.match(JavaTokenType.NextLine as TokenType)) {
                  methodType = 'ScannerString';
                  this.advance();
              } else if (this.match(JavaTokenType.Next as TokenType)) {
                  methodType = 'ScannerString';
                  this.advance();
              } else {
                  throw new Error(`Unsupported method call on object ${idToken.value}`);
              }
              
              this.consume(TokenType.LParen);
              this.consume(TokenType.RParen);
              
              return {
                  type: 'ScanExpression',
                  line: idToken.line
              };
          }
      }
      return super.parsePrimary();
  }
}
