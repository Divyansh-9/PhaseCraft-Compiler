# PhaseCraft Compiler

PhaseCraft Compiler is an end-to-end playground that turns natural-language style code into compiled output while visualizing every compiler phase. It pairs a React + Vite IDE with an Express API that shells out to a C backend compiler executable.

## What is integrated
- Frontend IDE with Monaco-based editor, voice input, and AI assistance for fixes and debugging.
- Full in-browser compiler pipeline (lexing, parsing, semantic analysis, IR, optimization, and codegen) for C, C++, Java, and TalkScript variants.
- Optional C backend executable (`compiler.exe`) invoked through the API for native tokenization, AST, and assembly generation.
- Express API server with `/api/health` and `/api/compile` to bridge the frontend and C backend.
- Concurrent dev workflow that boots the API and Vite dev server together.

## Repository layout
- client/ — React + TypeScript + Vite frontend (see [client/src/App.tsx](client/src/App.tsx)).
- server/ — Express middleware and process runner (see [server/index.js](server/index.js)).
- compiler_c/ — C implementation of lexer/parser/codegen and built `compiler.exe` binary.
- package.json — root scripts for installing deps and running both servers together.

## Quick start (dev)
1. Install Node.js 18+.
2. From the repo root, install everything:
   - `npm run install-all`
3. Start the API (3001) and Vite dev server (5173) together:
   - `npm run start`
4. Open http://localhost:5173 and compile sample code. The app will probe `/api/health`; toggle the C backend inside the UI when available.

## API surface
- GET `/api/health` — returns status plus the compiler path in use.
- POST `/api/compile` — body `{ code: string }`; streams code to `compiler.exe --json --stdin` and returns tokens/AST/assembly or an error payload.

## Frontend features
- Phase tabs for Lexer, Parser, Semantic, IR, Optimizer, and CodeGen visualizations.
- AI assistant panel integrated with Gemini-based helper for debugging suggestions.
- Voice input to insert text into the editor.
- Backend toggle to compare in-browser compilation with the native C pipeline.

## Backend and compiler notes
- The API assumes a Windows-compiled binary at `compiler_c/compiler.exe`; adjust `COMPILER_PATH` in [server/index.js](server/index.js) if relocating.
- To rebuild the compiler from source, use the Makefile in [compiler_c](compiler_c) (requires a C toolchain) and regenerate `compiler.exe`.
- API enforces a 10s timeout per compile and returns error text from stderr when the compiler fails.

## Deployment hints
- Set environment-specific process manager (PM2, systemd) for the API and serve the Vite build with a static host or CDN.
- Protect `/api/compile` with rate limiting and input size constraints if exposing publicly.
- Keep the compiled binary and any `.env` secrets out of version control (see .gitignore).
