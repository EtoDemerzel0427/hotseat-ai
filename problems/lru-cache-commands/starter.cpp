#include <iostream>
#include <string>

class LRUCache {
public:
    explicit LRUCache(int capacity) : capacity_(capacity) {
        // TODO: initialize your data structures
    }

    // On a hit, return the value and mark the key as most recently used; otherwise return -1.
    long long get(long long key) {
        // TODO
        (void)key;
        return 0;
    }

    // Insert or update; evict the least recently used key when necessary.
    void put(long long key, long long value) {
        // TODO
        (void)key;
        (void)value;
    }

    // Used by a later stage (DEL command). The result is printed as 1 (true) or 0 (false).
    bool remove(long long key) {
        // TODO
        (void)key;
        return false;
    }

    // Used by a later stage (RESIZE command). The returned number is printed.
    int resize(int newCapacity) {
        // TODO
        (void)newCapacity;
        return -1;
    }

private:
    int capacity_;
};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int capacity, q;
    if (!(std::cin >> capacity >> q)) return 0;
    LRUCache cache(capacity);
    std::string out;
    std::string op;
    for (int i = 0; i < q && (std::cin >> op); ++i) {
        if (op == "GET") {
            long long key;
            std::cin >> key;
            out += std::to_string(cache.get(key));
            out += '\n';
        } else if (op == "PUT") {
            long long key, value;
            std::cin >> key >> value;
            cache.put(key, value);
        } else if (op == "DEL") {
            long long key;
            std::cin >> key;
            out += cache.remove(key) ? "1\n" : "0\n";
        } else if (op == "RESIZE") {
            int newCapacity;
            std::cin >> newCapacity;
            out += std::to_string(cache.resize(newCapacity));
            out += '\n';
        }
    }
    std::cout << out;
    return 0;
}
