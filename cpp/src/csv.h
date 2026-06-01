#pragma once

#include <map>
#include <stdexcept>
#include <string>
#include <vector>

namespace mc {

// In-memory CSV table with optional header row.
//
// Internal layout:
//   header_  — ordered list of column names
//   rows_    — data as vector-of-vectors indexed by column position
//
// Error codes are returned by mutating operations; access operations throw
// std::out_of_range / std::invalid_argument on bad inputs.
class Csv {
 public:
  static constexpr char kDefaultSeparator = ';';
  static constexpr char kDefaultQuoteChar = '"';

  static constexpr int kOk = 0;
  static constexpr int kFileNotReadable = 2;
  static constexpr int kFileNotWritable = 3;
  static constexpr int kRowSizeMismatch = 4;
  static constexpr int kColumnSizeMismatch = 5;
  static constexpr int kDifferentKeys = 6;
  static constexpr int kColumnNotFound = 7;
  static constexpr int kRowNotFound = 8;

  Csv() = default;

  // Constructs from a 2-D array; first row is the header.
  explicit Csv(std::vector<std::vector<std::string>> data);

  // ── Accessors ────────────────────────────────────────────────────────
  std::vector<std::string> GetHeader() const;
  std::vector<std::map<std::string, std::string>> GetData() const;

  int TotalRows() const;
  int TotalColumns() const;

  // Throws std::out_of_range if index is out of bounds.
  std::map<std::string, std::string> GetRow(int index) const;

  // Throws std::invalid_argument if column_name is unknown.
  std::vector<std::string> GetColumn(const std::string& column_name) const;

  // Throws std::invalid_argument / std::out_of_range on bad input.
  std::string GetCell(const std::string& column_name, int index) const;

  // ── Mutators ─────────────────────────────────────────────────────────
  int AddRow(const std::vector<std::string>& row);
  int AddRow(const std::map<std::string, std::string>& row);
  int AddColumn(const std::string& column_name,
                const std::vector<std::string>& column);
  void SetCellValue(const std::string& column_name, int index,
                    const std::string& value);
  int RemoveRow(int index);
  int RemoveColumn(const std::string& column_name);

  // ── Serialisation ────────────────────────────────────────────────────
  int LoadFromString(const std::string& csv_string, bool has_header = true,
                     char separator = kDefaultSeparator,
                     char quote_char = kDefaultQuoteChar);

  std::string ToString(bool has_header = true,
                       char separator = kDefaultSeparator,
                       char quote_char = kDefaultQuoteChar) const;

  int Load(const std::string& file_name, bool has_header = true,
           char separator = kDefaultSeparator,
           char quote_char = kDefaultQuoteChar);

  int Save(const std::string& file_name, bool has_header = true,
           char separator = kDefaultSeparator,
           char quote_char = kDefaultQuoteChar) const;

 private:
  // Returns the column index, or -1 if not found.
  int ColumnIndex(const std::string& name) const;

  std::vector<std::string> header_;
  std::vector<std::vector<std::string>> rows_;
};

}  // namespace mc
