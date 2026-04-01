export interface Symbol {
  name: string;
  type: string; // e.g., 'number'
  value?: any;
  line: number;
  scope: string;
}

export class SymbolTable {
  private symbols: Map<string, Symbol> = new Map();

  public define(name: string, type: string, line: number, scope: string = 'global') {
    this.symbols.set(name, { name, type, line, scope });
  }

  public lookup(name: string): Symbol | undefined {
    return this.symbols.get(name);
  }

  public getAll(): Symbol[] {
    return Array.from(this.symbols.values());
  }

  public clear() {
    this.symbols.clear();
  }
}
