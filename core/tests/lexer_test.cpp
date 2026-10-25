#include "lexer.hpp"
#include <iostream>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

namespace
{
std::size_t checks = 0;

void require(bool condition, const std::string& message)
{
    if (!condition)
        throw std::runtime_error(message);
}

void expect(const std::string& source, std::vector<Token> expected)
{
    expected.push_back({TokenType::END, "", source.size()});
    const Lexer lexer(source);
    // Repeated calls must not consume or otherwise mutate the input.
    for (int repeat = 0; repeat < 2; ++repeat)
    {
        const auto actual = lexer.tokenize();
        require(actual.size() == expected.size(), "Incorrect token count");
        for (std::size_t i = 0; i < actual.size(); ++i)
        {
            require(actual[i].type == expected[i].type, "Incorrect token type");
            require(actual[i].text == expected[i].text, "Incorrect token text");
            require(actual[i].position == expected[i].position, "Incorrect token position");
        }
    }
    ++checks;
}

void expectError(const std::string& source, const std::string& message)
{
    try
    {
        Lexer(source).tokenize();
    }
    catch (const std::runtime_error& error)
    {
        require(error.what() == message, "Incorrect error: " + std::string(error.what()));
        ++checks;
        return;
    }
    throw std::runtime_error("Expected lexer error");
}
}

int main()
{
    try
    {
        const std::vector<Token> vocabulary = {
            {TokenType::L_PAREN, "(", 0}, {TokenType::R_PAREN, ")", 0},
            {TokenType::NOT, "~", 0}, {TokenType::AND, "&", 0},
            {TokenType::OR, "|", 0}, {TokenType::XOR, "^", 0},
            {TokenType::EQ, "==", 0}, {TokenType::IMPL, "->", 0},
            {TokenType::NAND, "~&", 0}, {TokenType::NOR, "~|", 0},
            {TokenType::VAR, "A", 0}, {TokenType::VAR, "abc_12", 0},
            {TokenType::VAR, "_", 0}, {TokenType::VAR, "_foo2", 0},
            {TokenType::CONSTANT, "0", 0}, {TokenType::CONSTANT, "1", 0}
        };
        for (const auto& token : vocabulary)
            expect(token.text, {token});

        expect("", {});
        expect(" \t\n\r\f\v", {});
        expect(" A\tB\n", {{TokenType::VAR, "A", 1}, {TokenType::VAR, "B", 3}});
        expect("~A|(B&C)", {
            {TokenType::NOT, "~", 0}, {TokenType::VAR, "A", 1},
            {TokenType::OR, "|", 2}, {TokenType::L_PAREN, "(", 3},
            {TokenType::VAR, "B", 4}, {TokenType::AND, "&", 5},
            {TokenType::VAR, "C", 6}, {TokenType::R_PAREN, ")", 7}
        });
        expect("A->B==C~&D~|E^F", {
            {TokenType::VAR, "A", 0}, {TokenType::IMPL, "->", 1},
            {TokenType::VAR, "B", 3}, {TokenType::EQ, "==", 4},
            {TokenType::VAR, "C", 6}, {TokenType::NAND, "~&", 7},
            {TokenType::VAR, "D", 9}, {TokenType::NOR, "~|", 10},
            {TokenType::VAR, "E", 12}, {TokenType::XOR, "^", 13},
            {TokenType::VAR, "F", 14}
        });
        expect("~~A ~ & B", {
            {TokenType::NOT, "~", 0}, {TokenType::NOT, "~", 1},
            {TokenType::VAR, "A", 2}, {TokenType::NOT, "~", 4},
            {TokenType::AND, "&", 6}, {TokenType::VAR, "B", 8}
        });
        // The parser, not the lexer, checks missing operands and unmatched parentheses.
        expect(")A->(", {{TokenType::R_PAREN, ")", 0}, {TokenType::VAR, "A", 1},
                         {TokenType::IMPL, "->", 2}, {TokenType::L_PAREN, "(", 4}});
        expect(std::string(100000, 'a'), {{TokenType::VAR, std::string(100000, 'a'), 0}});
        expect(std::string(100000, ' '), {});

        for (const std::string source : {"-", "- >", "-A"})
            expectError(source, "Expected '->' at position 0");
        for (const std::string source : {"=", "= =", "=A"})
            expectError(source, "Expected '==' at position 0");
        expectError("A===B", "Expected '==' at position 3");
        expectError("A -> B -", "Expected '->' at position 7");
        for (const std::string source : {"@", ">", "!", "2", "А"})
            expectError(source, "Unexpected character at position 0");
        expectError("A + B", "Unexpected character at position 2");
        expectError(std::string("A\0B", 3), "Unexpected character at position 1");
        // High bytes must be safely passed to the character classification functions.
        for (int byte = 128; byte <= 255; ++byte)
            expectError(std::string(1, static_cast<char>(byte)),
                        "Unexpected character at position 0");

        // Generate known token streams independently of lexer decisions.
        std::mt19937 random(42);
        for (int trial = 0; trial < 1000; ++trial)
        {
            std::string source;
            std::vector<Token> expected;
            for (int i = 0; i < 50; ++i)
            {
                source += (random() % 2 == 0) ? " " : "\n\t";
                Token token = vocabulary[random() % vocabulary.size()];
                token.position = source.size();
                source += token.text;
                expected.push_back(token);
            }
            expect(source, expected);
        }
        std::cout << "Passed " << checks << " lexer cases\n";
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << "Lexer test failed: " << error.what() << '\n';
        return 1;
    }
}
