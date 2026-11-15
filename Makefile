.PHONY: all core frontend client test check run

BUILD_DIR ?= build
CARGO ?= cargo
BUN ?= bun
APP_DIR := app
APP_MANIFEST := $(APP_DIR)/src-tauri/Cargo.toml

all: core client

core:
	cmake -S core -B $(BUILD_DIR) -DBUILD_TESTING=ON
	cmake --build $(BUILD_DIR) --parallel 2

# The Tauri crate embeds app/dist, so the frontend is built first.
frontend:
	cd $(APP_DIR) && $(BUN) install --frozen-lockfile && $(BUN) run build

client: frontend
	$(CARGO) build --locked --manifest-path $(APP_MANIFEST)

test: core frontend
	ctest --test-dir $(BUILD_DIR) --output-on-failure --no-tests=error
	$(CARGO) test --locked --manifest-path $(APP_MANIFEST)

check: frontend
	cd $(APP_DIR) && $(BUN) run lint
	$(CARGO) fmt --manifest-path $(APP_MANIFEST) --all -- --check
	$(CARGO) clippy --locked --manifest-path $(APP_MANIFEST) --all-targets -- -D warnings

run:
	cd $(APP_DIR) && $(BUN) install --frozen-lockfile && $(BUN) run tauri dev
