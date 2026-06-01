// zcsv_print — prints the contents of all (or a named) table in a .zcsv archive.
//
// Usage: zcsv_print <archive.zcsv> [<table_name>]

#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "csv.h"
#include "zippedcsv.h"

static void PrintTable(const std::string& name, mc::Csv& csv) {
  std::cout << "=== " << name << " ===\n";
  auto header = csv.GetHeader();
  for (size_t i = 0; i < header.size(); ++i) {
    if (i > 0) std::cout << "\t";
    std::cout << header[i];
  }
  std::cout << "\n";

  for (int r = 0; r < csv.TotalRows(); ++r) {
    auto row = csv.GetRow(r);
    for (size_t i = 0; i < header.size(); ++i) {
      if (i > 0) std::cout << "\t";
      std::cout << row[header[i]];
    }
    std::cout << "\n";
  }
  std::cout << "\n";
}

int main(int argc, char* argv[]) {
  if (argc < 2) {
    std::cerr << "Usage: zcsv_print <archive.zcsv> [<table_name>]\n";
    return EXIT_FAILURE;
  }

  std::string path(argv[1]);
  std::string filter = argc >= 3 ? std::string(argv[2]) : "";

  mc::ZippedCsv z(path);
  auto names = z.GetTableNames();

  if (names.empty()) {
    std::cout << "Archive contains no tables.\n";
    return EXIT_SUCCESS;
  }

  for (const auto& name : names) {
    if (!filter.empty() && name != filter && name != filter + ".csv") continue;
    try {
      PrintTable(name, z.GetCsv(name));
    } catch (const std::exception& e) {
      std::cerr << "Error reading '" << name << "': " << e.what() << "\n";
    }
  }

  return EXIT_SUCCESS;
}
