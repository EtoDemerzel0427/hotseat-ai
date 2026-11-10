#include <iostream>
#include <optional>
#include <sstream>
#include <string>

class KVStore {
public:
    KVStore() {
        // TODO: initialize your data structures
    }

    // Set key to value.
    void set(const std::string& key, const std::string& value) {
        // TODO
        (void)key;
        (void)value;
    }

    // Return the value of key, or std::nullopt if the key does not exist.
    std::optional<std::string> get(const std::string& key) {
        // TODO
        (void)key;
        return std::string();
    }

    // Remove key; do nothing if it does not exist.
    void remove(const std::string& key) {
        // TODO
        (void)key;
    }

    // Return the number of keys whose current value equals value.
    int count(const std::string& value) {
        // TODO
        (void)value;
        return -1;
    }

    // Handle the BEGIN command (not used in stage 1).
    void begin() {
        // TODO
    }

    // Handle the ROLLBACK command (not used in stage 1).
    // Return true on success, false if the command cannot be applied.
    bool rollback() {
        // TODO
        return true;
    }

    // Handle the COMMIT command (not used in stage 1).
    // Return true on success, false if the command cannot be applied.
    bool commit() {
        // TODO
        return true;
    }
};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::string line;
    if (!std::getline(std::cin, line)) return 0;
    int q = 0;
    std::istringstream(line) >> q;

    KVStore store;
    std::string out;
    for (int i = 0; i < q && std::getline(std::cin, line); ++i) {
        std::istringstream in(line);
        std::string op, key, value;
        in >> op;
        if (op == "SET") {
            in >> key >> value;
            store.set(key, value);
        } else if (op == "GET") {
            in >> key;
            std::optional<std::string> result = store.get(key);
            out += result ? *result : "NULL";
            out += '\n';
        } else if (op == "DELETE") {
            in >> key;
            store.remove(key);
        } else if (op == "COUNT") {
            in >> value;
            out += std::to_string(store.count(value));
            out += '\n';
        } else if (op == "BEGIN") {
            store.begin();
        } else if (op == "ROLLBACK") {
            if (!store.rollback()) out += "NO TRANSACTION\n";
        } else if (op == "COMMIT") {
            if (!store.commit()) out += "NO TRANSACTION\n";
        }
    }
    std::cout << out;
    return 0;
}
