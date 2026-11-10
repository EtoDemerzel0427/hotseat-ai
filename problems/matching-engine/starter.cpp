#include <cstdint>
#include <cstdio>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <vector>

// Implement an in-memory matching engine.
//
// All input parsing and output formatting is done for you below the
// MatchingEngine class. You only fill in the MatchingEngine methods.
//
// Conventions:
//   - OrderId is uint64_t (ids can be as large as 2^64 - 1)
//   - Price is an integer number of cents: "100.5" -> 10050, "7" -> 700
//   - price / qty arrive as std::nullopt when the input token is not a
//     well-formed price / quantity (see the statement for what well-formed means)
//
// To produce output while processing a message, call the reporter:
//   out_.trade(symbol, price, qty, aggressor_id, resting_id);
//   out_.reject(order_id, RejectReason::...);
// Lines are printed in the order you call these methods.

using OrderId = std::uint64_t;
using Price = std::int64_t;     // cents
using Quantity = std::int64_t;

enum class Side { Buy, Sell };

enum class RejectReason { Invalid, DuplicateId, UnknownId };

struct Level {
    Price price;
    Quantity total_qty;       // total quantity at this price
    std::int64_t order_count; // number of orders at this price
};

struct BookSnapshot {
    std::string symbol;
    std::vector<Level> bids;  // highest price first
    std::vector<Level> asks;  // lowest price first
};

class Reporter {
public:
    void trade(const std::string& symbol, Price price, Quantity qty,
               OrderId aggressor_id, OrderId resting_id);
    void reject(OrderId id, RejectReason reason);
};

class MatchingEngine {
public:
    explicit MatchingEngine(Reporter& out) : out_(out) {}

    void insert(OrderId id, const std::string& symbol, Side side,
                std::optional<Price> price, std::optional<Quantity> qty) {
        // TODO
        (void)id; (void)symbol; (void)side; (void)price; (void)qty;
    }

    void cancel(OrderId id) {
        // TODO
        (void)id;
    }

    void amend(OrderId id, std::optional<Price> price, std::optional<Quantity> qty) {
        // TODO
        (void)id; (void)price; (void)qty;
    }

    // Called once after the last message. Return the books to print,
    // in the order they should be printed.
    std::vector<BookSnapshot> snapshot() {
        // TODO
        return {};
    }

private:
    Reporter& out_;
};

// ---------------------------------------------------------------------------
// I/O below. You should not need to change anything here.
// ---------------------------------------------------------------------------

static bool all_digits(const std::string& s) {
    if (s.empty()) return false;
    for (char c : s)
        if (c < '0' || c > '9') return false;
    return true;
}

// Positive decimal, 1-12 integer digits, at most 2 fractional digits.
static std::optional<Price> parse_price(const std::string& tok) {
    std::size_t dot = tok.find('.');
    std::string whole = tok.substr(0, dot);
    std::string frac = dot == std::string::npos ? "" : tok.substr(dot + 1);
    if (!all_digits(whole) || whole.size() > 12) return std::nullopt;
    if (dot != std::string::npos && (!all_digits(frac) || frac.size() > 2)) return std::nullopt;
    while (frac.size() < 2) frac += '0';
    Price cents = std::stoll(whole) * 100 + std::stoll(frac);
    if (cents <= 0) return std::nullopt;
    return cents;
}

// Integer from 1 to 10^9.
static std::optional<Quantity> parse_qty(const std::string& tok) {
    if (!all_digits(tok) || tok.size() > 10) return std::nullopt;
    Quantity q = std::stoll(tok);
    if (q < 1 || q > 1000000000) return std::nullopt;
    return q;
}

static std::string fmt_price(Price cents) {
    char buf[32];
    std::snprintf(buf, sizeof buf, "%lld.%02lld",
                  static_cast<long long>(cents / 100), static_cast<long long>(cents % 100));
    return buf;
}

void Reporter::trade(const std::string& symbol, Price price, Quantity qty,
                     OrderId aggressor_id, OrderId resting_id) {
    std::cout << "TRADE " << symbol << ' ' << fmt_price(price) << ' ' << qty << ' '
              << aggressor_id << ' ' << resting_id << '\n';
}

void Reporter::reject(OrderId id, RejectReason reason) {
    const char* name = reason == RejectReason::Invalid       ? "INVALID"
                       : reason == RejectReason::DuplicateId ? "DUPLICATE_ID"
                                                             : "UNKNOWN_ID";
    std::cout << "REJECT " << id << ' ' << name << '\n';
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Reporter out;
    MatchingEngine engine(out);
    std::string line;
    while (std::getline(std::cin, line)) {
        std::istringstream iss(line);
        std::vector<std::string> t;
        for (std::string tok; iss >> tok;) t.push_back(tok);
        if (t.empty()) continue;

        const std::string& op = t[0];
        if (op == "INSERT" && t.size() >= 6) {
            Side side = t[3] == "BUY" ? Side::Buy : Side::Sell;
            engine.insert(std::stoull(t[1]), t[2], side, parse_price(t[4]), parse_qty(t[5]));
        } else if (op == "CANCEL" && t.size() >= 2) {
            engine.cancel(std::stoull(t[1]));
        } else if (op == "AMEND" && t.size() >= 4) {
            engine.amend(std::stoull(t[1]), parse_price(t[2]), parse_qty(t[3]));
        }
    }

    for (const BookSnapshot& book : engine.snapshot()) {
        std::cout << "BOOK " << book.symbol << '\n';
        for (const Level& lv : book.bids)
            std::cout << "BID " << fmt_price(lv.price) << ' ' << lv.total_qty << ' ' << lv.order_count << '\n';
        for (const Level& lv : book.asks)
            std::cout << "ASK " << fmt_price(lv.price) << ' ' << lv.total_qty << ' ' << lv.order_count << '\n';
    }
    return 0;
}
