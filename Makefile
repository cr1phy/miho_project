.PHONY: all core client test check run

BUILD_DIR ?= build
CARGO ?= cargo

all: core client

core:
	cmake -S core -B $(BUILD_DIR) -DBUILD_TESTING=ON
	cmake --build $(BUILD_DIR) --parallel 2

client:
	$(CARGO) build --locked --manifest-path client/Cargo.toml

test: core
	ctest --test-dir $(BUILD_DIR) --output-on-failure --no-tests=error
	$(CARGO) test --locked --manifest-path client/Cargo.toml

check:
	$(CARGO) fmt --manifest-path client/Cargo.toml --all -- --check
	$(CARGO) clippy --locked --manifest-path client/Cargo.toml --all-targets -- -D warnings

run:
	$(CARGO) run --locked --manifest-path client/Cargo.toml
