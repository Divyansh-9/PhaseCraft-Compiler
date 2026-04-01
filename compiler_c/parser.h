#ifndef PARSER_H
#define PARSER_H

#include "lexer.h"

typedef struct ASTNode {
    char type[20];
    char value[100];
    struct ASTNode *left;
    struct ASTNode *right;
} ASTNode;

ASTNode* parse_program();
void free_ast(ASTNode* node);

#endif