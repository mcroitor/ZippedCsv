#include <catch2/catch_all.hpp>

#include <filesystem>
#include <string>

#include "csv.h"

using namespace mc;

// ── Default constructor ────────────────────────────────────────────────────
TEST_CASE("Default constructor creates empty table", "[csv]") {
  Csv csv;
  CHECK(csv.TotalRows() == 0);
  CHECK(csv.TotalColumns() == 0);
  CHECK(csv.GetHeader().empty());
}

// ── 2-D array constructor ─────────────────────────────────────────────────
TEST_CASE("2-D array constructor sets header and rows", "[csv]") {
  Csv csv({{"Name", "Age"}, {"Alice", "30"}, {"Bob", "25"}});
  CHECK(csv.TotalColumns() == 2);
  CHECK(csv.TotalRows() == 2);
  CHECK(csv.GetHeader()[0] == "Name");
  CHECK(csv.GetCell("Age", 1) == "25");
}

TEST_CASE("2-D array constructor throws on mismatched row width", "[csv]") {
  CHECK_THROWS_AS((Csv({{"A", "B"}, {"only_one"}})),
                  std::invalid_argument);
}

// ── AddRow (vector) ────────────────────────────────────────────────────────
TEST_CASE("AddRow vector appends a row", "[csv]") {
  Csv csv({{"A", "B"}, {"1", "2"}});
  CHECK(csv.AddRow(std::vector<std::string>{"3", "4"}) == Csv::kOk);
  CHECK(csv.TotalRows() == 2);
  CHECK(csv.GetCell("B", 1) == "4");
}

TEST_CASE("AddRow vector returns kRowSizeMismatch on wrong size", "[csv]") {
  Csv csv({{"A", "B"}, {"1", "2"}});
  CHECK(csv.AddRow(std::vector<std::string>{"3"}) == Csv::kRowSizeMismatch);
}

// ── AddRow (map) ───────────────────────────────────────────────────────────
TEST_CASE("AddRow map appends a row by column name", "[csv]") {
  Csv csv({{"X", "Y"}, {"a", "b"}});
  CHECK(csv.AddRow(std::map<std::string,std::string>{{"X", "c"}, {"Y", "d"}}) == Csv::kOk);
  CHECK(csv.GetCell("X", 1) == "c");
}

TEST_CASE("AddRow map returns kDifferentKeys on missing key", "[csv]") {
  Csv csv({{"X", "Y"}, {"a", "b"}});
  CHECK(csv.AddRow(std::map<std::string,std::string>{{"X", "c"}, {"Z", "d"}}) == Csv::kDifferentKeys);
}

// ── AddColumn ─────────────────────────────────────────────────────────────
TEST_CASE("AddColumn appends a column", "[csv]") {
  Csv csv({{"A"}, {"1"}, {"2"}});
  CHECK(csv.AddColumn("B", {"x", "y"}) == Csv::kOk);
  CHECK(csv.TotalColumns() == 2);
  CHECK(csv.GetCell("B", 0) == "x");
}

TEST_CASE("AddColumn returns kColumnSizeMismatch on wrong size", "[csv]") {
  Csv csv({{"A"}, {"1"}});
  CHECK(csv.AddColumn("B", {"x", "y"}) == Csv::kColumnSizeMismatch);
}

// ── RemoveRow ─────────────────────────────────────────────────────────────
TEST_CASE("RemoveRow removes the correct row", "[csv]") {
  Csv csv({{"A"}, {"1"}, {"2"}, {"3"}});
  CHECK(csv.RemoveRow(1) == Csv::kOk);
  CHECK(csv.TotalRows() == 2);
  CHECK(csv.GetCell("A", 1) == "3");
}

TEST_CASE("RemoveRow returns kRowNotFound on bad index", "[csv]") {
  Csv csv({{"A"}, {"1"}});
  CHECK(csv.RemoveRow(5) == Csv::kRowNotFound);
  CHECK(csv.RemoveRow(-1) == Csv::kRowNotFound);
}

// ── RemoveColumn ──────────────────────────────────────────────────────────
TEST_CASE("RemoveColumn removes the correct column", "[csv]") {
  Csv csv({{"A", "B"}, {"1", "2"}});
  CHECK(csv.RemoveColumn("A") == Csv::kOk);
  CHECK(csv.TotalColumns() == 1);
  CHECK(csv.GetHeader()[0] == "B");
}

TEST_CASE("RemoveColumn returns kColumnNotFound on unknown name", "[csv]") {
  Csv csv({{"A"}, {"1"}});
  CHECK(csv.RemoveColumn("Z") == Csv::kColumnNotFound);
}

// ── SetCellValue ──────────────────────────────────────────────────────────
TEST_CASE("SetCellValue updates a cell", "[csv]") {
  Csv csv({{"V"}, {"old"}});
  csv.SetCellValue("V", 0, "new");
  CHECK(csv.GetCell("V", 0) == "new");
}

// ── GetColumn ─────────────────────────────────────────────────────────────
TEST_CASE("GetColumn returns all values for a column", "[csv]") {
  Csv csv({{"C"}, {"x"}, {"y"}, {"z"}});
  auto col = csv.GetColumn("C");
  REQUIRE(col.size() == 3);
  CHECK(col[2] == "z");
}

TEST_CASE("GetColumn throws on unknown column", "[csv]") {
  Csv csv({{"C"}, {"x"}});
  CHECK_THROWS_AS(csv.GetColumn("Z"), std::invalid_argument);
}

// ── GetRow ────────────────────────────────────────────────────────────────
TEST_CASE("GetRow returns a map of column->value", "[csv]") {
  Csv csv({{"A", "B"}, {"1", "2"}});
  auto row = csv.GetRow(0);
  CHECK(row["A"] == "1");
  CHECK(row["B"] == "2");
}

TEST_CASE("GetRow throws on bad index", "[csv]") {
  Csv csv({{"A"}, {"1"}});
  CHECK_THROWS_AS(csv.GetRow(99), std::out_of_range);
}

// ── LoadFromString / ToString round-trip ──────────────────────────────────
TEST_CASE("LoadFromString parses standard CSV", "[csv]") {
  Csv csv;
  int rc = csv.LoadFromString("Name;Age\nAlice;30\nBob;25\n");
  REQUIRE(rc == Csv::kOk);
  CHECK(csv.TotalRows() == 2);
  CHECK(csv.GetCell("Name", 0) == "Alice");
}

TEST_CASE("LoadFromString handles quoted fields with embedded delimiters",
          "[csv]") {
  Csv csv;
  csv.LoadFromString("A;B\n\"he;llo\";world\n");
  CHECK(csv.GetCell("A", 0) == "he;llo");
}

TEST_CASE("LoadFromString handles doubled-quote escaping", "[csv]") {
  Csv csv;
  csv.LoadFromString("A\n\"say \"\"hi\"\"\"\n");
  CHECK(csv.GetCell("A", 0) == "say \"hi\"");
}

TEST_CASE("ToString round-trip preserves data", "[csv]") {
  Csv orig({{"Name", "Score"}, {"Alice", "95"}, {"Bob", "80"}});
  std::string s = orig.ToString();
  Csv copy;
  copy.LoadFromString(s);
  CHECK(copy.TotalRows() == orig.TotalRows());
  CHECK(copy.GetCell("Score", 0) == "95");
}

TEST_CASE("LoadFromString comma-separated with comma delimiter", "[csv]") {
  Csv csv;
  csv.LoadFromString("A,B\n1,2\n", true, ',');
  CHECK(csv.GetCell("B", 0) == "2");
}

// ── Load / Save file ──────────────────────────────────────────────────────
TEST_CASE("Save writes a file and Load reads it back", "[csv]") {
  namespace fs = std::filesystem;
  std::string path = (fs::temp_directory_path() / "test_csv_roundtrip.csv").string();

  Csv orig({{"X", "Y"}, {"10", "20"}});
  REQUIRE(orig.Save(path) == Csv::kOk);

  Csv loaded;
  REQUIRE(loaded.Load(path) == Csv::kOk);
  CHECK(loaded.GetCell("Y", 0) == "20");

  fs::remove(path);
}

TEST_CASE("Load returns kFileNotReadable for missing file", "[csv]") {
  Csv csv;
  CHECK(csv.Load("/nonexistent/path/to/file.csv") == Csv::kFileNotReadable);
}
