# ZippedCsv — C++ Implementation

C++17 implementation of the [Zipped CSV](../../README.md) format.
Provides a static library, a shared library, and four command-line tools.

## Requirements

- GCC ≥ 11 (C++17), available via MSYS2 mingw64
- CMake ≥ 3.16
- MSYS2 packages: `mingw-w64-x86_64-libzip`, `mingw-w64-x86_64-nlohmann-json`,
  `mingw-w64-x86_64-catch` (Catch2 v3)

Install missing packages once:

```bash
pacman -S --needed mingw-w64-x86_64-libzip mingw-w64-x86_64-nlohmann-json \
                   mingw-w64-x86_64-catch mingw-w64-x86_64-cmake
```

## Build

From the MSYS2 mingw64 shell (or via the provided Makefile):

```bash
cd cpp
make          # configure + build
make test     # build + run tests
make clean    # remove build/ directory
```

Outputs inside `build/`:

| Target | Description |
|--------|-------------|
| `libzippedcsv.a` | Static library |
| `libzippedcsv.dll` | Shared library |
| `zcsv_create.exe` | Create a new archive |
| `zcsv_append.exe` | Append a row to a table |
| `zcsv_status.exe` | Print archive metadata and table summary |
| `zcsv_print.exe` | Print table contents |

## API

### `mc::Csv`

In-memory CSV table.

```cpp
#include "csv.h"
using namespace mc;

// Construct from 2-D array (first row = header)
Csv csv({{"Name", "Age"}, {"Alice", "30"}});

// Parse from string
Csv csv2;
csv2.LoadFromString("Name,Age\nBob,25\n", true, ',');

// Access
csv.TotalRows();                  // 1
csv.TotalColumns();               // 2
csv.GetCell("Name", 0);           // "Alice"
csv.GetRow(0);                    // map<string,string>
csv.GetColumn("Age");             // vector<string>
csv.GetHeader();                  // vector<string>
csv.GetData();                    // vector<map<string,string>>

// Mutate
csv.AddRow({"Carol", "22"});
csv.AddRow({{"Name","Dave"},{"Age","33"}});
csv.AddColumn("Score", {"95"});
csv.SetCellValue("Age", 0, "31");
csv.RemoveRow(0);
csv.RemoveColumn("Score");

// Serialise
std::string s = csv.ToString(true, ',');
csv.Save("/path/to/file.csv");
csv.Load("/path/to/file.csv");
```

**Error codes** (returned by mutating methods):

| Constant | Value | Meaning |
|----------|-------|---------|
| `kOk` | 0 | Success |
| `kFileNotReadable` | 2 | Cannot open file for reading |
| `kFileNotWritable` | 3 | Cannot open file for writing |
| `kRowSizeMismatch` | 4 | Row has wrong number of fields |
| `kColumnSizeMismatch` | 5 | Column has wrong number of values |
| `kDifferentKeys` | 6 | Map row has unexpected keys |
| `kColumnNotFound` | 7 | Named column does not exist |
| `kRowNotFound` | 8 | Row index out of range |

### `mc::ZippedCsv`

ZIP-based archive of named CSV tables with optional metadata.

```cpp
#include "zippedcsv.h"
using namespace mc;

// Open or create
ZippedCsv z("archive.zcsv");

// Metadata
Metadata meta;
meta.title = "My Dataset";
meta.delimiter = ',';
z.SetMetadata(meta);

// Add / retrieve tables
z.AddCsv("people", csv);
Csv& t = z.GetCsv("people");   // throws std::invalid_argument if missing
z.RemoveCsv("people");

// List tables
for (auto& name : z.GetTableNames()) { ... }

// Persist
z.Save();   // returns 0 on success
z.Close();  // no-op (RAII)
```

## Example tools

```bash
./zcsv_create   output.zcsv
./zcsv_status   output.zcsv
./zcsv_print    output.zcsv [table_name]
./zcsv_append   output.zcsv people Alice 30 "New York"
```

## Project structure

```
cpp/
├── CMakeLists.txt
├── Makefile
├── src/
│   ├── csv.h / csv.cpp
│   └── zippedcsv.h / zippedcsv.cpp
├── examples/
│   ├── zcsv_create.cpp
│   ├── zcsv_append.cpp
│   ├── zcsv_status.cpp
│   └── zcsv_print.cpp
└── tests/
    ├── test_csv.cpp
    └── test_zippedcsv.cpp
```
