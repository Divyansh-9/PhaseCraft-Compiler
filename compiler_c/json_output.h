#ifndef JSON_OUTPUT_H
#define JSON_OUTPUT_H

#include "lexer.h"
#include "parser.h"

// Print all tokens as JSON array
void print_tokens_json(const char *source);

// Print AST as JSON object
void print_ast_json(ASTNode* node);

// Capture generated assembly lines into a JSON array string
void print_codegen_json(ASTNode* node);

// Print the full compiler output as one JSON object
void print_full_json(const char *source, ASTNode* program, int optimized);

#endif
