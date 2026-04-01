#include <stdio.h>
#include <ctype.h>
#include <string.h>
#include <stdlib.h>
#include "lexer.h"

static const char *src;
static int pos = 0;
static int line = 1;

void init_lexer(const char *source) {
    src = source;
    pos = 0;
    line = 1;
}

Token get_next_token() {
    Token token;
    token.value[0] = '\0';
    
    while (src[pos] != '\0') {
        if (isspace(src[pos])) {
            if (src[pos] == '\n') line++;
            pos++;
            continue;
        }
        
        token.line = line;

        if (isalpha(src[pos])) {
            int k = 0;
            while (isalnum(src[pos])) {
                token.value[k++] = src[pos++];
            }
            token.value[k] = '\0';
            if (strcmp(token.value, "int") == 0) token.type = TOKEN_INT;
            else if (strcmp(token.value, "print") == 0) token.type = TOKEN_PRINT;
            else if (strcmp(token.value, "if") == 0) token.type = TOKEN_IF;
            else if (strcmp(token.value, "while") == 0) token.type = TOKEN_WHILE;
            else if (strcmp(token.value, "return") == 0) token.type = TOKEN_RETURN;
            else token.type = TOKEN_ID;
            return token;
        }

        if (isdigit(src[pos])) {
            int k = 0;
            while (isdigit(src[pos])) {
                token.value[k++] = src[pos++];
            }
            token.value[k] = '\0';
            token.type = TOKEN_INT; // Using INT for number literals for simplicity
            return token;
        }

        switch (src[pos]) {
            case '=': token.type = TOKEN_ASSIGN; token.value[0] = '='; token.value[1] = '\0'; pos++; return token;
            case '+': token.type = TOKEN_PLUS; token.value[0] = '+'; token.value[1] = '\0'; pos++; return token;
            case '-': token.type = TOKEN_MINUS; token.value[0] = '-'; token.value[1] = '\0'; pos++; return token;
            case '*': token.type = TOKEN_MUL; token.value[0] = '*'; token.value[1] = '\0'; pos++; return token;
            case '/': token.type = TOKEN_DIV; token.value[0] = '/'; token.value[1] = '\0'; pos++; return token;
            case ';': token.type = TOKEN_SEMI; token.value[0] = ';'; token.value[1] = '\0'; pos++; return token;
            case '(': token.type = TOKEN_LPAREN; token.value[0] = '('; token.value[1] = '\0'; pos++; return token;
            case ')': token.type = TOKEN_RPAREN; token.value[0] = ')'; token.value[1] = '\0'; pos++; return token;
            case '{': token.type = TOKEN_LBRACE; token.value[0] = '{'; token.value[1] = '\0'; pos++; return token;
            case '}': token.type = TOKEN_RBRACE; token.value[0] = '}'; token.value[1] = '\0'; pos++; return token;
            case '<': token.type = TOKEN_LT; token.value[0] = '<'; token.value[1] = '\0'; pos++; return token;
            case '>': token.type = TOKEN_GT; token.value[0] = '>'; token.value[1] = '\0'; pos++; return token;
            default: 
                token.type = TOKEN_ERROR; 
                token.value[0] = src[pos]; 
                token.value[1] = '\0';
                pos++; 
                return token;
        }
    }

    token.type = TOKEN_EOF;
    return token;
}

const char* token_type_to_string(TokenType type) {
    switch(type) {
        case TOKEN_INT: return "INT";
        case TOKEN_ID: return "ID";
        case TOKEN_ASSIGN: return "ASSIGN";
        case TOKEN_PLUS: return "PLUS";
        case TOKEN_LBRACE: return "LBRACE";
        case TOKEN_RBRACE: return "RBRACE";
        case TOKEN_SEMI: return "SEMI";
        case TOKEN_PRINT: return "PRINT";
        case TOKEN_IF: return "IF";
        case TOKEN_WHILE: return "WHILE";
        case TOKEN_RETURN: return "RETURN";
        case TOKEN_EOF: return "EOF";
        default: return "OTHER";
    }
}