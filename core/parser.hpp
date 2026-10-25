#pragma once

#include "token.hpp"
#include <memory>
#include <stdexcept>
#include <unordered_map>
#include <vector>

class ParseError : public std::runtime_error
{
public:
    ParseError(const std::string& message, std::size_t position);
    std::size_t position() const noexcept { return position_; }

private:
    std::size_t position_;
};

class Expression
{
public:
    using Variables = std::unordered_map<std::string, bool>;

    const Token& token() const noexcept { return token_; }
    const Expression* left() const noexcept { return left_.get(); }
    const Expression* right() const noexcept { return right_.get(); }
    // All referenced variables must have values; missing names throw runtime_error.
    bool evaluate(const Variables& variables = {}) const;

private:
    friend class Parser;
    Expression(Token token, std::unique_ptr<Expression> left = nullptr,
               std::unique_ptr<Expression> right = nullptr);

    Token token_;
    std::unique_ptr<Expression> left_;
    std::unique_ptr<Expression> right_;
    std::size_t depth_;
};

class Parser
{
public:
    explicit Parser(std::vector<Token> tokens);
    explicit Parser(std::string source);

    // Precedence, high to low: ~, (& ~&), ^, (| ~|), ->, ==.
    // Implication associates right; other binary operators associate left.
    // Parentheses override precedence. NOT stores its operand in right().
    // Empty input is invalid. Recursive nesting and AST depth are limited to 256.
    // Each call parses the complete input from the beginning.
    std::unique_ptr<Expression> parse();

private:
    std::unique_ptr<Expression> binary(int minimum, std::size_t depth);
    std::unique_ptr<Expression> primary(std::size_t depth);
    const Token& current() const;

    std::vector<Token> tokens_;
    std::size_t pos_ = 0;
};
