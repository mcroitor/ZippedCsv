#pragma once

#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

#include "csv.h"

namespace mc {

struct Metadata {
  std::string title;
  std::string description;
  std::string author;
  std::string created_at;
  std::string updated_at;
  char delimiter = ',';
  char quote_char = '"';
  bool has_header = true;
};

// Reads and writes .zcsv (ZIP archive with root-level CSV files and an
// optional metadata.json).
//
// On construction the archive is read into memory. Save() writes it back to
// the same path when a non-empty path was provided.
 public:
  static constexpr const char* kMetadataFilename = "metadata.json";

  // Opens an existing archive or prepares a new in-memory one.
  // Throws std::runtime_error if the path is non-empty and the file exists but
  // cannot be opened as a valid ZIP archive.
  explicit ZippedCsv(std::string path);

  ZippedCsv(const ZippedCsv&) = delete;
  ZippedCsv& operator=(const ZippedCsv&) = delete;
  ZippedCsv(ZippedCsv&&) = default;
  ZippedCsv& operator=(ZippedCsv&&) = default;

  ~ZippedCsv() = default;

  // ── Accessors ────────────────────────────────────────────────────────
  std::vector<std::string> GetTableNames() const;
  Metadata GetMetadata() const;
  void SetMetadata(Metadata metadata);

  // Returns a reference to the Csv for the given table name.
  // Throws std::invalid_argument if the table does not exist.
  Csv& GetCsv(const std::string& table_name);

  // ── Mutators ─────────────────────────────────────────────────────────
  void AddCsv(const std::string& table_name, Csv csv);
  void RemoveCsv(const std::string& table_name);

  // ── Persistence ──────────────────────────────────────────────────────
  // Writes the archive to disk.  If path is empty, returns kFileNotWritable.
  int Save() const;
  void Close();

 private:
  static constexpr int kOk = 0;
  static constexpr int kFileNotWritable = 3;

  static std::string NormaliseName(const std::string& name);
  static bool IsValidDelimiter(char c);
  static bool IsValidQuoteChar(char c);
  void NormaliseMetadata();
  void LoadExisting();

  std::string path_;
  Metadata metadata_;
  std::vector<std::string> table_order_;  // insertion-ordered names
  std::map<std::string, Csv> tables_;
};

}  // namespace mc
