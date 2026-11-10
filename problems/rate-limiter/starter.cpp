#include <iostream>
#include <string>

class RateLimiter {
public:
    RateLimiter(long long window, int limit) {
        // TODO
    }

    // User `user` sends a request at time t. Returns whether it is allowed.
    bool request(long long t, const std::string& user) {
        // TODO
        return false;
    }

    // Handles a STAT command at time t for `user`. Returns the number to print.
    long long stat(long long t, const std::string& user) {
        // TODO
        return -1;
    }
};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    long long w;
    int k, q;
    std::cin >> w >> k >> q;
    RateLimiter limiter(w, k);

    std::string op, user;
    long long t;
    while (q-- > 0 && std::cin >> op >> t >> user) {
        if (op == "REQ") {
            std::cout << (limiter.request(t, user) ? "ALLOW" : "DENY") << '\n';
        } else if (op == "STAT") {
            std::cout << limiter.stat(t, user) << '\n';
        }
    }
    return 0;
}
