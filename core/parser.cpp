#include "parser.hpp"
#include "lexer.hpp"
#include <algorithm>
#include <utility>

namespace
{
constexpr std::size_t maxDepth = 256;

int precedence(TokenType type)
{
    switch (type)
    {
    case TokenType::EQ: return 1;
    case TokenType::IMPL: return 2;
    case TokenType::OR:
    case TokenType::NOR: return 3;
    case TokenType::XOR: return 4;
    case TokenType::AND:
    case TokenType::NAND: return 5;
    default: return 0;
    }
}
}

ParseError::ParseError(const std::string& message, std::size_t position)
    : std::runtime_error(message + " at position " + std::to_string(position)),
      position_(position)
{}

Expression::Expression(Token token, std::unique_ptr<Expression> left,
                       std::unique_ptr<Expression> right)
    : token_(std::move(token)), left_(std::move(left)), right_(std::move(right)),
      depth_(1 + std::max(left_ ? left_->depth_ : 0, right_ ? right_->depth_ : 0))
{
    if (depth_ > maxDepth)
        throw ParseError("Expression is too deep", token_.position);
}

bool Expression::evaluate(const Variables& variables) const
{
    if (token_.type == TokenType::CONSTANT)
        return token_.text == "1";
    if (token_.type == TokenType::VAR)
    {
        const auto value = variables.find(token_.text);
        if (value == variables.end())
            throw std::runtime_error("Missing variable '" + token_.text + "'");
        return value->second;
    }
    if (token_.type == TokenType::NOT)
        return !right_->evaluate(variables);

    // Evaluate both operands so missing variables are reported consistently.
    const bool a = left_->evaluate(variables);
    const bool b = right_->evaluate(variables);
    switch (token_.type)
    {
    case TokenType::AND: return a && b;
    case TokenType::OR: return a || b;
    case TokenType::XOR: return a != b;
    case TokenType::EQ: return a == b;
    case TokenType::IMPL: return !a || b;
    case TokenType::NAND: return !(a && b);
    case TokenType::NOR: return !(a || b);
    default: throw std::logic_error("Invalid expression node");
    }
}

Parser::Parser(std::string source) : Parser(Lexer(std::move(source)).tokenize())
{}

Parser::Parser(std::vector<Token> tokens) : tokens_(std::move(tokens))
{
    if (tokens_.empty() || tokens_.back().type != TokenType::END)
        throw std::invalid_argument("Token stream must end with END");
    for (std::size_t i = 0; i + 1 < tokens_.size(); ++i)
    {
        if (tokens_[i].type == TokenType::END)
            throw ParseError("Unexpected END token", tokens_[i].position);
    }
}

const Token& Parser::current() const
{
    return tokens_[pos_];
}

std::unique_ptr<Expression> Parser::parse()
{
    pos_ = 0;
    auto expression = binary(1, 0);
    if (current().type != TokenType::END)
        throw ParseError("Unexpected token '" + current().text + "'", current().position);
    return expression;
}

std::unique_ptr<Expression> Parser::binary(int minimum, std::size_t depth)
{
    auto left = primary(depth);
    while (precedence(current().type) >= minimum)
    {
        const Token operation = current();
        const int priority = precedence(operation.type);
        ++pos_;
        const int nextMinimum = priority + (operation.type == TokenType::IMPL ? 0 : 1);
        auto right = binary(nextMinimum, depth + 1);
        left.reset(new Expression(operation, std::move(left), std::move(right)));
    }
    return left;
}

std::unique_ptr<Expression> Parser::primary(std::size_t depth)
{
    if (depth >= maxDepth)
        throw ParseError("Expression is too deep", current().position);

    const Token token = current();
    switch (token.type)
    {
    case TokenType::VAR:
        if (token.text.empty())
            throw ParseError("Empty variable name", token.position);
        ++pos_;
        return std::unique_ptr<Expression>(new Expression(token));
    case TokenType::CONSTANT:
        if (token.text != "0" && token.text != "1")
            throw ParseError("Invalid boolean constant", token.position);
        ++pos_;
        return std::unique_ptr<Expression>(new Expression(token));
    case TokenType::NOT:
    {
        ++pos_;
        auto operand = primary(depth + 1);
        return std::unique_ptr<Expression>(new Expression(token, nullptr, std::move(operand)));
    }
    case TokenType::L_PAREN:
    {
        ++pos_;
        auto expression = binary(1, depth + 1);
        if (current().type != TokenType::R_PAREN)
            throw ParseError("Expected ')'", current().position);
        ++pos_;
        return expression;
    }
    default:
        throw ParseError("Expected variable, constant, '~' or '('", token.position);
    }
}
