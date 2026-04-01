import React, { useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
  onEditorInstance?: (editor: any) => void;
}

// TalkScript NLP auto-suggestion definitions
const TALKSCRIPT_SUGGESTIONS = [
  { label: 'begin program', insertText: 'begin program\n\nend program', detail: 'Start a new program block' },
  { label: 'create variable', insertText: 'create variable ${1:name} equal to ${2:0}', detail: 'Declare a new variable', insertTextRules: 4 },
  { label: 'create number', insertText: 'create number ${1:name} as ${2:0}', detail: 'Declare a numeric variable', insertTextRules: 4 },
  { label: 'create function', insertText: 'create function ${1:name}\n  ${2:// body}\nend function', detail: 'Define a new function', insertTextRules: 4 },
  { label: 'set to', insertText: 'set ${1:variable} to ${2:value}', detail: 'Assign a value to variable', insertTextRules: 4 },
  { label: 'add to', insertText: 'add ${1:value} to ${2:variable}', detail: 'Add value to variable', insertTextRules: 4 },
  { label: 'subtract from', insertText: 'subtract ${1:value} from ${2:variable}', detail: 'Subtract value from variable', insertTextRules: 4 },
  { label: 'multiply by', insertText: 'multiply ${1:variable} by ${2:value}', detail: 'Multiply variable by value', insertTextRules: 4 },
  { label: 'divide by', insertText: 'divide ${1:variable} by ${2:value}', detail: 'Divide variable by value', insertTextRules: 4 },
  { label: 'display', insertText: 'display ${1:expression}', detail: 'Output a value', insertTextRules: 4 },
  { label: 'show', insertText: 'show ${1:expression}', detail: 'Output a value (alias)', insertTextRules: 4 },
  { label: 'print', insertText: 'print ${1:expression}', detail: 'Output a value (alias)', insertTextRules: 4 },
  { label: 'if then', insertText: 'if ${1:condition} then\n  ${2:// body}\nend if', detail: 'Conditional statement', insertTextRules: 4 },
  { label: 'if then otherwise', insertText: 'if ${1:condition} then\n  ${2:// true body}\notherwise\n  ${3:// false body}\nend if', detail: 'If-else statement', insertTextRules: 4 },
  { label: 'repeat times', insertText: 'repeat ${1:5} times\n  ${2:// body}\nend repeat', detail: 'Repeat N times loop', insertTextRules: 4 },
  { label: 'while', insertText: 'while ${1:condition}\n  ${2:// body}\nend while', detail: 'While loop', insertTextRules: 4 },
  { label: 'store in', insertText: 'store ${1:value} in ${2:variable}', detail: 'Store a value in variable', insertTextRules: 4 },
  { label: 'greater than', insertText: 'greater than', detail: 'Comparison operator (>)' },
  { label: 'less than', insertText: 'less than', detail: 'Comparison operator (<)' },
  { label: 'equal to', insertText: 'equal to', detail: 'Comparison operator (==)' },
  { label: 'not equal to', insertText: 'not equal to', detail: 'Comparison operator (!=)' },
  { label: 'end program', insertText: 'end program', detail: 'End program block' },
  { label: 'end if', insertText: 'end if', detail: 'Close if statement' },
  { label: 'end repeat', insertText: 'end repeat', detail: 'Close repeat loop' },
  { label: 'end while', insertText: 'end while', detail: 'Close while loop' },
  { label: 'end function', insertText: 'end function', detail: 'Close function' },
];

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, readOnly = false, onEditorInstance }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monaco.editor.setTheme('compiler-dark');
    if (onEditorInstance) {
      onEditorInstance(editor);
    }
  };

  const handleEditorWillMount = useCallback((monaco: any) => {
    const languages = monaco.languages.getLanguages();
    if (!languages.some((l: any) => l.id === 'talkscript')) {
      monaco.languages.register({ id: 'talkscript' });
      
      monaco.languages.setMonarchTokensProvider('talkscript', {
        tokenizer: {
          root: [
            // NLP keywords (comprehensive list)
            [/\b(create|variable|number|function|set|to|as|equal|add|subtract|multiply|divide|from|by|plus|minus)\b/, 'keyword'],
            [/\b(display|show|print|store|into|in|result|call|with|return)\b/, 'keyword'],
            [/\b(if|then|otherwise|else|while|repeat|times|end|begin|program)\b/, 'keyword.control'],
            [/\b(is|greater|less|than|not|and|or)\b/, 'keyword.operator'],
            [/[a-zA-Z_]\w*(?=\()/, 'function'],
            [/\d+\.?\d*/, 'number'],
            [/"[^"]*"/, 'string'],
            [/'[^']*'/, 'string'],
            [/[=+\-*/><!&|]/, 'operator'],
            [/[;{}(),.]/, 'delimiter'],
            [/\/\/.*$/, 'comment'],
            [/#.*$/, 'comment'],
            [/[a-zA-Z_]\w*/, 'identifier'],
          ]
        }
      });

      monaco.editor.defineTheme('compiler-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },
          { token: 'keyword.operator', foreground: 'D19A66', fontStyle: 'bold' },
          { token: 'identifier', foreground: 'D4D4D4' },
          { token: 'number', foreground: 'CE9178' },
          { token: 'string', foreground: '6A9955' },
          { token: 'operator', foreground: 'C586C0' },
          { token: 'delimiter', foreground: 'DCDCAA' },
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'function', foreground: '4EC9B0' },
        ],
        colors: {
          'editor.background': '#1E1E1E',
          'editor.foreground': '#D4D4D4',
          'editorCursor.foreground': '#FFFFFF',
          'editor.lineHighlightBackground': '#2D2D30',
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': '#264F78',
          'editor.inactiveSelectionBackground': '#3A3D41'
        }
      });

      // Register auto-suggestions for TalkScript
      monaco.languages.registerCompletionItemProvider('talkscript', {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = TALKSCRIPT_SUGGESTIONS.map((s) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: (s as any).insertTextRules || monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: s.detail,
            range: range,
          }));

          return { suggestions };
        },
        triggerCharacters: ['c', 's', 'a', 'd', 'i', 'r', 'w', 'm', 'p', 'e', 'b', 'g', 'l', 'n', 'f', 'o']
      });
    }
  }, []);

  const options = useMemo(() => ({
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
    fontLigatures: true,
    automaticLayout: true,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    smoothScrolling: true,
    contextmenu: true,
    formatOnPaste: true,
    formatOnType: true,
    readOnly: readOnly,
    lineNumbers: 'on' as const,
    renderLineHighlight: 'all' as const,
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: 'always' as const,
    padding: { top: 10, bottom: 10 },
    suggest: {
      showSnippets: true,
      snippetsPreventQuickSuggestions: false,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false
    }
  }), [readOnly]);

  const monacoLanguage = useMemo(() => {
    switch(language) {
      case 'C': return 'c';
      case 'CPP': return 'cpp';
      case 'Java': return 'java';
      case 'TalkScript': return 'talkscript';
      default: return 'c';
    }
  }, [language]);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid #333', position: 'relative', backgroundColor: '#1E1E1E' }}>
      <Editor
        height="100%"
        width="100%"
        language={monacoLanguage}
        value={code}
        theme="compiler-dark"
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={onChange}
        loading={
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            <span>Initializing Editor...</span>
          </div>
        }
        options={options}
      />
    </div>
  );
};

export default CodeEditor;