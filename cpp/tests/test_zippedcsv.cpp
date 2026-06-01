#include <catch2/catch_all.hpp>

#include <cstring>
#include <filesystem>
#include <string>

#include <zip.h>

#include "csv.h"
#include "zippedcsv.h"

using namespace mc;

namespace fs = std::filesystem;

static std::string TmpPath(const std::string& name) {
  return (fs::temp_directory_path() / name).string();
}

// ── Add, save, reload without metadata ───────────────────────────────────
TEST_CASE("Save and reload single CSV without metadata", "[mc]") {
  std::string path = TmpPath("zcsvtest_basic.zcsv");
  fs::remove(path);

  {
    ZippedCsv z(path);
    Csv csv({{"Col"}, {"hello"}});
    z.AddCsv("data", csv);
    REQUIRE(z.Save() == 0);
  }

  ZippedCsv z2(path);
  auto names = z2.GetTableNames();
  REQUIRE(names.size() == 1);
  CHECK(names[0] == "data.csv");
  CHECK(z2.GetCsv("data").GetCell("Col", 0) == "hello");

  fs::remove(path);
}

// ── Metadata persists and drives delimiter ────────────────────────────────
TEST_CASE("Metadata is stored and reloaded", "[mc]") {
  std::string path = TmpPath("zcsvtest_meta.zcsv");
  fs::remove(path);

  {
    ZippedCsv z(path);
    Metadata m;
    m.title = "My Dataset";
    m.author = "Tester";
    m.delimiter = ',';
    m.has_header = true;
    z.SetMetadata(m);

    Csv csv;
    csv.LoadFromString("A,B\n1,2\n", true, ',');
    z.AddCsv("table", csv);
    REQUIRE(z.Save() == 0);
  }

  ZippedCsv z2(path);
  CHECK(z2.GetMetadata().title == "My Dataset");
  CHECK(z2.GetMetadata().author == "Tester");
  CHECK(z2.GetMetadata().delimiter == ',');
  CHECK(z2.GetCsv("table").GetCell("B", 0) == "2");

  fs::remove(path);
}

// ── Invalid JSON metadata falls back to defaults ──────────────────────────
TEST_CASE("Invalid metadata JSON recovers with defaults",
          "[mc]") {
  // Build a ZIP manually with broken metadata.json via libzip
  std::string path = TmpPath("zcsvtest_badmeta.zcsv");
  fs::remove(path);

  int err = 0;
  zip_t* z_raw = zip_open(path.c_str(), ZIP_CREATE | ZIP_TRUNCATE, &err);
  REQUIRE(z_raw != nullptr);

  const char* bad_meta = "this is {not valid json";
  zip_source_t* s1 =
      zip_source_buffer(z_raw, bad_meta, strlen(bad_meta), 0);
  zip_file_add(z_raw, "metadata.json", s1, ZIP_FL_OVERWRITE);

  const char* csv_data = "X;Y\na;b\n";
  zip_source_t* s2 =
      zip_source_buffer(z_raw, csv_data, strlen(csv_data), 0);
  zip_file_add(z_raw, "table.csv", s2, ZIP_FL_OVERWRITE);

  zip_close(z_raw);

  ZippedCsv z(path);
  // Should not throw; delimiter falls back to ','
  CHECK(z.GetMetadata().delimiter == ',');
  // CSV should still be loaded (uses default delimiter, table content will
  // have raw semicolons inside a single column — that is expected behaviour)
  CHECK(z.GetTableNames().size() == 1);

  fs::remove(path);
}

// ── Files in subdirectories are ignored ───────────────────────────────────
TEST_CASE("Non-root CSV entries are ignored", "[mc]") {
  std::string path = TmpPath("zcsvtest_subdir.zcsv");
  fs::remove(path);

  int err = 0;
  zip_t* z_raw = zip_open(path.c_str(), ZIP_CREATE | ZIP_TRUNCATE, &err);
  REQUIRE(z_raw != nullptr);

  const char* csv_data = "A\n1\n";
  zip_source_t* s_root =
      zip_source_buffer(z_raw, csv_data, strlen(csv_data), 0);
  zip_file_add(z_raw, "root.csv", s_root, ZIP_FL_OVERWRITE);

  zip_source_t* s_sub =
      zip_source_buffer(z_raw, csv_data, strlen(csv_data), 0);
  zip_file_add(z_raw, "sub/ignored.csv", s_sub, ZIP_FL_OVERWRITE);

  zip_close(z_raw);

  ZippedCsv z(path);
  auto names = z.GetTableNames();
  CHECK(names.size() == 1);
  CHECK(names[0] == "root.csv");

  fs::remove(path);
}

// ── Extension normalisation ───────────────────────────────────────────────
TEST_CASE("AddCsv appends .csv if missing", "[mc]") {
  std::string path = TmpPath("zcsvtest_ext.zcsv");
  fs::remove(path);

  ZippedCsv z(path);
  z.AddCsv("mydata", Csv({{"K"}, {"v"}}));
  auto names = z.GetTableNames();
  REQUIRE(names.size() == 1);
  CHECK(names[0] == "mydata.csv");

  fs::remove(path);
}

TEST_CASE("AddCsv keeps .csv if already present", "[mc]") {
  std::string path = TmpPath("zcsvtest_extkeep.zcsv");
  fs::remove(path);

  ZippedCsv z(path);
  z.AddCsv("already.csv", Csv({{"K"}, {"v"}}));
  CHECK(z.GetTableNames()[0] == "already.csv");

  fs::remove(path);
}

// ── RemoveCsv ─────────────────────────────────────────────────────────────
TEST_CASE("RemoveCsv removes the table", "[mc]") {
  std::string path = TmpPath("zcsvtest_remove.zcsv");
  fs::remove(path);

  ZippedCsv z(path);
  z.AddCsv("a", Csv({{"K"}, {"1"}}));
  z.AddCsv("b", Csv({{"K"}, {"2"}}));
  z.RemoveCsv("a");
  auto names = z.GetTableNames();
  CHECK(names.size() == 1);
  CHECK(names[0] == "b.csv");

  fs::remove(path);
}

// ── GetCsv throws on unknown table ────────────────────────────────────────
TEST_CASE("GetCsv throws std::invalid_argument for unknown table",
          "[mc]") {
  ZippedCsv z("");
  CHECK_THROWS_AS(z.GetCsv("nonexistent"), std::invalid_argument);
}

// ── GetMetadata returns a copy ────────────────────────────────────────────
TEST_CASE("GetMetadata returns independent copy", "[mc]") {
  ZippedCsv z("");
  Metadata m = z.GetMetadata();
  m.title = "modified";
  CHECK(z.GetMetadata().title.empty());
}

// ── Invalid delimiter is normalised ───────────────────────────────────────
TEST_CASE("SetMetadata normalises invalid delimiter to comma", "[mc]") {
  ZippedCsv z("");
  Metadata m;
  m.delimiter = '\0';
  z.SetMetadata(m);
  CHECK(z.GetMetadata().delimiter == ',');
}

// ── Parent directory creation ─────────────────────────────────────────────
TEST_CASE("Save creates missing parent directories", "[mc]") {
  std::string path =
      TmpPath("zcsvtest_newdir/subdir/archive.zcsv");
  // Ensure parent does not exist
  fs::remove_all(TmpPath("zcsvtest_newdir"));

  ZippedCsv z(path);
  z.AddCsv("t", Csv({{"C"}, {"1"}}));
  CHECK(z.Save() == 0);
  CHECK(fs::exists(path));

  fs::remove_all(TmpPath("zcsvtest_newdir"));
}
