#include <stdio.h>
#include <string.h>
#include "codegen.h"

static int label_count = 0;

// Simple stack-based code generation
void generate_expression(ASTNode* node) {
    if (!node) return;
    
    if (strcmp(node->type, "Literal") == 0) {
        printf("  PUSH %s\n", node->value);
    } else if (strcmp(node->type, "Identifier") == 0) {
        printf("  LOAD %s\n", node->value);
    } else if (strcmp(node->type, "BinaryOp") == 0) {
        generate_expression(node->left);
        generate_expression(node->right);
        if (strcmp(node->value, "+") == 0) printf("  ADD\n");
        else if (strcmp(node->value, "-") == 0) printf("  SUB\n");
        else if (strcmp(node->value, "*") == 0) printf("  MUL\n");
        else if (strcmp(node->value, "/") == 0) printf("  DIV\n");
        else if (strcmp(node->value, "<") == 0) printf("  LT\n");
        else if (strcmp(node->value, ">") == 0) printf("  GT\n");
    }
}

void generate_code(ASTNode* node) {
    if (!node) return;
    
    if (strcmp(node->type, "Program") == 0) {
        printf("; Code Generation Start\n");
        generate_code(node->left); // Function
        generate_code(node->right);
        printf("; Code Generation End\n");
    } 
    else if (strcmp(node->type, "Function") == 0) {
        printf("FUNC %s:\n", node->value);
        generate_code(node->left); // Body (Block)
        printf("  RET\n");
    }
    else if (strcmp(node->type, "Block") == 0) {
        generate_code(node->left); // Seq
    }
    else if (strcmp(node->type, "Seq") == 0) {
        generate_code(node->left); // Statement
        generate_code(node->right); // Next Seq
    }
    else if (strcmp(node->type, "VarDecl") == 0) {
        generate_expression(node->left);
        printf("  STORE %s\n", node->value);
    } 
    else if (strcmp(node->type, "Assign") == 0) {
        generate_expression(node->left);
        printf("  STORE %s\n", node->value);
    }
    else if (strcmp(node->type, "Print") == 0) {
        generate_expression(node->left);
        printf("  PRINT\n");
    }
    else if (strcmp(node->type, "Return") == 0) {
        generate_expression(node->left);
        printf("  RET\n");
    }
    else if (strcmp(node->type, "If") == 0) {
        int l1 = label_count++;
        generate_expression(node->left); // Condition
        printf("  JMP_FALSE L%d\n", l1);
        generate_code(node->right); // Body
        printf("L%d:\n", l1);
    }
    else if (strcmp(node->type, "While") == 0) {
        int start = label_count++;
        int end = label_count++;
        printf("L%d:\n", start);
        generate_expression(node->left);
        printf("  JMP_FALSE L%d\n", end);
        generate_code(node->right);
        printf("  JMP L%d\n", start);
        printf("L%d:\n", end);
    }
    else {
        // Fallback for expression statements or other nodes
        generate_code(node->left);
        generate_code(node->right);
    }
}