#include <cctype>
#include <iostream>
#include <optional>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Tokens. The starter splits every line into tokens for you; spaces are
// already removed. Every token list you receive ends with one End token.
// ---------------------------------------------------------------------------
enum class TokenType {
    Number,  // non-negative integer literal; see Token::value
    Name,    // identifier made of letters, digits and '_'; see Token::name
    Plus,    // +
    Minus,   // -   (the starter does not decide whether it is unary or binary)
    Star,    // *
    Slash,   // /
    LParen,  // (
    RParen,  // )
    End,     // end of the token list
};

struct Token {
    TokenType type;
    long long value = 0;  // set when type == Number
    std::string name;     // set when type == Name
};

// ---------------------------------------------------------------------------
// Implement this class. One Calculator object is used for the whole input,
// and its methods are called once per line, in input order.
// Return std::nullopt to make the line print ERROR.
// ---------------------------------------------------------------------------
class Calculator {
public:
    // Called for a line that is an expression.
    std::optional<long long> evaluate(const std::vector<Token>& tokens) {
        // TODO
        (void)tokens;
        return std::nullopt;
    }

    // Called for a line of the form `name = ...`.
    // `tokens` holds everything after the '='.
    std::optional<long long> assign(const std::string& name, const std::vector<Token>& tokens) {
        // TODO
        (void)name;
        (void)tokens;
        return std::nullopt;
    }
};

// ---------------------------------------------------------------------------
// Input / output. You should not need to change anything below.
// ---------------------------------------------------------------------------
static bool isNameStart(char c) { return std::isalpha(static_cast<unsigned char>(c)) || c == '_'; }
static bool isNameChar(char c) { return std::isalnum(static_cast<unsigned char>(c)) || c == '_'; }

// Tokenizes line[pos..] and appends an End token.
static std::vector<Token> tokenize(const std::string& line, size_t pos) {
    std::vector<Token> tokens;
    size_t n = line.size();
    while (pos < n) {
        char c = line[pos];
        if (c == ' ') {
            ++pos;
        } else if (std::isdigit(static_cast<unsigned char>(c))) {
            long long v = 0;
            while (pos < n && std::isdigit(static_cast<unsigned char>(line[pos]))) {
                v = v * 10 + (line[pos] - '0');
                ++pos;
            }
            tokens.push_back({TokenType::Number, v, ""});
        } else if (isNameStart(c)) {
            size_t start = pos;
            while (pos < n && isNameChar(line[pos])) ++pos;
            tokens.push_back({TokenType::Name, 0, line.substr(start, pos - start)});
        } else {
            TokenType t = TokenType::End;
            switch (c) {
                case '+': t = TokenType::Plus; break;
                case '-': t = TokenType::Minus; break;
                case '*': t = TokenType::Star; break;
                case '/': t = TokenType::Slash; break;
                case '(': t = TokenType::LParen; break;
                case ')': t = TokenType::RParen; break;
                default: break;  // does not occur in valid input
            }
            if (t != TokenType::End) tokens.push_back({t, 0, ""});
            ++pos;
        }
    }
    tokens.push_back({TokenType::End, 0, ""});
    return tokens;
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Calculator calc;
    std::string line;
    while (std::getline(std::cin, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        size_t first = line.find_first_not_of(' ');
        if (first == std::string::npos) continue;  // skip blank lines

        // Detect `name = ...` at the start of the line.
        std::optional<long long> result;
        size_t p = first;
        bool handled = false;
        if (isNameStart(line[p])) {
            size_t start = p;
            while (p < line.size() && isNameChar(line[p])) ++p;
            std::string name = line.substr(start, p - start);
            while (p < line.size() && line[p] == ' ') ++p;
            if (p < line.size() && line[p] == '=') {
                result = calc.assign(name, tokenize(line, p + 1));
                handled = true;
            }
        }
        if (!handled) result = calc.evaluate(tokenize(line, first));

        if (result) {
            std::cout << *result << '\n';
        } else {
            std::cout << "ERROR\n";
        }
    }
    return 0;
}
