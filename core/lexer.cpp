#include "lexer.hpp"
#include <cctype>
#include <stdexcept>
#include <utility>
#include <vector>

Lexer::Lexer(std::string source)
    : source_(std::move(source))
{
}

std::vector<Token> Lexer::tokenize() const
{
    std::vector<Token> result;
    std::size_t pos = 0;

    while (pos < source_.size())
    {
        const char c = source_[pos];
        if (std::isspace(static_cast<unsigned char>(c)))
        {
            ++pos;
            continue;
        }

        TokenType type;
        std::size_t length = 1;
        const char next = pos + 1 < source_.size() ? source_[pos + 1] : '\0';

        switch (c)
        {
        case '0':
        case '1':
            type = TokenType::CONSTANT;
            break;
        case '(':
            type = TokenType::L_PAREN;
            break;
        case ')':
            type = TokenType::R_PAREN;
            break;
        case '&':
            type = TokenType::AND;
            break;
        case '|':
            type = TokenType::OR;
            break;
        case '^':
            type = TokenType::XOR;
            break;
        case '~':
            if (next == '&')
            {
                type = TokenType::NAND;
                length = 2;
            }
            else if (next == '|')
            {
                type = TokenType::NOR;
                length = 2;
            }
            else
            {
                type = TokenType::NOT;
            }
            break;
        case '-':
            if (next != '>')
            {
                throw std::runtime_error(
                    "Expected '->' at position " + std::to_string(pos));
            }
            type = TokenType::IMPL;
            length = 2;
            break;
        case '=':
            if (next != '=')
            {
                throw std::runtime_error(
                    "Expected '==' at position " + std::to_string(pos));
            }
            type = TokenType::EQ;
            length = 2;
            break;
        default:
            if (std::isalpha(static_cast<unsigned char>(c)) || c == '_')
            {
                type = TokenType::VAR;
                while (pos + length < source_.size())
                {
                    const char ch = source_[pos + length];
                    if (!std::isalnum(static_cast<unsigned char>(ch)) && ch != '_')
                    {
                        break;
                    }
                    ++length;
                }
            }
            else
            {
                throw std::runtime_error(
                    "Unexpected character at position " + std::to_string(pos));
            }
            break;
        }

        result.push_back({type, source_.substr(pos, length), pos});
        pos += length;
    }

    result.push_back({TokenType::END, "", pos});
    return result;
}
