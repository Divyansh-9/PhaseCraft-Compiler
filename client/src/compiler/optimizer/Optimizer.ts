import type { Quadruple } from '../ir/IRGenerator';

export class Optimizer {
  // Return optimization steps log as well? For now just the result.
  public optimize(instructions: Quadruple[]): Quadruple[] {
    // Avoid overly aggressive constant folding that ignores live input
    // We will do a single conservative pass to enable basic optimizations without breaking I/O
    
    let currentIr = [...instructions];
    
    // We iterate backwards to find dead code
    // But forward for constant folding.
    // Let's implement a safer constant folding that respects I/O invalidation
    
    const result = this.optimizationPass(currentIr);
    return result.ir; // Single pass is safer for now effectively
  }

  private optimizationPass(instructions: Quadruple[]): { ir: Quadruple[], changed: boolean } {
    const constants = new Map<string, string>(); 
    let changed = false;
    const newInstructions: Quadruple[] = [];
    
    // 1. Forward Pass (Constant Folding & Propagation)
    // IMPORTANT: Treat instructions sequentially.
    
    for (const instr of instructions) {
        const newInstr = { ...instr };
        
        // Safety: If instruction is SCAN, we must invalidate any constant knowledge about the target
        if (newInstr.op === 'SCAN') {
            constants.delete(newInstr.result);
            newInstructions.push(newInstr);
            continue; 
        }

        // Try to replace args with constants
        if (newInstr.arg1 && constants.has(newInstr.arg1)) {
            newInstr.arg1 = constants.get(newInstr.arg1)!;
        }
        if (newInstr.arg2 && constants.has(newInstr.arg2)) {
            newInstr.arg2 = constants.get(newInstr.arg2)!;
        }

        // Constant Folding Check
        const val1 = parseFloat(newInstr.arg1);
        const val2 = parseFloat(newInstr.arg2);
        const isNum1 = !isNaN(val1);
        const isNum2 = !isNaN(val2);
        
        // Binary Operations
        if (isNum1 && isNum2 && ['+', '-', '*', '/', '<', '>', '==', '!='].includes(newInstr.op)) {
            let computed: number | null = null;
             switch(newInstr.op) {
                case '+': computed = val1 + val2; break;
                case '-': computed = val1 - val2; break;
                case '*': computed = val1 * val2; break;
                case '/': if (val2 !== 0) computed = val1 / val2; break;
                case '<': computed = (val1 < val2) ? 1 : 0; break;
                case '>': computed = (val1 > val2) ? 1 : 0; break;
                case '==': computed = (val1 === val2) ? 1 : 0; break;
                case '!=': computed = (val1 !== val2) ? 1 : 0; break;
            }
            
            if (computed !== null) {
                newInstr.op = '=';
                newInstr.arg1 = computed.toString();
                newInstr.element2 = ''; // Clear arg2
                newInstr.arg2 = '';
                newInstr.result = instr.result;
                newInstr.description = `Folded: ${computed}`;
                changed = true;
                
                // Remember this result is now a constant
                constants.set(newInstr.result, computed.toString());
            }
        } 
        // Assignment Logic
        else if (newInstr.op === '=') {
            if (!isNaN(parseFloat(newInstr.arg1))) {
                constants.set(newInstr.result, newInstr.arg1);
            } else {
                // If assigning variable to variable, we lose constant knowledge unless source is constant
                if (constants.has(newInstr.arg1)) {
                    constants.set(newInstr.result, constants.get(newInstr.arg1)!);
                } else {
                    constants.delete(newInstr.result);
                }
            }
        } 
        // If function call or anything else returns to a variable, we don't know its value anymore
        else if (newInstr.result) {
            constants.delete(newInstr.result);
        }

        newInstructions.push(newInstr);
    }
    
    // 2. Dead Code (Conservative)
    // Only verify temps
    const finalInstructions: Quadruple[] = [];
    const usedVariables = new Set<string>();
    
    for (let i = newInstructions.length - 1; i >= 0; i--) {
        const instr = newInstructions[i];
    
        // If writing to a TEMP that is never used, drop it.
        // User variables (a, b, sum) are kept to show in symbol table/visualization
        if (instr.result && instr.result.startsWith('t')) {
             if (['=', '+', '-', '*', '/'].includes(instr.op) && !usedVariables.has(instr.result)) {
                 changed = true;
                 continue;
             }
        }
        
        if (instr.arg1) usedVariables.add(instr.arg1);
        if (instr.arg2) usedVariables.add(instr.arg2);
        if (instr.op === 'SCAN') usedVariables.add(instr.result); // SCAN uses the variable as output target, effectively "using" the slot availability? 
        // Actually SCAN writes to result. But we must keep SCAN instruction!
        // The check above `instr.result.startsWith('t')` protects SCAN if scanning to variable.
        // If scanning to temp (ScanExpression), usedVariables check protects it if temp is used.
        
        finalInstructions.unshift(instr);
    }
    
    return { ir: finalInstructions, changed };
  }
}

