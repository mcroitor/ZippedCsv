cmake_minimum_required(VERSION 3.16)
project(zippedcsv VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# ── Dependencies ───────────────────────────────────────────────────────
find_package(libzip REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(Catch2 3 REQUIRED)

# ── Library sources ────────────────────────────────────────────────────
set(LIB_SOURCES
  src/csv.cpp
  src/zippedcsv.cpp
)

# ── Static library → libzippedcsv.a ───────────────────────────────────
add_library(zippedcsv_static STATIC ${LIB_SOURCES})
set_target_properties(zippedcsv_static PROPERTIES OUTPUT_NAME zippedcsv)
target_include_directories(zippedcsv_static PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/src>
  $<INSTALL_INTERFACE:include>
)
target_link_libraries(zippedcsv_static PUBLIC
  libzip::zip
  nlohmann_json::nlohmann_json
)

# ── Shared library → libzippedcsv.dll / libzippedcsv.so ───────────────
add_library(zippedcsv_shared SHARED ${LIB_SOURCES})
set_target_properties(zippedcsv_shared PROPERTIES OUTPUT_NAME zippedcsv)
target_include_directories(zippedcsv_shared PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/src>
  $<INSTALL_INTERFACE:include>
)
target_link_libraries(zippedcsv_shared PRIVATE
  libzip::zip
  nlohmann_json::nlohmann_json
)

# ── Example tools (linked against static library) ─────────────────────
foreach(EXAMPLE create append status print)
  add_executable(zcsv_${EXAMPLE} examples/zcsv_${EXAMPLE}.cpp)
  target_link_libraries(zcsv_${EXAMPLE} PRIVATE zippedcsv_static)
endforeach()

# ── Tests ──────────────────────────────────────────────────────────────
include(CTest)
enable_testing()

add_executable(test_csv tests/test_csv.cpp)
target_link_libraries(test_csv PRIVATE zippedcsv_static Catch2::Catch2WithMain)
add_test(NAME CsvTests COMMAND test_csv)

add_executable(test_zippedcsv tests/test_zippedcsv.cpp)
target_link_libraries(test_zippedcsv PRIVATE zippedcsv_static libzip::zip Catch2::Catch2WithMain)
add_test(NAME ZippedCsvTests COMMAND test_zippedcsv)
