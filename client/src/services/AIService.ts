export interface AIResponse {
  message: string;
  fixedCode?: string;
  type: 'analysis' | 'fix' | 'optimization' | 'chat';
}

const API_KEY = "AIzaSyBXQzos-4iBdUMBiya0kUlGyAzZmfVVxb8";

export class AIService {
  private static async callAI(code: string, error: string | null, language: string): Promise<string> {
    const prompt = `You are an expert compiler and code correction assistant.

Your job is to analyze and fix code for C, C++, and Java.

INPUT:
Language: ${language}
Code:
${code}

Compiler Errors:
${error || "None"}

TASKS:
1. Detect all syntax errors (missing symbols, wrong structure, etc.)
2. Detect semantic errors (wrong logic, type mismatch, undeclared variables, etc.)
3. Fix ALL errors
4. Optimize code if possible (keep it simple and efficient)
5. Do NOT add comments inside the code
6. Ensure the code compiles successfully
7. Maintain proper formatting and indentation
8. Do NOT change the logic unnecessarily

OUTPUT FORMAT (STRICT):

Errors:
- list all issues clearly

Explanation:
- short and simple explanation

Corrected Code:
<final fixed code only>`;

    try {
      // Using Google Gemini API (gemini-2.5-flash) for current compatibility
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || `API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (e: any) {
      console.error("Gemini API error:", e);
      throw e;
    }
  }

  private static parseResponse(content: string, type: 'analysis' | 'fix' | 'optimization'): AIResponse {
    const parts = content.split(/Corrected Code:/i);
    let message = parts[0].trim();
    let fixedCode = parts[1] ? parts[1].trim() : undefined;

    if (fixedCode) {
      // Remove markdown code blocks if the AI model adds them
      const match = fixedCode.match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
      if (match) {
        fixedCode = match[1].trim();
      } else {
        fixedCode = fixedCode.trim();
      }
    }

    return {
      message,
      fixedCode,
      type
    };
  }

  // Heuristic Fallback
  private static analyzeSyntax(code: string, language: string) {
    const lines = code.split('\n');
    let msg = "";
    let fixed = code;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

      if (language === 'C' || language === 'CPP' || language === 'Java') {
        if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
           msg += `- Line ${index + 1}: Missing semicolon ';'\n`;
           
           // Apply fix
           const lineArr = fixed.split('\n');
           lineArr[index] = lineArr[index] + ';';
           fixed = lineArr.join('\n');
        }
      }
    });
    return { msg, fixed };
  }

  static async analyzeCode(code: string, error: string | null, language: string = 'C'): Promise<AIResponse> {
    try {
       const content = await this.callAI(code, error, language);
       return this.parseResponse(content, 'analysis');
    } catch (e: any) {
       console.warn("Falling back to local heuristic due to API error: " + e.message);
       const { msg } = this.analyzeSyntax(code, language);
       return {
          message: msg ? `API Error (${e.message}). Falling back to local analysis:\n${msg}` : `API Error (${e.message}). No local syntax issues detected!`,
          type: 'analysis'
       };
    }
  }

  static async fixCode(code: string, error: string | null, language: string): Promise<AIResponse> {
    try {
       const content = await this.callAI(code, error, language);
       return this.parseResponse(content, 'fix');
    } catch (e: any) {
       console.warn("Falling back to local heuristic due to API error: " + e.message);
       const { msg, fixed } = this.analyzeSyntax(code, language);
       return {
          message: msg ? `API Error (${e.message}). Applied local heuristic fixes:\n${msg}` : `API Error (${e.message}). Clean code.`,
          fixedCode: fixed,
          type: 'fix'
       };
    }
  }

  static async optimizeCode(code: string): Promise<AIResponse> {
    try {
       const content = await this.callAI(code, null, "C/C++/Java");
       return this.parseResponse(content, 'optimization');
    } catch (e: any) {
       return {
          message: `Could not reach AI for optimization. API Error: ${e.message}`,
          type: 'optimization'
       };
    }
  }
}
