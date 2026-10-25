#pragma once
#include <string>

enum class TokenType
{
    L_PAREN,
    R_PAREN,
    NOT, AND, OR, XOR, EQ, IMPL, NAND, NOR,
    VAR,
    CONSTANT,
    END
};

struct Token
{
    TokenType type;
    std::string text;
    std::size_t position;
};
