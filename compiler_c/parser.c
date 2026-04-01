#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "parser.h"

static Token current_token;

static void advance() {
    current_token = get_next_token();
}

static void eat(TokenType type) {
    if (current_token.type == type) {
        advance();
    } else {
        printf("Syntax Error: Expected %s, got %s\n", token_type_to_string(type), token_type_to_string(current_token.type));
        exit(1);
    }
}

ASTNode* create_node(const char* type, const char* value) {
    ASTNode* node = (ASTNode*)malloc(sizeof(ASTNode));
    strcpy(node->type, type);
    if(value) strcpy(node->value, value);
    else node->value[0] = '\0';
    node->left = NULL;
    node->right = NULL;
    return node;
}

ASTNode* parse_expression();
ASTNode* parse_statement();
ASTNode* parse_block();

// Factor: INT | ID | ( Expr )
ASTNode* parse_factor() {
    Token t = current_token;
    if (t.type == TOKEN_INT) { 
        ASTNode* node = create_node("Literal", t.value);
        advance();
        return node;
    } else if (t.type == TOKEN_ID) {
        ASTNode* node = create_node("Identifier", t.value);
        advance();
        return node;
    } else if (t.type == TOKEN_LPAREN) {
        advance();
        ASTNode* node = parse_expression();
        eat(TOKEN_RPAREN);
        return node;
    }
    printf("Syntax Error: Unexpected token %s\n", t.value);
    exit(1);
}

// Term: Factor * / Factor
ASTNode* parse_term() {
    ASTNode* left = parse_factor();
    while (current_token.type == TOKEN_MUL || current_token.type == TOKEN_DIV) {
        Token op = current_token;
        advance();
        ASTNode* node = create_node("BinaryOp", op.value);
        node->left = left;
        node->right = parse_factor();
        left = node;
    }
    return left;
}

// Additive: Term + - Term
ASTNode* parse_additive_expression() {
    ASTNode* left = parse_term();
    while (current_token.type == TOKEN_PLUS || current_token.type == TOKEN_MINUS) {
        Token op = current_token;
        advance();
        ASTNode* node = create_node("BinaryOp", op.value);
        node->left = left;
        node->right = parse_term();
        left = node;
    }
    return left;
}

// Expression: Additive < > Additive
ASTNode* parse_expression() {
    ASTNode* left = parse_additive_expression();
    while (current_token.type == TOKEN_LT || current_token.type == TOKEN_GT) {
        Token op = current_token;
        advance();
        ASTNode* node = create_node("BinaryOp", op.value); // keeping BinaryOp but value is < or >
        node->left = left;
        node->right = parse_additive_expression();
        left = node;
    }
    return left;
}

ASTNode* parse_block() {
    eat(TOKEN_LBRACE);
    ASTNode* head = NULL;
    ASTNode* current = NULL;
    
    while (current_token.type != TOKEN_RBRACE && current_token.type != TOKEN_EOF) {
        ASTNode* stmt = parse_statement();
        if (stmt) {
            // Wrap in Sequence node
            ASTNode* seq = create_node("Seq", NULL);
            seq->left = stmt;
            
            if (head == NULL) {
                head = seq;
                current = head;
            } else {
                current->right = seq;
                current = seq;
            }
        }
    }
    eat(TOKEN_RBRACE);
    
    // Return the head of the sequence chain, but wrap it in a Block node 
    // so we know it's a block (new scope essentially)
    ASTNode* blockNode = create_node("Block", "block");
    blockNode->left = head;
    return blockNode;
}

ASTNode* parse_statement() {
    if (current_token.type == TOKEN_INT) {
        advance();
        Token id = current_token;
        eat(TOKEN_ID);
        eat(TOKEN_ASSIGN);
        ASTNode* expr = parse_expression();
        eat(TOKEN_SEMI);
        
        ASTNode* node = create_node("VarDecl", id.value);
        node->left = expr;
        return node;
    } 
    else if (current_token.type == TOKEN_ID) {
        Token id = current_token;
        eat(TOKEN_ID);
        eat(TOKEN_ASSIGN);
        ASTNode* expr = parse_expression();
        eat(TOKEN_SEMI);
        
        ASTNode* node = create_node("Assign", id.value);
        node->left = expr;
        return node;
    }
    else if (current_token.type == TOKEN_PRINT) {
        advance();
        eat(TOKEN_LPAREN);
        ASTNode* expr = parse_expression();
        eat(TOKEN_RPAREN);
        eat(TOKEN_SEMI);
        
        ASTNode* node = create_node("Print", "print");
        node->left = expr;
        return node;
    }
    else if (current_token.type == TOKEN_IF) {
        advance();
        eat(TOKEN_LPAREN);
        ASTNode* cond = parse_expression();
        eat(TOKEN_RPAREN);
        ASTNode* body = parse_statement(); // can be block or single stmt
        
        ASTNode* node = create_node("If", "if");
        node->left = cond;
        node->right = body;
        return node;
    }
    else if (current_token.type == TOKEN_WHILE) {
        advance();
        eat(TOKEN_LPAREN);
        ASTNode* cond = parse_expression();
        eat(TOKEN_RPAREN);
        ASTNode* body = parse_statement();
        
        ASTNode* node = create_node("While", "while");
        node->left = cond;
        node->right = body;
        return node;
    }
    else if (current_token.type == TOKEN_RETURN) {
        advance();
        ASTNode* expr = parse_expression();
        eat(TOKEN_SEMI);
        
        ASTNode* node = create_node("Return", "return");
        node->left = expr;
        return node;
    }
    else if (current_token.type == TOKEN_LBRACE) {
        return parse_block();
    }
    
    // Fallback or skip
    return NULL;
}

ASTNode* parse_program() {
    advance(); // load first token
    ASTNode* root = create_node("Program", NULL);
    
    // Check for 'int main ( ) { ... }' pattern
    if (current_token.type == TOKEN_INT) {
        // We assume it's main function for this demo
        advance();
        // Since we can't lookahead easily without peek, and the user provided 'int main',
        // we'll check if next is 'main'
        if (current_token.type == TOKEN_ID && strcmp(current_token.value, "main") == 0) {
            advance(); // consume main
            eat(TOKEN_LPAREN);
            eat(TOKEN_RPAREN);
            ASTNode* body = parse_block(); // Expect { ... }
            
            ASTNode* func = create_node("Function", "main");
            func->left = body;
            root->left = func;
            return root;
        } else {
             // Basic fallback for 'int x = 10;' global code (if any)
             printf("Syntax Error: Expected 'main' function.\n");
             exit(1);
        }
    }
    
    return root;
}

void free_ast(ASTNode* node) {
    if (!node) return;
    free_ast(node->left);
    free_ast(node->right);
    free(node);
}