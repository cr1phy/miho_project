#include "parser.hpp"
#include "lexer.hpp"
#include <iostream>
#include <random>
#include <string>
#include <vector>

namespace
{
std::size_t checks = 0;

void check(bool condition, const std::string& message)
{
    if (!condition)
        throw std::runtime_error(message);
    ++checks;
}

std::string tree(const Expression& expression)
{
    if (expression.token().type == TokenType::NOT)
        return "(~" + tree(*expression.right()) + ")";
    if (!expression.left())
        return expression.token().text;
    return "(" + tree(*expression.left()) + expression.token().text
        + tree(*expression.right()) + ")";
}

void shape(const std::string& source, const std::string& expected)
{
    Parser parser(Lexer(source).tokenize());
    check(tree(*parser.parse()) == expected, "Wrong AST for " + source);
    check(tree(*parser.parse()) == expected, "Parser cannot be reused");
}

void invalid(const std::string& source, std::size_t position)
{
    Parser parser(source);
    for (int repeat = 0; repeat < 2; ++repeat)
    {
        try
        {
            parser.parse();
        }
        catch (const ParseError& error)
        {
            check(error.position() == position, "Wrong error position for " + source);
            check(std::string(error.what()).find("position " + std::to_string(position))
                  != std::string::npos, "Error must contain its position");
            continue;
        }
        throw std::runtime_error("Accepted invalid expression: " + source);
    }
}

void tooDeep(const std::string& source)
{
    try
    {
        Parser(source).parse();
    }
    catch (const ParseError& error)
    {
        check(std::string(error.what()).find("too deep") != std::string::npos,
              "Wrong depth error");
        return;
    }
    throw std::runtime_error("Depth limit was not enforced");
}

struct Operation
{
    std::string text;
    // Row order: 00, 01, 10, 11. Expected values come from the truth table.
    std::string truth;
};
const std::vector<Operation> operations = {
    {"&", "0001"}, {"|", "0111"}, {"^", "0110"}, {"->", "1101"},
    {"==", "1001"}, {"~&", "1110"}, {"~|", "1000"}
};

struct Generated
{
    std::string source;
    std::vector<bool> truth;
};

Generated generate(std::mt19937& random, int depth)
{
    if (depth == 0)
    {
        const int variable = random() % 3;
        Generated result{std::string(1, static_cast<char>('A' + variable)), {}};
        for (int values = 0; values < 8; ++values)
            result.truth.push_back((values & (1 << variable)) != 0);
        return result;
    }
    auto left = generate(random, depth - 1);
    if (random() % 4 == 0)
    {
        left.source = "~(" + left.source + ")";
        for (std::size_t i = 0; i < left.truth.size(); ++i)
            left.truth[i] = !left.truth[i];
        return left;
    }
    const auto right = generate(random, depth - 1);
    const auto& operation = operations[random() % operations.size()];
    left.source = "(" + left.source + operation.text + right.source + ")";
    for (std::size_t i = 0; i < left.truth.size(); ++i)
        left.truth[i] = operation.truth[2 * left.truth[i] + right.truth[i]] == '1';
    return left;
}
}

int main()
{
    try
    {
        shape("A", "A");
        shape(" _var12 ", "_var12");
        shape("((A))", "A");
        shape("~~A", "(~(~A))");
        shape("~A&B", "((~A)&B)");
        shape("~(A|B)", "(~(A|B))");
        shape("A|B&C", "(A|(B&C))");
        shape("A&B|C", "((A&B)|C)");
        shape("A|B^C&D", "(A|(B^(C&D)))");
        shape("A->B|C", "(A->(B|C))");
        shape("A|B->C", "((A|B)->C)");
        shape("A==B->C", "(A==(B->C))");
        shape("A->B==C", "((A->B)==C)");
        shape("A->B->C", "(A->(B->C))");
        shape("(A->B)->C", "((A->B)->C)");
        shape("A==B==C", "((A==B)==C)");
        shape("A~&B&C", "((A~&B)&C)");
        shape("A&B~&C", "((A&B)~&C)");
        shape("A~|B|C", "((A~|B)|C)");
        shape("A|B~|C", "((A|B)~|C)");
        shape("A~|B~&C", "(A~|(B~&C))");
        shape("0 | ~1", "(0|(~1))");

        const auto positioned = Parser("  A -> ~B").parse();
        check(positioned->token().position == 4, "Wrong operator position");
        check(positioned->left()->token().position == 2, "Wrong variable position");
        check(positioned->right()->token().position == 7, "Wrong NOT position");
        check(positioned->right()->right()->token().position == 8, "Wrong operand position");
        check(!Parser("0").parse()->evaluate(), "False constant");
        check(Parser("1").parse()->evaluate(), "True constant");
        check(Parser("~0").parse()->evaluate(), "NOT false");
        check(!Parser("~1").parse()->evaluate(), "NOT true");

        for (const auto& operation : operations)
        {
            const auto expression = Parser("A" + operation.text + "B").parse();
            for (int row = 0; row < 4; ++row)
            {
                const bool a = (row & 2) != 0;
                const bool b = (row & 1) != 0;
                check(expression->evaluate({{"A", a}, {"B", b}})
                      == (operation.truth[row] == '1'), "Wrong truth table: " + operation.text);
            }
        }
        for (const std::string source : {"A|~A", "~(A&B)==(~A|~B)", "(A->B)==(~A|B)"})
        {
            const auto expression = Parser(source).parse();
            for (int row = 0; row < 4; ++row)
                check(expression->evaluate({{"A", (row & 2) != 0}, {"B", (row & 1) != 0}}),
                      "Failed logical identity");
        }
        try
        {
            Parser("1|missing").parse()->evaluate();
            throw std::logic_error("Missing variable was silently ignored");
        }
        catch (const std::runtime_error& error)
        {
            check(std::string(error.what()).find("missing") != std::string::npos,
                  "Missing variable must be named");
        }

        invalid("", 0);
        invalid(" \t", 2);
        invalid("()", 1);
        invalid("(", 1);
        invalid(")", 0);
        invalid("(A", 2);
        invalid("A)", 1);
        invalid("A B", 2);
        invalid("A(B)", 1);
        invalid("(A)(B)", 3);
        invalid("A~B", 1);
        invalid("01", 1);
        invalid("1A", 1);
        invalid("~", 1);
        invalid("~&A", 0);
        invalid("A&&B", 2);
        invalid("A||B", 2);
        invalid("A & )", 4);
        for (const auto& operation : operations)
        {
            invalid(operation.text + "A", 0);
            invalid("A" + operation.text, 1 + operation.text.size());
        }
        for (const std::vector<Token>& tokens : {
                 std::vector<Token>{}, std::vector<Token>{{TokenType::VAR, "A", 0}}})
        {
            try
            {
                Parser parser(tokens);
                throw std::runtime_error("Accepted stream without END");
            }
            catch (const std::invalid_argument&) { ++checks; }
        }
        for (const std::vector<Token>& tokens : {
                 std::vector<Token>{{TokenType::END, "", 0}, {TokenType::END, "", 1}},
                 std::vector<Token>{{TokenType::CONSTANT, "2", 0}, {TokenType::END, "", 1}},
                 std::vector<Token>{{TokenType::VAR, "", 0}, {TokenType::END, "", 1}}})
        {
            try
            {
                Parser(tokens).parse();
                throw std::runtime_error("Accepted malformed token stream");
            }
            catch (const ParseError&) { ++checks; }
        }
        check(Parser(std::string(255, '~') + "A").parse()->evaluate({{"A", false}}),
              "Valid depth boundary rejected");
        check(Parser(std::string(255, '(') + "A" + std::string(255, ')'))
              .parse()->evaluate({{"A", true}}), "Valid parentheses depth rejected");
        tooDeep(std::string(256, '~') + "A");
        tooDeep(std::string(256, '(') + "A" + std::string(256, ')'));
        std::string leftChain = "A", rightChain = "A";
        for (int i = 0; i < 300; ++i)
        {
            leftChain += "&A";
            rightChain += "->A";
        }
        tooDeep(leftChain);
        tooDeep(rightChain);

        std::mt19937 random(2026);
        for (int trial = 0; trial < 500; ++trial)
        {
            const auto generated = generate(random, 4);
            const auto expression = Parser(generated.source).parse();
            for (int values = 0; values < 8; ++values)
                check(expression->evaluate({{"A", (values & 1) != 0},
                                            {"B", (values & 2) != 0},
                                            {"C", (values & 4) != 0}})
                      == generated.truth[values], "Generated expression mismatch");
        }
        std::cout << "Passed " << checks << " parser checks\n";
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << "Parser test failed: " << error.what() << '\n';
        return 1;
    }
}
