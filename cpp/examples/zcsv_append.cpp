// zcsv_append — appends a row to a named table inside an existing .zcsv.
//
// Usage: zcsv_append <archive.zcsv> <table_name> <value1> [<value2> ...]

#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "csv.h"
#include "zippedcsv.h"

int main(int argc, char* argv[]) {
  if (argc < 4) {
    std::cerr << "Usage: zcsv_append <archive.zcsv> <table_name> "
                 "<value1> [<value2> ...]\n";
    return EXIT_FAILURE;
  }

  std::string path(argv[1]);
  std::string table(argv[2]);

  std::vector<std::string> values;
  for (int i = 3; i < argc; ++i) values.emplace_back(argv[i]);

  mc::ZippedCsv z(path);

  mc::Csv* csv = nullptr;
  try {
    csv = &z.GetCsv(table);
  } catch (const std::invalid_argument& e) {
    std::cerr << "Error: " << e.what() << "\n";
    return EXIT_FAILURE;
  }

  int rc = csv->AddRow(values);
  if (rc != mc::Csv::kOk) {
    std::cerr << "Error adding row (code " << rc << "). Expected "
              << csv->TotalColumns() << " value(s), got "
              << values.size() << ".\n";
    return EXIT_FAILURE;
  }

  rc = z.Save();
  if (rc != 0) {
    std::cerr << "Error: could not save " << path << " (code " << rc << ")\n";
    return EXIT_FAILURE;
  }

  std::cout << "Appended row to '" << table << "' in " << path << ".\n";
  return EXIT_SUCCESS;
}
