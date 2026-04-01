#ifndef LEXER_H
#define LEXER_H

typedef enum {
    TOKEN_INT, TOKEN_ID, TOKEN_ASSIGN, TOKEN_PLUS, TOKEN_MINUS, 
    TOKEN_MUL, TOKEN_DIV, TOKEN_LPAREN, TOKEN_RPAREN, 
    TOKEN_LBRACE, TOKEN_RBRACE, TOKEN_LT, TOKEN_GT,
    TOKEN_SEMI, TOKEN_PRINT, TOKEN_IF, TOKEN_WHILE, TOKEN_RETURN, 
    TOKEN_EOF, TOKEN_ERROR
} TokenType;

typedef struct {
    TokenType type;
    char value[100];
    int line;
} Token;

void init_lexer(const char *source);
Token get_next_token();
const char* token_type_to_string(TokenType type);

#endif