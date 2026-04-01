import type { Quadruple } from '../compiler/ir/IRGenerator';

export class Interpreter {
  private memory: Map<string, any>;
  private output: string[];
  
  constructor() {
    this.memory = new Map();
    this.output = [];
  }

  public async execute(ir: any[], onOutput: (line: string) => void, onInput: (varName: string) => Promise<string | null>): Promise<void> {
    this.memory.clear();
    this.output = [];
    
    const paramStack: any[] = [];
    
    for (let i = 0; i < ir.length; i++) {
        const q = ir[i];
        
        // Yield to event loop to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
            switch (q.op) {
                case '=':
                    this.memory.set(q.result, this.getValue(q.arg1));
                    break;
                
                case '+':
                    this.memory.set(q.result, this.getValue(q.arg1) + this.getValue(q.arg2));
                    break;
                case '-':
                    this.memory.set(q.result, this.getValue(q.arg1) - this.getValue(q.arg2));
                    break;
                case '*':
                    this.memory.set(q.result, this.getValue(q.arg1) * this.getValue(q.arg2));
                    break;
                case '/':
                    const divisor = this.getValue(q.arg2);
                    if (divisor === 0) throw new Error("Division by zero");
                    this.memory.set(q.result, this.getValue(q.arg1) / divisor);
                    break;
            
                case '>':
                    this.memory.set(q.result, this.getValue(q.arg1) > this.getValue(q.arg2) ? 1 : 0);
                    break;
                case '<':
                    this.memory.set(q.result, this.getValue(q.arg1) < this.getValue(q.arg2) ? 1 : 0);
                    break;
                case '>=':
                    this.memory.set(q.result, this.getValue(q.arg1) >= this.getValue(q.arg2) ? 1 : 0);
                    break;
                case '<=':
                    this.memory.set(q.result, this.getValue(q.arg1) <= this.getValue(q.arg2) ? 1 : 0);
                    break;
                case '==':
                    this.memory.set(q.result, this.getValue(q.arg1) == this.getValue(q.arg2) ? 1 : 0);
                    break;
                case '!=':
                    this.memory.set(q.result, this.getValue(q.arg1) != this.getValue(q.arg2) ? 1 : 0);
                    break;

                case 'JMP_FALSE':
                    if (!this.getValue(q.arg1)) {
                        const target = this.findLabelIndex(ir, q.arg2);
                        if (target !== -1) i = target;
                    }
                    break;
                case 'JMP':
                    const target = this.findLabelIndex(ir, q.arg1);
                    if (target !== -1) i = target;
                    break;

                case 'SCAN':
                    const inputVal = await onInput(q.result);
                    // Parse input: if it looks like a number, store as number
                    if (inputVal !== null) {
                       if (/^-?\d+(\.\d+)?$/.test(inputVal)) {
                           this.memory.set(q.result, Number(inputVal));
                       } else {
                           this.memory.set(q.result, inputVal);
                       }
                    } else {
                       this.memory.set(q.result, 0); // Default if cancelled
                    }
                    break;

                case 'param':
                    paramStack.push(this.getValue(q.arg1));
                    break;
                    
                case 'call':
                    const funcName = q.arg1;
                    if (['print', 'printf', 'println', 'display', 'show', 'cout', 'log'].some(f => funcName.includes(f))) {
                        if (paramStack.length > 0) {
                             const val = paramStack.pop();
                             const outputStr = String(val).replace(/^"|"$/g, '').replace(/\\n/g, '\n');
                             this.output.push(outputStr);
                             onOutput(outputStr);
                        }
                    } 
                    break;
            }
        } catch (e) {
            console.warn("Runtime warning:", e);
            onOutput(`Error: ${e}`);
        }
    }
  }
  
  private findLabelIndex(ir: any[], label: string): number {
      return ir.findIndex(q => q.op === 'LABEL' && q.arg1 === label);
  }
  
  private getValue(val: string): any {
    if (val === undefined || val === null) return 0;
    if (val === 'true') return 1;
    if (val === 'false') return 0;
    
    if (typeof val === 'number') return val;

    if (/^-?\d+(\.\d+)?$/.test(val)) {
        return Number(val);
    }
    
    if (val.startsWith('"') && val.endsWith('"')) {
        return val.slice(1, -1);
    }
    
    if (this.memory.has(val)) {
        return this.memory.get(val);
    }
    
    return 0;
  }
}
