import { Parser } from './Parser';
import { TokenType } from '../lexer/Lexer';
import type { Token } from '../lexer/Lexer';
import { CppTokenType } from '../lexer/CppLexer'; 
import type { Statement, PrintStatement } from './AST';

export class CppParser extends Parser {
  constructor(tokens: Token[]) {
    super(tokens);
  }

  protected override parseStatement(): Statement {
    // Check for using namespace std;
    if (this.match(CppTokenType.Using as TokenType)) {
        this.advance(); // consume using
        this.consume(CppTokenType.Namespace as TokenType);
        this.consume(CppTokenType.Std as TokenType);
        this.consume(TokenType.SemiColon);
        // Recursively parse next statement to ignore this one
        return this.parseStatement();
    }

    // Check for cin
    if (this.match(CppTokenType.Cin as TokenType)) {
        const cinToken = this.advance(); // consume cin
        const statements: Statement[] = [];
        
        while (this.match(CppTokenType.ShiftRight as TokenType)) {
             this.advance(); // consume >>
             const idToken = this.consume(TokenType.Identifier);
             statements.push({
                 type: 'ScanStatement',
                 variable: idToken.value,
                 line: idToken.line
             } as any);
        }
        
        this.consume(TokenType.SemiColon);
        
        if (statements.length === 1) return statements[0];
        if (statements.length === 0) return { type: 'BlockStatement', body: [] } as any; // Empty statement?
        
        return {
            type: 'BlockStatement',
            body: statements,
            line: cinToken.line
        } as any;
    }

    // Check for cout
    if (this.match(CppTokenType.Cout as TokenType)) {
        const printToken = this.advance(); // consume cout
        const statements: Statement[] = [];
        
        // Loop while we see <<
        while (this.match(CppTokenType.ShiftLeft as TokenType)) {
             this.advance(); // consume <<
             
             // Check if next is endl token
             if (this.match(CppTokenType.Endl as TokenType)) {
                  const endlToken = this.advance();
                  statements.push({
                      type: 'PrintStatement',
                      expression: { type: 'StringLiteral', value: '\\n', line: endlToken.line },
                      line: endlToken.line
                  } as PrintStatement);
             } else {
                  const expression = this.parseExpression();
                  statements.push({
                      type: 'PrintStatement',
                      expression,
                      line: printToken.line,
                  } as PrintStatement);
             }
        }
        
        this.consume(TokenType.SemiColon);
        
        if (statements.length === 1) return statements[0];
        if (statements.length === 0) return { type: 'BlockStatement', body: [] } as any;

        return {
            type: 'BlockStatement',
            body: statements,
            line: printToken.line
        } as any;
    }

    return super.parseStatement();
  }
}
