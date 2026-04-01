import type { Quadruple } from '../ir/IRGenerator';

export interface AssemblyLine {
  text: string;
  indent?: boolean;
  irId?: number;
  comment?: string;
}

export interface VariableInfo {
  name: string;
  address: number;
}

export interface CodeGenResult {
  code: AssemblyLine[];
  memory: VariableInfo[];
  logs: string[];
  cppCode?: string; // C++ generated code for NLP → C++ conversion
}

export class CodeGenerator {
  public generate(instructions: Quadruple[]): CodeGenResult {
    const assembly: AssemblyLine[] = [];
    const logs: string[] = [];
    
    // 1. Data Section & Memory Allocation
    assembly.push({ text: '; Target: x86 (Simulated)', indent: false });
    assembly.push({ text: '.data', indent: false });
    const vars = new Set<string>();
    
    const strings = new Map<string, string>();
    let stringCounter = 0;
    
    // Scan instructions for strings and allocate them
    instructions.forEach(instr => {
        if (instr.arg1 && instr.arg1.startsWith('"')) {
            if (!strings.has(instr.arg1)) strings.set(instr.arg1, `STR${stringCounter++}`);
        }
    });
    
    // Identify all variables
    instructions.forEach(i => {
        if (i.result && !i.result.startsWith('t') && isNaN(Number(i.result)) && !i.result.startsWith('L') && !i.result.startsWith('func')) vars.add(i.result);
    });

    const memory: VariableInfo[] = [];
    let currentAddr = 1000;
    
    vars.forEach(v => {
        assembly.push({ text: `${v}: .word 0`, indent: true, comment: `Addr: ${currentAddr}` });
        memory.push({ name: v, address: currentAddr });
        currentAddr += 4;
    });

    strings.forEach((label, str) => {
        assembly.push({ text: `${label}: .string ${str}`, indent: true });
    });
    
    logs.push(`Allocated ${vars.size} variables and ${strings.size} strings in .data section`);

    // 2. Text Section
    assembly.push({ text: '', indent: false });
    assembly.push({ text: '.text', indent: false });
    assembly.push({ text: 'globl main', indent: false });
    assembly.push({ text: 'main:', indent: false });

    // 3. Instruction Selection
    instructions.forEach(instr => {
      const { id, op, arg1, arg2, result } = instr;
      
      const isArg1Var = vars.has(arg1);
      const isArg2Var = vars.has(arg2);
      const isResultVar = vars.has(result);

      const loadInto = (reg: string, val: string, isVar: boolean) => {
          if (isVar) {
              assembly.push({ text: `LOAD ${reg}, [${val}]`, indent: true, irId: id });
              logs.push(`Generated LOAD for variable access (${val})`);
          } else if (val && val.startsWith('"')) {
              const label = strings.get(val);
              if (label) {
                  assembly.push({ text: `MOV ${reg}, ${label}`, indent: true, irId: id, comment: `Load address of string` });
              }
          } else if (!isNaN(Number(val))) {
              assembly.push({ text: `MOV ${reg}, ${val}`, indent: true, irId: id });
              logs.push(`Generated MOV for immediate value (${val})`);
          } else {
             if (val && !val.startsWith('L') && !val.startsWith('func')) {
                assembly.push({ text: `MOV ${reg}, ${val}`, indent: true, irId: id });
             }
          }
      };

      switch (op) {
        case '=':
          logs.push(`Processing Assignment: ${result} = ${arg1}`);
          loadInto('R1', arg1, isArg1Var);
          if (isResultVar) {
              assembly.push({ text: `STORE [${result}], R1`, indent: true, irId: id });
              logs.push(`Generated STORE for assignment to ${result}`);
          } else {
              assembly.push({ text: `MOV ${result}, R1`, indent: true, irId: id, comment: 'Hold in temp' });
          }
          break;

        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '==':
        case '!=':
          logs.push(`Processing Binary Op: ${op}`);
          loadInto('R1', arg1, isArg1Var);
          
          if (isArg2Var || (arg2 && arg2.startsWith('t'))) {
             loadInto('R2', arg2, isArg2Var);
             let asmOp = 'ADD';
             if (op === '-') asmOp = 'SUB';
             else if (op === '*') asmOp = 'MUL';
             else if (op === '/') asmOp = 'DIV';
             else if (op === '%') asmOp = 'MOD';
             else if (op === '<') asmOp = 'CMP_LT';
             else if (op === '>') asmOp = 'CMP_GT';
             else if (op === '<=') asmOp = 'CMP_LE';
             else if (op === '>=') asmOp = 'CMP_GE';
             else if (op === '==') asmOp = 'CMP_EQ';
             else if (op === '!=') asmOp = 'CMP_NE';
             
             assembly.push({ text: `${asmOp} R1, R2`, indent: true, irId: id });
          } else {
             let asmOp = 'ADD';
             if (op === '-') asmOp = 'SUB';
             else if (op === '*') asmOp = 'MUL';
             else if (op === '/') asmOp = 'DIV';
             else if (op === '%') asmOp = 'MOD';
             else if (op === '<') asmOp = 'CMP_LT';
             else if (op === '>') asmOp = 'CMP_GT';
             else if (op === '<=') asmOp = 'CMP_LE';
             else if (op === '>=') asmOp = 'CMP_GE';
             else if (op === '==') asmOp = 'CMP_EQ';
             else if (op === '!=') asmOp = 'CMP_NE';
             
             assembly.push({ text: `${asmOp} R1, ${arg2}`, indent: true, irId: id });
          }

          if (isResultVar) {
              assembly.push({ text: `STORE [${result}], R1`, indent: true, irId: id });
          } else {
              assembly.push({ text: `MOV ${result}, R1`, indent: true, irId: id });
          }
          break;

        case 'SCAN':
          if (vars.has(result)) {
             assembly.push({ text: `SCAN [${result}]`, indent: true, irId: id, comment: 'Read input to variable' });
          } else {
             assembly.push({ text: `SCAN ${result}`, indent: true, irId: id });
          }
          break;

        case 'JMP':
          assembly.push({ text: `JMP ${arg1}`, indent: true, irId: id });
          break;
        
        case 'JMP_FALSE':
          loadInto('R1', arg1, isArg1Var);
          assembly.push({ text: `CMP R1, 0`, indent: true, irId: id });
          assembly.push({ text: `JE ${arg2}`, indent: true, irId: id });
          break;

        case 'LABEL':
          assembly.push({ text: `${arg1}:`, indent: false, irId: id });
          break;
          
        case 'FUNC_START':
          assembly.push({ text: `${arg1}:`, indent: false, irId: id, comment: 'Function prologue' });
          assembly.push({ text: `PUSH EBP`, indent: true });
          assembly.push({ text: `MOV EBP, ESP`, indent: true });
          break;

        case 'FUNC_END':
          assembly.push({ text: `POP EBP`, indent: true, irId: id, comment: 'Function epilogue' });
          assembly.push({ text: `RET`, indent: true });
          break;
        
        case 'RET':
           if (arg1) {
             loadInto('R0', arg1, isArg1Var);
           }
           assembly.push({ text: `MOV ESP, EBP`, indent: true });
           assembly.push({ text: `POP EBP`, indent: true });
           assembly.push({ text: `RET`, indent: true, irId: id });
           break;

        case 'print':
        case 'param':
        case 'call':
             if (op === 'param') {
                 loadInto('R1', arg1, isArg1Var);
                 assembly.push({ text: `PUSH R1`, indent: true, irId: id });
                 logs.push('Generated PUSH for parameter');
             } else if (op === 'call') {
                 assembly.push({ text: `CALL ${arg1}`, indent: true, irId: id });
                 logs.push('Generated CALL for function');
             } else if (op === 'print') {
                 loadInto('R1', arg1, isArg1Var);
                 assembly.push({ text: `PUSH R1`, indent: true, irId: id });
                 assembly.push({ text: `CALL print`, indent: true, irId: id });
             }
             break;
      }
    });

    // 4. Generate C++ code from IR
    const cppCode = this.generateCpp(instructions, vars);

    return {
        code: assembly,
        memory,
        logs,
        cppCode
    };
  }

  // NLP → C++ Code Conversion
  private generateCpp(instructions: Quadruple[], vars: Set<string>): string {
    const lines: string[] = [];
    lines.push('#include <iostream>');
    lines.push('#include <string>');
    lines.push('using namespace std;');
    lines.push('');
    lines.push('int main() {');

    // Declare variables
    const declaredVars = new Set<string>();
    let indent = '    ';
    let indentLevel = 1;

    const getIndent = () => '    '.repeat(indentLevel);

    // Track which variables hold strings vs numbers
    const varTypes = new Map<string, 'int' | 'string' | 'double'>();

    // First pass: determine types
    instructions.forEach(instr => {
      if (instr.op === '=' && instr.result && !instr.result.startsWith('t') && !instr.result.startsWith('L') && !instr.result.startsWith('_')) {
        if (instr.arg1.startsWith('"')) {
          varTypes.set(instr.result, 'string');
        } else if (instr.arg1.includes('.')) {
          varTypes.set(instr.result, 'double');
        } else {
          if (!varTypes.has(instr.result)) varTypes.set(instr.result, 'int');
        }
      }
    });

    // Second pass: generate C++ code
    for (let i = 0; i < instructions.length; i++) {
      const instr = instructions[i];
      const { op, arg1, arg2, result } = instr;

      switch (op) {
        case '=': {
          if (result.startsWith('t') || result.startsWith('_')) {
            // Temp variable
            if (!declaredVars.has(result)) {
              const valType = arg1.startsWith('"') ? 'string' : 'auto';
              lines.push(`${getIndent()}${valType} ${result} = ${arg1};`);
              declaredVars.add(result);
            } else {
              lines.push(`${getIndent()}${result} = ${arg1};`);
            }
          } else if (!result.startsWith('L')) {
            // User variable
            if (!declaredVars.has(result)) {
              const type = varTypes.get(result) || 'int';
              lines.push(`${getIndent()}${type} ${result} = ${arg1};`);
              declaredVars.add(result);
            } else {
              lines.push(`${getIndent()}${result} = ${arg1};`);
            }
          }
          break;
        }

        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
        case '<':
        case '>':
        case '<=':
        case '>=':
        case '==':
        case '!=': {
          if (!declaredVars.has(result)) {
            lines.push(`${getIndent()}auto ${result} = ${arg1} ${op} ${arg2};`);
            declaredVars.add(result);
          } else {
            lines.push(`${getIndent()}${result} = ${arg1} ${op} ${arg2};`);
          }
          break;
        }

        case 'param': {
          // Will be consumed by next 'call'
          break;
        }

        case 'call': {
          if (arg1.includes('print')) {
            // Find the preceding param
            const prev = instructions[i - 1];
            if (prev && prev.op === 'param') {
              let val = prev.arg1;
              // If it's a string literal, keep it; otherwise use variable
              lines.push(`${getIndent()}cout << ${val} << endl;`);
            }
          }
          break;
        }

        case 'LABEL':
          // Labels used for loops
          break;

        case 'JMP_FALSE': {
          lines.push(`${getIndent()}if (!(${arg1})) goto ${arg2};`);
          break;
        }

        case 'JMP': {
          lines.push(`${getIndent()}goto ${arg1};`);
          break;
        }

        case 'FUNC_START': {
          // For simplicity, we skip function wrapping since main already wraps everything
          lines.push(`${getIndent()}// --- Function: ${arg1} ---`);
          break;
        }

        case 'FUNC_END': {
          lines.push(`${getIndent()}// --- End Function: ${arg1} ---`);
          break;
        }

        case 'RET': {
          lines.push(`${getIndent()}return ${arg1 || '0'};`);
          break;
        }
      }
    }

    lines.push('    return 0;');
    lines.push('}');

    return lines.join('\n');
  }
}
