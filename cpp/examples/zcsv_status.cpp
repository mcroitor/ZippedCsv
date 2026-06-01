// zcsv_status — prints metadata and table summary of a .zcsv archive.
//
// Usage: zcsv_status <archive.zcsv>

#include <cstdlib>
#include <iostream>
#include <string>

#include "zippedcsv.h"

static void PrintField(const std::string& label, const std::string& value) {
  if (!value.empty()) std::cout << "  " << label << ": " << value << "\n";
}

int main(int argc, char* argv[]) {
  if (argc < 2) {
    std::cerr << "Usage: zcsv_status <archive.zcsv>\n";
    return EXIT_FAILURE;
  }

  std::string path(argv[1]);
  mc::ZippedCsv z(path);

  std::cout << "Archive: " << path << "\n";

  auto meta = z.GetMetadata();
  std::cout << "Metadata:\n";
  PrintField("Title", meta.title);
  PrintField("Description", meta.description);
  PrintField("Author", meta.author);
  PrintField("Created", meta.created_at);
  PrintField("Updated", meta.updated_at);
  std::cout << "  Delimiter: '" << meta.delimiter << "'\n";
  std::cout << "  QuoteChar: '" << meta.quote_char << "'\n";
  std::cout << "  HasHeader: " << (meta.has_header ? "true" : "false") << "\n";

  auto names = z.GetTableNames();
  std::cout << "\nTables (" << names.size() << "):\n";
  for (const auto& name : names) {
    auto& csv = z.GetCsv(name);
    std::cout << "  " << name << " — " << csv.TotalColumns()
              << " column(s), " << csv.TotalRows() << " row(s)\n";
  }

  return EXIT_SUCCESS;
}
