BUILD_DIR := build

.PHONY: all clean test install-deps

all:
	cmake -G "MSYS Makefiles" -DCMAKE_BUILD_TYPE=Release -B $(BUILD_DIR) -S .
	cmake --build $(BUILD_DIR)

test: all
	ctest --test-dir $(BUILD_DIR) --output-on-failure

clean:
	rm -rf $(BUILD_DIR)

install-deps:
	pacman -S --needed --noconfirm \
		mingw-w64-x86_64-libzip \
		mingw-w64-x86_64-nlohmann-json \
		mingw-w64-x86_64-catch \
		mingw-w64-x86_64-cmake
