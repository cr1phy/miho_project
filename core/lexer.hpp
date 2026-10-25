#pragma once
#include "token.hpp"
#include <vector>

class Lexer
{
public:
    explicit Lexer(std::string source);

    std::vector<Token> tokenize() const;

private:
    std::string source_;
};