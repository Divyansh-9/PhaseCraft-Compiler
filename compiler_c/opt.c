#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "parser.h"

// Simple optimization pass: Constant Folding
// Returns 1 if optimization happened, 0 otherwise
int optimize_ast(ASTNode* node) {
    if (!node) return 0;
    
    int changed = 0;
    
    // Bottom-up traversal
    changed |= optimize_ast(node->left);
    changed |= optimize_ast(node->right);
    
    if (strcmp(node->type, "BinaryOp") == 0) {
        ASTNode* l = node->left;
        ASTNode* r = node->right;
        
        if (l && r && strcmp(l->type, "Literal") == 0 && strcmp(r->type, "Literal") == 0) {
            int val1 = atoi(l->value);
            int val2 = atoi(r->value);
            int res = 0;
            
            if (strcmp(node->value, "+") == 0) res = val1 + val2;
            else if (strcmp(node->value, "-") == 0) res = val1 - val2;
            else if (strcmp(node->value, "*") == 0) res = val1 * val2;
            else if (strcmp(node->value, "/") == 0) res = (val2 != 0) ? (val1 / val2) : 0;
            
            // Replace this node with a literal
            strcpy(node->type, "Literal");
            sprintf(node->value, "%d", res);
            
            free(node->left);
            free(node->right);
            node->left = NULL;
            node->right = NULL;
            
            changed = 1;
        }
    }
    
    return changed;
}