#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "lexer.h"
#include "parser.h"
#include "codegen.h"
#include "json_output.h"

// Declaration for opt.c function
int optimize_ast(ASTNode* node);

// Read all of stdin into a dynamically allocated buffer
static char* read_stdin() {
    size_t capacity = 4096;
    size_t length = 0;
    char *buffer = (char*)malloc(capacity);
    if (!buffer) return NULL;
    
    int c;
    while ((c = getchar()) != EOF) {
        if (length + 1 >= capacity) {
            capacity *= 2;
            char *tmp = (char*)realloc(buffer, capacity);
            if (!tmp) { free(buffer); return NULL; }
            buffer = tmp;
        }
        buffer[length++] = (char)c;
    }
    buffer[length] = '\0';
    return buffer;
}

int main(int argc, char **argv) {
    int json_mode = 0;
    int use_stdin = 0;
    
    // Parse command-line flags
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--json") == 0) {
            json_mode = 1;
        }
        if (strcmp(argv[i], "--stdin") == 0) {
            use_stdin = 1;
        }
    }
    
    const char *code;
    char *stdin_buffer = NULL;
    
    if (use_stdin) {
        stdin_buffer = read_stdin();
        if (!stdin_buffer || strlen(stdin_buffer) == 0) {
            if (json_mode) {
                printf("{\"error\":\"No input provided on stdin\"}\n");
            } else {
                printf("Error: No input provided on stdin.\n");
            }
            free(stdin_buffer);
            return 1;
        }
        code = stdin_buffer;
    } else {
        code = "int main() { int a = 10; int b = 20; int c = a + b * 2; print(c); }";
    }
    
    if (json_mode) {
        // --- JSON MODE: structured output for the frontend ---
        init_lexer(code);
        ASTNode* program = parse_program();
        int optimized = optimize_ast(program);
        
        // Re-init lexer for token output (print_tokens_json calls init_lexer internally)
        print_full_json(code, program, optimized);
        
        free_ast(program);
    } else {
        // --- LEGACY MODE: plain text output ---
        printf("Source:\n%s\n\n", code);
        
        init_lexer(code);
        ASTNode* program = parse_program();
        
        printf("--- Optimization ---\n");
        if (optimize_ast(program)) {
            printf("Constant folding applied.\n");
        } else {
            printf("No optimizations applied.\n");
        }
        
        printf("\n--- Generated Assembly ---\n");
        generate_code(program);
        
        free_ast(program);
    }
    
    free(stdin_buffer);
    return 0;
}