#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "json_output.h"

// --- Utility: escape a string for JSON ---
static void print_json_string(const char *s) {
    putchar('"');
    if (s) {
        for (int i = 0; s[i]; i++) {
            switch (s[i]) {
                case '"':  printf("\\\""); break;
                case '\\': printf("\\\\"); break;
                case '\n': printf("\\n"); break;
                case '\r': printf("\\r"); break;
                case '\t': printf("\\t"); break;
                default:   putchar(s[i]); break;
            }
        }
    }
    putchar('"');
}

// --- Print all tokens as JSON array ---
void print_tokens_json(const char *source) {
    init_lexer(source);
    printf("\"tokens\":[");
    int first = 1;
    Token t;
    while (1) {
        t = get_next_token();
        if (t.type == TOKEN_EOF) break;
        if (!first) printf(",");
        first = 0;
        printf("{\"type\":");
        print_json_string(token_type_to_string(t.type));
        printf(",\"value\":");
        print_json_string(t.value);
        printf(",\"line\":%d}", t.line);
    }
    printf("]");
}

// --- Print AST as JSON ---
void print_ast_json(ASTNode* node) {
    if (!node) {
        printf("null");
        return;
    }
    printf("{\"type\":");
    print_json_string(node->type);
    printf(",\"value\":");
    print_json_string(node->value);
    printf(",\"left\":");
    print_ast_json(node->left);
    printf(",\"right\":");
    print_ast_json(node->right);
    printf("}");
}

// --- Codegen: capture assembly to stdout as JSON array ---
static void gen_expr_json(ASTNode* node, int *first) {
    if (!node) return;
    
    if (strcmp(node->type, "Literal") == 0) {
        if (!*first) printf(",");
        *first = 0;
        printf("\"  PUSH %s\"", node->value);
    } else if (strcmp(node->type, "Identifier") == 0) {
        if (!*first) printf(",");
        *first = 0;
        printf("\"  LOAD %s\"", node->value);
    } else if (strcmp(node->type, "BinaryOp") == 0) {
        gen_expr_json(node->left, first);
        gen_expr_json(node->right, first);
        if (!*first) printf(",");
        *first = 0;
        if (strcmp(node->value, "+") == 0) printf("\"  ADD\"");
        else if (strcmp(node->value, "-") == 0) printf("\"  SUB\"");
        else if (strcmp(node->value, "*") == 0) printf("\"  MUL\"");
        else if (strcmp(node->value, "/") == 0) printf("\"  DIV\"");
        else if (strcmp(node->value, "<") == 0) printf("\"  LT\"");
        else if (strcmp(node->value, ">") == 0) printf("\"  GT\"");
    }
}

static int json_label_count = 0;

static void gen_code_json(ASTNode* node, int *first) {
    if (!node) return;
    
    if (strcmp(node->type, "Program") == 0) {
        if (!*first) printf(",");
        *first = 0;
        printf("\"; Code Generation Start\"");
        gen_code_json(node->left, first);
        gen_code_json(node->right, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"; Code Generation End\"");
    }
    else if (strcmp(node->type, "Function") == 0) {
        if (!*first) printf(",");
        *first = 0;
        printf("\"FUNC %s:\"", node->value);
        gen_code_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  RET\"");
    }
    else if (strcmp(node->type, "Block") == 0) {
        gen_code_json(node->left, first);
    }
    else if (strcmp(node->type, "Seq") == 0) {
        gen_code_json(node->left, first);
        gen_code_json(node->right, first);
    }
    else if (strcmp(node->type, "VarDecl") == 0) {
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  STORE %s\"", node->value);
    }
    else if (strcmp(node->type, "Assign") == 0) {
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  STORE %s\"", node->value);
    }
    else if (strcmp(node->type, "Print") == 0) {
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  PRINT\"");
    }
    else if (strcmp(node->type, "Return") == 0) {
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  RET\"");
    }
    else if (strcmp(node->type, "If") == 0) {
        int l1 = json_label_count++;
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  JMP_FALSE L%d\"", l1);
        gen_code_json(node->right, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"L%d:\"", l1);
    }
    else if (strcmp(node->type, "While") == 0) {
        int start = json_label_count++;
        int end = json_label_count++;
        if (!*first) printf(",");
        *first = 0;
        printf("\"L%d:\"", start);
        gen_expr_json(node->left, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  JMP_FALSE L%d\"", end);
        gen_code_json(node->right, first);
        if (!*first) printf(",");
        *first = 0;
        printf("\"  JMP L%d\"", start);
        if (!*first) printf(",");
        *first = 0;
        printf("\"L%d:\"", end);
    }
    else {
        gen_code_json(node->left, first);
        gen_code_json(node->right, first);
    }
}

void print_codegen_json(ASTNode* node) {
    int first = 1;
    printf("\"assembly\":[");
    gen_code_json(node, &first);
    printf("]");
}

// --- Full JSON output: everything in one object ---
void print_full_json(const char *source, ASTNode* program, int optimized) {
    printf("{");
    
    // Tokens
    print_tokens_json(source);
    printf(",");
    
    // AST
    printf("\"ast\":");
    print_ast_json(program);
    printf(",");
    
    // Optimization flag
    printf("\"optimized\":%s,", optimized ? "true" : "false");
    
    // Assembly
    print_codegen_json(program);
    
    printf("}\n");
}
