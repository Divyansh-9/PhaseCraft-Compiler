import React from 'react';
import { TokenType, type Token } from '../compiler/lexer/Lexer';
import { TalkScriptTokenType } from '../compiler/lexer/TalkScriptLexer';
import { CppTokenType } from '../compiler/lexer/CppLexer';
import { JavaTokenType } from '../compiler/lexer/JavaLexer';
import '../App.css';

interface LexerPhaseProps {
  tokens: Token[];
}

const CATEGORIES: Record<string, { title: string, color: string, types: (TokenType | string)[] }> = {
  KEYWORDS: { 
    title: 'Keywords', 
    color: 'purple', 
    types: [
      // C Keywords
      TokenType.Auto, TokenType.Break, TokenType.Case, TokenType.Char, TokenType.Const, 
      TokenType.Continue, TokenType.Default, TokenType.Do, TokenType.Double, 
      TokenType.Else, TokenType.Enum, TokenType.Extern, TokenType.Float, TokenType.For, 
      TokenType.Goto, TokenType.If, TokenType.Int, TokenType.Long, TokenType.Register, 
      TokenType.Return, TokenType.Short, TokenType.Signed, TokenType.Sizeof, 
      TokenType.Static, TokenType.Struct, TokenType.Switch, TokenType.Typedef, 
      TokenType.Union, TokenType.Unsigned, TokenType.Void, TokenType.Volatile, 
      TokenType.While, TokenType.Print,
      // TalkScript Structure Keywords
      TalkScriptTokenType.Begin, TalkScriptTokenType.End, TalkScriptTokenType.Program,
      // TalkScript Variable Keywords
      TalkScriptTokenType.Create, TalkScriptTokenType.Variable, TalkScriptTokenType.NumberKeyword,
      TalkScriptTokenType.Function,
      // TalkScript Assignment Keywords
      TalkScriptTokenType.Set, TalkScriptTokenType.To, TalkScriptTokenType.As, TalkScriptTokenType.Equal,
      // TalkScript Arithmetic Keywords
      TalkScriptTokenType.Add, TalkScriptTokenType.Subtract, TalkScriptTokenType.Multiply,
      TalkScriptTokenType.Divide, TalkScriptTokenType.From, TalkScriptTokenType.By,
      // TalkScript I/O Keywords
      TalkScriptTokenType.Display, TalkScriptTokenType.Show, TalkScriptTokenType.Print,
      TalkScriptTokenType.Store,
      // TalkScript Control Flow
      TalkScriptTokenType.If, TalkScriptTokenType.Then, TalkScriptTokenType.Otherwise,
      TalkScriptTokenType.Else, TalkScriptTokenType.While, TalkScriptTokenType.Repeat,
      TalkScriptTokenType.Times,
      // TalkScript Logic
      TalkScriptTokenType.Is, TalkScriptTokenType.Greater, TalkScriptTokenType.Less,
      TalkScriptTokenType.Than, TalkScriptTokenType.Not, TalkScriptTokenType.And,
      TalkScriptTokenType.Or,
      // TalkScript Container
      TalkScriptTokenType.In, TalkScriptTokenType.Into, TalkScriptTokenType.Result,
      TalkScriptTokenType.Call, TalkScriptTokenType.With, TalkScriptTokenType.Return,
      // C++ Keywords
      CppTokenType.Using, CppTokenType.Namespace, CppTokenType.Std,
      // Java Keywords
      JavaTokenType.Public, JavaTokenType.Class, JavaTokenType.Static,
      JavaTokenType.Import, JavaTokenType.Package, JavaTokenType.New,
    ] 
  },
  IDENTIFIERS: { 
    title: 'Identifiers', 
    color: 'blue', 
    types: [
      TokenType.Identifier, TalkScriptTokenType.Identifier,
      // C++ Identifiers
      CppTokenType.Cout, CppTokenType.Cin, CppTokenType.Endl,
      // Java Identifiers/Common Classes
      JavaTokenType.System, JavaTokenType.Out, JavaTokenType.Println,
      JavaTokenType.Print, JavaTokenType.StringKey, JavaTokenType.Args,
      JavaTokenType.Scanner, JavaTokenType.NextInt, JavaTokenType.NextDouble,
      JavaTokenType.NextLine, JavaTokenType.Next,
    ] 
  },
  OPERATORS: { 
    title: 'Operators', 
    color: 'orange', 
    types: [
      TokenType.Plus, TokenType.Minus, TokenType.Multiply, TokenType.Divide, TokenType.Assign, 
      TokenType.LessThan, TokenType.GreaterThan,
      // TalkScript word operators
      TalkScriptTokenType.Plus, TalkScriptTokenType.Minus,
      // TalkScript symbolic operators
      TalkScriptTokenType.PlusOp, TalkScriptTokenType.MinusOp, TalkScriptTokenType.MultiplyOp,
      TalkScriptTokenType.DivideOp, TalkScriptTokenType.Assign, TalkScriptTokenType.GreaterThan,
      TalkScriptTokenType.LessThan, TalkScriptTokenType.EqualOp, TalkScriptTokenType.NotEqualOp,
      // C++ Operators
      CppTokenType.ShiftLeft, CppTokenType.ShiftRight,
    ] 
  },
  SEPARATORS: { 
    title: 'Separators', 
    color: 'gray', 
    types: [
      TokenType.SemiColon, TokenType.LParen, TokenType.RParen, TokenType.LBrace, TokenType.RBrace, TokenType.EOF,
      TokenType.Colon, TokenType.ColonColon,
      TalkScriptTokenType.Newline, TalkScriptTokenType.EOF,
      TalkScriptTokenType.LParen, TalkScriptTokenType.RParen,
      // Java Separators
      JavaTokenType.Dot, JavaTokenType.LBracket, JavaTokenType.RBracket,
    ] 
  },
  NUMBERS: { title: 'Constants', color: 'green', types: [TokenType.Number, TalkScriptTokenType.Number] },
  STRINGS: { title: 'Strings', color: 'green', types: [TokenType.String, TalkScriptTokenType.String] },
};

const LexerPhase: React.FC<LexerPhaseProps> = ({ tokens }) => {
  const tokenStats = React.useMemo(() => {
    const stats = new Map<string, { 
      value: string, 
      type: TokenType | string, 
      categoryTitle: string,
      categoryKey: string,
      count: number 
    }>();

    tokens.forEach(t => {
      const key = t.value || t.type;
      
      if (!stats.has(key)) {
        // @ts-ignore
        let catEntry = Object.entries(CATEGORIES).find(([_, cat]) => cat.types.includes(t.type));
        
        // Fix overlap between operator names (Plus, Minus, Multiply, Divide) and TalkScript keywords
        if (catEntry && catEntry[0] === 'KEYWORDS' && ['+', '-', '*', '/'].includes(t.value)) {
           catEntry = Object.entries(CATEGORIES).find(([k, _]) => k === 'OPERATORS');
        }

        const categoryTitle = catEntry ? catEntry[1].title : 'Unknown';
        const categoryKey = catEntry ? catEntry[0] : 'UNKNOWN';

        stats.set(key, {
          value: t.value || (t.type === TokenType.EOF ? 'EOF' : ''),
          type: t.type,
          categoryTitle,
          categoryKey,
          count: 0
        });
      }
      
      stats.get(key)!.count++;
    });

    return Array.from(stats.values());
  }, [tokens]);

  const groupedStats = React.useMemo(() => {
    const groups: Record<string, typeof tokenStats> = {};
    Object.keys(CATEGORIES).forEach(k => groups[k] = []);
    groups['UNKNOWN'] = [];
    
    tokenStats.forEach(stat => {
      if (groups[stat.categoryKey]) {
        groups[stat.categoryKey].push(stat);
      } else {
        groups['UNKNOWN'].push(stat);
      }
    });
    return groups;
  }, [tokenStats]);

  return (
    <div className="phase-content fade-in">
      <div className="explanation-panel">
        <p>
          <strong>Lexical Analysis</strong> converts the character stream into tokens as shown below.
        </p>
      </div>

      {/* Unique Category Boxes */}
      <div className="lexer-cards-grid">
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const catStats = groupedStats[key];
          if (!catStats || catStats.length === 0) return null;

          return (
            <div key={key} className={`lexer-card border-${cat.color}`}>
              <div className={`card-header text-${cat.color}`}>{cat.title}</div>
              <div className="chip-container">
                {catStats.map((stat, idx) => (
                  <span key={idx} className={`token-chip bg-${cat.color}`} title={`Count: ${stat.count}`}>
                    {stat.value}
                    {stat.count > 1 && <span style={{opacity: 0.7, fontSize: '0.8em', marginLeft: '6px'}}>x{stat.count}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="table-container">
        <h3>Token Frequency Analysis</h3>
        <table className="lexer-table">
          <thead>
            <tr>
              <th>Unique Lexeme</th>
              <th>Token Type</th>
              <th>Category</th>
              <th style={{textAlign: 'center'}}>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {tokenStats.map((stat, idx) => (
              <tr key={idx} className="hover-row">
                <td className="font-mono" style={{color: 'var(--accent-primary)'}}>{stat.value}</td>
                <td className="font-mono text-dim"><code className="token-tag">{stat.type}</code></td>
                <td>
                  <span className={`cat-badge badge-${stat.categoryKey.toLowerCase()}`}>{stat.categoryTitle}</span>
                </td>
                <td style={{textAlign: 'center', fontWeight: 'bold'}}>{stat.count}</td>
              </tr>
            ))}
            {tokenStats.length === 0 && (
              <tr><td colSpan={4} style={{textAlign: 'center', color: '#666'}}>No tokens found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LexerPhase;
