#include <iostream>
#include <optional>
#include <string>
#include <utility>
#include <vector>

// n tasks numbered 1..n. Each pair (a, b) in deps means task a must finish
// before task b starts.
// Returns the execution order, or std::nullopt if no valid order exists.
std::optional<std::vector<int>> schedule(int n, const std::vector<std::pair<int, int>>& deps) {
    // TODO
    (void)n;
    (void)deps;
    return std::vector<int>{};
}

// Answer for a later stage. main() prints `total` on one line, then
// `per_task` (values for tasks 1..n, in order) on the next line.
struct Summary {
    long long total;
    std::vector<long long> per_task;
};

// Used from a later stage. durations[i] belongs to task i + 1.
// Return std::nullopt to print CYCLE.
std::optional<Summary> solve_stage2(int n, const std::vector<std::pair<int, int>>& deps,
                                    const std::vector<long long>& durations) {
    // TODO
    (void)n;
    (void)deps;
    (void)durations;
    return Summary{0, {}};
}

// Used from a later stage. durations[i] belongs to task i + 1.
// Return std::nullopt to print CYCLE.
std::optional<Summary> solve_stage3(int n, const std::vector<std::pair<int, int>>& deps,
                                    const std::vector<long long>& durations, int k) {
    // TODO
    (void)n;
    (void)deps;
    (void)durations;
    (void)k;
    return Summary{0, {}};
}

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, m;
    if (!(std::cin >> n >> m)) return 0;
    std::vector<std::pair<int, int>> deps(m);
    for (auto& [a, b] : deps) std::cin >> a >> b;

    std::string word;
    if (!(std::cin >> word) || word != "DURATION") {
        std::optional<std::vector<int>> order = schedule(n, deps);
        if (!order) {
            std::cout << "CYCLE\n";
            return 0;
        }
        for (std::size_t i = 0; i < order->size(); ++i) {
            if (i > 0) std::cout << ' ';
            std::cout << (*order)[i];
        }
        std::cout << '\n';
        return 0;
    }

    std::vector<long long> durations(n);
    for (auto& d : durations) std::cin >> d;

    std::optional<Summary> result;
    int k;
    if (std::cin >> word && word == "WORKERS" && std::cin >> k) {
        result = solve_stage3(n, deps, durations, k);
    } else {
        result = solve_stage2(n, deps, durations);
    }

    if (!result) {
        std::cout << "CYCLE\n";
        return 0;
    }
    std::cout << result->total << '\n';
    for (std::size_t i = 0; i < result->per_task.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << result->per_task[i];
    }
    std::cout << '\n';
    return 0;
}
