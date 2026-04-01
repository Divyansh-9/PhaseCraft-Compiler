# PhaseCraft Compiler — Frontend

React + TypeScript + Vite interface for the PhaseCraft Compiler. It provides the in-browser compiler pipeline plus hooks into the native C backend exposed by the Express API.

## Key capabilities
- Monaco-based IDE with language selector (C, C++, Java, TalkScript) and voice input helper.
- In-browser compiler phases: lexer, parser, semantic analyzer, IR generator, optimizer, and code generator.
- Backend toggle to call the native `compiler.exe` through `/api/compile` for token/AST/assembly comparison.
- AI assistant panel for automated fixes and debugging guidance.

## Run (from repo root)
- Install deps: `npm run install-all`
- Start dev: `npm run start`
- Open http://localhost:5173 (API runs on 3001). The app checks `/api/health` automatically.

## Build-only
- `cd client && npm run build`

See the root README for full project details and deployment notes.
