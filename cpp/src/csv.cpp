#include "csv.h"

#include <algorithm>
#include <fstream>
#include <sstream>

namespace mc {

namespace {

// Full-string CSV parser: handles quoted fields (including multi-line quoted
// fields), doubled-quote escaping, CRLF, and custom delimiter / quote char.
std::vector<std::vector<std::string>> ParseCsv(const std::string& content,
                                               char delim, char qc) {
  std::vector<std::vector<std::string>> rows;
  std::vector<std::string> row;
  std::string field;
  bool in_quotes = false;
  const size_t len = content.size();

  for (size_t i = 0; i <= len; ++i) {
    // Flush on end-of-input
    if (i == len) {
      row.push_back(std::move(field));
      // Discard a trailing empty row produced by a trailing newline
      if (!(row.size() == 1 && row[0].empty())) {
        rows.push_back(std::move(row));
      }
      break;
    }

    char c = content[i];

    if (in_quotes) {
      if (c == qc) {
        if (i + 1 < len && content[i + 1] == qc) {
          // Doubled quote → literal quote character
          field += qc;
          ++i;
        } else {
          in_quotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c == qc) {
        in_quotes = true;
      } else if (c == delim) {
        row.push_back(std::move(field));
        field.clear();
      } else if (c == '\n') {
        row.push_back(std::move(field));
        field.clear();
        if (!row.empty()) {
          rows.push_back(std::move(row));
          row.clear();
        }
      } else if (c == '\r') {
        // Skip CR; '\n' will flush the row
      } else {
        field += c;
      }
    }
  }

  return rows;
}

// Serialise a single field, quoting it when it contains special characters.
std::string SerialiseField(const std::string& f, char delim, char qc) {
  bool needs_quote = false;
  for (char c : f) {
    if (c == delim || c == qc || c == '\n' || c == '\r') {
      needs_quote = true;
      break;
    }
  }
  if (!needs_quote) return f;

  std::string out;
  out.reserve(f.size() + 2);
  out += qc;
  for (char c : f) {
    if (c == qc) out += qc;  // double the quote
    out += c;
  }
  out += qc;
  return out;
}

}  // namespace

// ── Constructor ───────────────────────────────────────────────────────────

Csv::Csv(std::vector<std::vector<std::string>> data) {
  if (data.empty()) return;
  header_ = std::move(data[0]);
  rows_.reserve(data.size() - 1);
  for (size_t i = 1; i < data.size(); ++i) {
    if (data[i].size() != header_.size()) {
      throw std::invalid_argument(
          "All rows must have the same length as the header");
    }
    rows_.push_back(std::move(data[i]));
  }
}

// ── Private helpers ───────────────────────────────────────────────────────

int Csv::ColumnIndex(const std::string& name) const {
  auto it = std::find(header_.begin(), header_.end(), name);
  if (it == header_.end()) return -1;
  return static_cast<int>(it - header_.begin());
}

// ── Accessors ─────────────────────────────────────────────────────────────

std::vector<std::string> Csv::GetHeader() const { return header_; }

std::vector<std::map<std::string, std::string>> Csv::GetData() const {
  std::vector<std::map<std::string, std::string>> result;
  result.reserve(rows_.size());
  for (const auto& row : rows_) {
    std::map<std::string, std::string> m;
    for (size_t i = 0; i < header_.size(); ++i) m[header_[i]] = row[i];
    result.push_back(std::move(m));
  }
  return result;
}

int Csv::TotalRows() const { return static_cast<int>(rows_.size()); }
int Csv::TotalColumns() const { return static_cast<int>(header_.size()); }

std::map<std::string, std::string> Csv::GetRow(int index) const {
  if (index < 0 || index >= TotalRows())
    throw std::out_of_range("Row index out of range");
  std::map<std::string, std::string> m;
  const auto& row = rows_[static_cast<size_t>(index)];
  for (size_t i = 0; i < header_.size(); ++i) m[header_[i]] = row[i];
  return m;
}

std::vector<std::string> Csv::GetColumn(const std::string& column_name) const {
  int idx = ColumnIndex(column_name);
  if (idx < 0) throw std::invalid_argument("Column not found: " + column_name);
  std::vector<std::string> result;
  result.reserve(rows_.size());
  for (const auto& row : rows_)
    result.push_back(row[static_cast<size_t>(idx)]);
  return result;
}

std::string Csv::GetCell(const std::string& column_name, int index) const {
  int col = ColumnIndex(column_name);
  if (col < 0) throw std::invalid_argument("Column not found: " + column_name);
  if (index < 0 || index >= TotalRows())
    throw std::out_of_range("Row index out of range");
  return rows_[static_cast<size_t>(index)][static_cast<size_t>(col)];
}

// ── Mutators ──────────────────────────────────────────────────────────────

int Csv::AddRow(const std::vector<std::string>& row) {
  if (static_cast<int>(row.size()) != TotalColumns()) return kRowSizeMismatch;
  rows_.push_back(row);
  return kOk;
}

int Csv::AddRow(const std::map<std::string, std::string>& row) {
  if (static_cast<int>(row.size()) != TotalColumns()) return kRowSizeMismatch;
  for (const auto& key : header_) {
    if (row.find(key) == row.end()) return kDifferentKeys;
  }
  std::vector<std::string> new_row;
  new_row.reserve(header_.size());
  for (const auto& key : header_) new_row.push_back(row.at(key));
  rows_.push_back(std::move(new_row));
  return kOk;
}

int Csv::AddColumn(const std::string& column_name,
                   const std::vector<std::string>& column) {
  if (static_cast<int>(column.size()) != TotalRows()) return kColumnSizeMismatch;
  header_.push_back(column_name);
  for (size_t i = 0; i < rows_.size(); ++i) rows_[i].push_back(column[i]);
  return kOk;
}

void Csv::SetCellValue(const std::string& column_name, int index,
                       const std::string& value) {
  int col = ColumnIndex(column_name);
  if (col < 0) return;
  if (index < 0 || index >= TotalRows()) return;
  rows_[static_cast<size_t>(index)][static_cast<size_t>(col)] = value;
}

int Csv::RemoveRow(int index) {
  if (index < 0 || index >= TotalRows()) return kRowNotFound;
  rows_.erase(rows_.begin() + index);
  return kOk;
}

int Csv::RemoveColumn(const std::string& column_name) {
  int col = ColumnIndex(column_name);
  if (col < 0) return kColumnNotFound;
  header_.erase(header_.begin() + col);
  for (auto& row : rows_)
    row.erase(row.begin() + col);
  return kOk;
}

// ── Serialisation ─────────────────────────────────────────────────────────

int Csv::LoadFromString(const std::string& csv_string, bool has_header,
                        char separator, char quote_char) {
  header_.clear();
  rows_.clear();

  // Strip UTF-8 BOM if present
  std::string content = csv_string;
  if (content.size() >= 3 &&
      static_cast<unsigned char>(content[0]) == 0xEF &&
      static_cast<unsigned char>(content[1]) == 0xBB &&
      static_cast<unsigned char>(content[2]) == 0xBF) {
    content = content.substr(3);
  }

  auto parsed = ParseCsv(content, separator, quote_char);
  if (parsed.empty()) return kOk;

  if (has_header) {
    header_ = std::move(parsed[0]);
    rows_.reserve(parsed.size() - 1);
    for (size_t i = 1; i < parsed.size(); ++i) {
      parsed[i].resize(header_.size());  // pad/truncate to match header
      rows_.push_back(std::move(parsed[i]));
    }
  } else {
    size_t width = parsed[0].size();
    header_.reserve(width);
    for (size_t i = 0; i < width; ++i) header_.push_back(std::to_string(i));
    rows_.reserve(parsed.size());
    for (auto& r : parsed) {
      r.resize(width);
      rows_.push_back(std::move(r));
    }
  }

  return kOk;
}

std::string Csv::ToString(bool has_header, char separator,
                          char quote_char) const {
  std::ostringstream oss;

  if (has_header) {
    for (size_t i = 0; i < header_.size(); ++i) {
      if (i > 0) oss << separator;
      oss << SerialiseField(header_[i], separator, quote_char);
    }
    oss << '\n';
  }

  for (const auto& row : rows_) {
    for (size_t i = 0; i < row.size(); ++i) {
      if (i > 0) oss << separator;
      oss << SerialiseField(row[i], separator, quote_char);
    }
    oss << '\n';
  }

  return oss.str();
}

int Csv::Load(const std::string& file_name, bool has_header, char separator,
              char quote_char) {
  std::ifstream f(file_name);
  if (!f.is_open()) return kFileNotReadable;
  std::string content((std::istreambuf_iterator<char>(f)),
                      std::istreambuf_iterator<char>());
  return LoadFromString(content, has_header, separator, quote_char);
}

int Csv::Save(const std::string& file_name, bool has_header, char separator,
              char quote_char) const {
  std::ofstream f(file_name);
  if (!f.is_open()) return kFileNotWritable;
  f << ToString(has_header, separator, quote_char);
  return f.fail() ? kFileNotWritable : kOk;
}

}  // namespace mc
