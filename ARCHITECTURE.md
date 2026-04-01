# Compiler Visualization System Architecture

## Overview
This system is an interactive web-based educational tool designed to visualize the phases of a compiler. It takes source code as input and transforms it through the standard compiler pipeline, providing visual feedback at each step.

## Technology Stack
- **Frontend**: React (v18+) with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules / Tailwind (optional, currently pure CSS)
- **State Management**: React Context / Hooks
- **Logic**: Client-side TypeScript (runs entirely in browser)

## System Components

### 1. User Interface (Layout)
- **Code Editor**: A text area for users to input source code (MiniLang).
- **Phase Pipeline**: A navigational component to switch between compiler phases (Lexical -> Syntax -> Semantic -> etc.).
- **Visualization Panel**: The main display area showing the output of the current phase.
- **Info Panel**: Explains the current phase, algorithms used, and data structures.

### 2. Compiler Modules (`src/compiler/`)
The compiler logic is modularized to mimic a real compiler:

- **Lexer (`/lexer`)**:
  - Input: Source Code (String)
  - Output: Stream of Tokens
  - Logic: Regex-based or State Machine tokenizer.
  
- **Parser (`/parser`)**:
  - Input: Tokens
  - Output: Abstract Syntax Tree (AST)
  - Logic: Recursive Descent Parser.
  
- **Semantic Analyzer (`/semantic`)**:
  - Input: AST
  - Output: Annotated AST / Symbol Table
  - Logic: Scope checking, Type checking (basic).
  
- **Intermediate Code Generator (`/ir`)**:
  - Input: Annotated AST
  - Output: Three-Address Code (TAC) or Quadruples.
  
- **Optimizer (`/optimizer`)**:
  - Input: IR
  - Output: Optimized IR
  - Logic: Constant Folding, Dead Code Elimination.
  
- **Code Generator (`/backend`)**:
  - Input: Optimized IR
  - Output: Target Assembly (Virtual Machine or simplified x86).

### 3. Data Flow
`Source Code` -> [Lexer] -> `Tokens` -> [Parser] -> `AST` -> [Semantic] -> `SymTable` -> [IR Gen] -> `TAC` -> [Opt] -> `Opt TAC` -> [CodeGen] -> `Assembly`

## MiniLang Specification
A simple language for demonstration:
```
x = 10;
y = x + 5 * 2;
```

## Directory Structure
```
/src
  /compiler       # Core logic
    /lexer
    /parser
    ...
  /components     # UI Components
  /layout         # Main page layout
  App.tsx         # Entry point
```
