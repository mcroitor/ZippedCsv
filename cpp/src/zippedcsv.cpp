#include "zippedcsv.h"

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <sstream>

#include <nlohmann/json.hpp>
#include <zip.h>

namespace mc {

namespace {

// RAII wrapper so we never forget zip_close().
struct ZipCloser {
  void operator()(zip_t* z) const {
    if (z) zip_close(z);
  }
};
using ZipPtr = std::unique_ptr<zip_t, ZipCloser>;

// True for names that sit at the root level and have a .csv extension.
bool IsRootCsv(const std::string& name) {
  if (name.find('/') != std::string::npos || name.find('\\') != std::string::npos)
    return false;
  if (name.size() < 4) return false;
  std::string lower = name;
  std::transform(lower.begin(), lower.end(), lower.begin(),
                 [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return lower.compare(lower.size() - 4, 4, ".csv") == 0;
}

// Read all bytes from a zip entry by index into a std::string.
std::string ReadZipEntry(zip_t* z, zip_uint64_t index) {
  zip_stat_t st;
  zip_stat_init(&st);
  zip_stat_index(z, index, 0, &st);

  zip_file_t* f = zip_fopen_index(z, index, 0);
  if (!f) return {};

  std::string buf(st.size, '\0');
  zip_fread(f, buf.data(), st.size);
  zip_fclose(f);
  return buf;
}

}  // namespace

// ── Constructor ───────────────────────────────────────────────────────────

ZippedCsv::ZippedCsv(std::string path) : path_(std::move(path)) {
  // Normalise: if given a path without extension, add ".zcsv"
  if (!path_.empty()) {
    namespace fs = std::filesystem;
    fs::path p(path_);
    std::string ext = p.extension().string();
    // Convert extension to lower-case for comparison
    std::string lower_ext = ext;
    std::transform(lower_ext.begin(), lower_ext.end(), lower_ext.begin(),
                   ::tolower);
    if (lower_ext != ".zcsv" && lower_ext != ".zip") {
      path_ += ".zcsv";
    }

    if (fs::exists(path_)) {
      LoadExisting();
    }
  }
}

// ── Private ───────────────────────────────────────────────────────────────

std::string ZippedCsv::NormaliseName(const std::string& name) {
  std::string n = name;
  // Strip leading/trailing whitespace
  n.erase(0, n.find_first_not_of(" \t"));
  auto last = n.find_last_not_of(" \t");
  if (last != std::string::npos) n.erase(last + 1);
  // Ensure .csv extension
  std::string lower = n;
  std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
  if (lower.size() < 4 || lower.compare(lower.size() - 4, 4, ".csv") != 0) {
    n += ".csv";
  }
  return n;
}

bool ZippedCsv::IsValidDelimiter(char c) {
  return c != '\0' && c != '"' && c != '\'' && c != '\n' && c != '\r';
}

bool ZippedCsv::IsValidQuoteChar(char c) {
  return c == '"' || c == '\'';
}

void ZippedCsv::NormaliseMetadata() {
  if (!IsValidDelimiter(metadata_.delimiter)) metadata_.delimiter = ',';
  if (!IsValidQuoteChar(metadata_.quote_char)) metadata_.quote_char = '"';
}

void ZippedCsv::LoadExisting() {
  int err = 0;
  ZipPtr z(zip_open(path_.c_str(), ZIP_RDONLY, &err));
  if (!z) return;  // treat unopenable archive as empty

  zip_int64_t n = zip_get_num_entries(z.get(), 0);
  for (zip_int64_t i = 0; i < n; ++i) {
    const char* name_c = zip_get_name(z.get(), static_cast<zip_uint64_t>(i), 0);
    if (!name_c) continue;
    std::string entry_name(name_c);

    if (entry_name == kMetadataFilename) {
      std::string raw =
          ReadZipEntry(z.get(), static_cast<zip_uint64_t>(i));
      try {
        auto j = nlohmann::json::parse(raw);
        if (j.contains("title") && j["title"].is_string())
          metadata_.title = j["title"].get<std::string>();
        if (j.contains("description") && j["description"].is_string())
          metadata_.description = j["description"].get<std::string>();
        if (j.contains("author") && j["author"].is_string())
          metadata_.author = j["author"].get<std::string>();
        if (j.contains("createdAt") && j["createdAt"].is_string())
          metadata_.created_at = j["createdAt"].get<std::string>();
        if (j.contains("updatedAt") && j["updatedAt"].is_string())
          metadata_.updated_at = j["updatedAt"].get<std::string>();
        if (j.contains("delimiter") && j["delimiter"].is_string()) {
          std::string d = j["delimiter"].get<std::string>();
          if (!d.empty()) metadata_.delimiter = d[0];
        }
        if (j.contains("quoteChar") && j["quoteChar"].is_string()) {
          std::string qc = j["quoteChar"].get<std::string>();
          if (!qc.empty()) metadata_.quote_char = qc[0];
        }
        if (j.contains("hasHeader") && j["hasHeader"].is_boolean())
          metadata_.has_header = j["hasHeader"].get<bool>();
        NormaliseMetadata();
      } catch (...) {
        // Invalid JSON — keep defaults
        metadata_ = Metadata{};
      }
      continue;
    }

    if (IsRootCsv(entry_name)) {
      std::string content =
          ReadZipEntry(z.get(), static_cast<zip_uint64_t>(i));
      Csv csv;
      csv.LoadFromString(content, metadata_.has_header, metadata_.delimiter,
                         metadata_.quote_char);
      table_order_.push_back(entry_name);
      tables_.emplace(entry_name, std::move(csv));
    }
  }
}

// ── Accessors ─────────────────────────────────────────────────────────────

std::vector<std::string> ZippedCsv::GetTableNames() const {
  return table_order_;
}

Metadata ZippedCsv::GetMetadata() const { return metadata_; }
void ZippedCsv::SetMetadata(Metadata metadata) {
  metadata_ = std::move(metadata);
  NormaliseMetadata();
}

Csv& ZippedCsv::GetCsv(const std::string& table_name) {
  std::string norm = NormaliseName(table_name);
  auto it = tables_.find(norm);
  if (it == tables_.end())
    throw std::invalid_argument("Table not found: " + table_name);
  return it->second;
}

// ── Mutators ──────────────────────────────────────────────────────────────

void ZippedCsv::AddCsv(const std::string& table_name, Csv csv) {
  std::string norm = NormaliseName(table_name);
  if (tables_.find(norm) == tables_.end()) {
    table_order_.push_back(norm);
  }
  tables_[norm] = std::move(csv);
}

void ZippedCsv::RemoveCsv(const std::string& table_name) {
  std::string norm = NormaliseName(table_name);
  tables_.erase(norm);
  table_order_.erase(
      std::remove(table_order_.begin(), table_order_.end(), norm),
      table_order_.end());
}

// ── Persistence ───────────────────────────────────────────────────────────

int ZippedCsv::Save() const {
  if (path_.empty()) return kFileNotWritable;

  namespace fs = std::filesystem;
  fs::path p(path_);
  if (p.has_parent_path()) {
    std::error_code ec;
    fs::create_directories(p.parent_path(), ec);
    if (ec) return kFileNotWritable;
  }

  // Build all CSV content strings first (must stay alive until zip source
  // callbacks have been invoked).
  struct EntryData {
    std::string name;
    std::string content;
  };
  std::vector<EntryData> entries;

  // Metadata
  bool has_meta = !metadata_.title.empty() || !metadata_.description.empty() ||
                  !metadata_.author.empty() || !metadata_.created_at.empty() ||
                  !metadata_.updated_at.empty();
  if (has_meta) {
    nlohmann::json j;
    if (!metadata_.title.empty()) j["title"] = metadata_.title;
    if (!metadata_.description.empty()) j["description"] = metadata_.description;
    if (!metadata_.author.empty()) j["author"] = metadata_.author;
    if (!metadata_.created_at.empty()) j["createdAt"] = metadata_.created_at;
    if (!metadata_.updated_at.empty()) j["updatedAt"] = metadata_.updated_at;
    j["delimiter"] = std::string(1, metadata_.delimiter);
    j["quoteChar"] = std::string(1, metadata_.quote_char);
    j["hasHeader"] = metadata_.has_header;
    entries.push_back({kMetadataFilename, j.dump(2)});
  }

  // CSV tables
  for (const auto& name : table_order_) {
    auto it = tables_.find(name);
    if (it == tables_.end()) continue;
    entries.push_back(
        {name, it->second.ToString(metadata_.has_header, metadata_.delimiter,
                                   metadata_.quote_char)});
  }

  // Write ZIP
  // Remove old file first so libzip doesn't try to update it in place (which
  // can fail on Windows when the file is read-only or locked).
  if (fs::exists(path_)) {
    std::error_code ec;
    fs::remove(path_, ec);
  }

  int err = 0;
  ZipPtr z(zip_open(path_.c_str(), ZIP_CREATE | ZIP_TRUNCATE, &err));
  if (!z) return kFileNotWritable;

  for (const auto& e : entries) {
    zip_source_t* src = zip_source_buffer(z.get(), e.content.data(),
                                          e.content.size(), 0);
    if (!src) return kFileNotWritable;
    if (zip_file_add(z.get(), e.name.c_str(), src, ZIP_FL_OVERWRITE) < 0) {
      zip_source_free(src);
      return kFileNotWritable;
    }
  }

  return kOk;
}

void ZippedCsv::Close() {
  // In-memory only; nothing to do.
}

}  // namespace mc
