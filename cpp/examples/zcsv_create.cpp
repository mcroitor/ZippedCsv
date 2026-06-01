// zcsv_create — creates a new .zcsv archive with two tables.
//
// Usage: zcsv_create <output.zcsv>

#include <cstdlib>
#include <iostream>
#include <string>

#include "csv.h"
#include "zippedcsv.h"

int main(int argc, char* argv[]) {
  if (argc < 2) {
    std::cerr << "Usage: zcsv_create <output.zcsv>\n";
    return EXIT_FAILURE;
  }

  std::string path(argv[1]);
  mc::ZippedCsv z(path);

  // Set metadata
  mc::Metadata meta;
  meta.title = "Example Dataset";
  meta.author = "zcsv_create tool";
  meta.delimiter = ',';
  meta.has_header = true;
  z.SetMetadata(meta);

  // Table 1: people
  mc::Csv people({{"Name", "Age", "City"},
                          {"Alice", "30", "New York"},
                          {"Bob", "25", "London"}});
  z.AddCsv("people", people);

  // Table 2: scores
  mc::Csv scores({{"Player", "Score"},
                          {"Alice", "9500"},
                          {"Bob", "8100"}});
  z.AddCsv("scores", scores);

  int rc = z.Save();
  if (rc != 0) {
    std::cerr << "Error: could not save " << path << " (code " << rc << ")\n";
    return EXIT_FAILURE;
  }

  std::cout << "Created " << path << " with "
            << z.GetTableNames().size() << " table(s).\n";
  return EXIT_SUCCESS;
}
