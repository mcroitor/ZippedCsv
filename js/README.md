# Zipped CSV for JavaScript / TypeScript

TypeScript implementation of the Zipped CSV format.

## Features

- `Csv` class for CSV operations in memory and on disk
- `ZippedCsv` class for working with `.zcsv` archives
- Optional `metadata.json` support
- Fault-tolerant metadata parsing (invalid metadata falls back to safe defaults and is repaired on save)

## Quick start

From repository root:

```bash
cd js
npm install
npm test
```

## Examples

From the `js/` directory:

```bash
npx tsx examples/zcsv_create.ts sample.zcsv
npx tsx examples/zcsv_append.ts sample.zcsv path/to/file.csv
npx tsx examples/zcsv_status.ts sample.zcsv
npx tsx examples/zcsv_print.ts sample.zcsv 0
```

## API

### `Csv`

```typescript
import { Csv } from "zippedcsv";

// Construct from 2D array (first row = header) or array of objects
const csv = new Csv([["a", "b", "c"], ["1", "2", "3"]]);

csv.getHeader()                            // string[]
csv.getData()                              // Record<string, string>[]
csv.totalRows()                            // number
csv.totalColumns()                         // number
csv.getRow(index)                          // Record<string, string>
csv.getColumn(columnName)                  // string[]
csv.getCell(columnName, index)             // string

csv.addRow(row)                            // number (error code)
csv.addColumn(columnName, column)          // number (error code)
csv.setCellValue(columnName, index, value) // void
csv.removeRow(index)                       // number (error code)
csv.removeColumn(columnName)               // number (error code)

csv.loadFromString(str, hasHeader?, sep?, quoteChar?)  // number
csv.toString(hasHeader?, sep?, quoteChar?)             // string
csv.load(filePath, hasHeader?, sep?, quoteChar?)       // number
csv.save(filePath, hasHeader?, sep?, quoteChar?)       // number
```

Error codes: `Csv.CSV_OK`, `CSV_FILE_NOT_READABLE`, `CSV_FILE_NOT_WRITABLE`, `CSV_ROW_SIZE_MISMATCH`, `CSV_COLUMN_SIZE_MISMATCH`, `CSV_DIFFERENT_KEYS`, `CSV_COLUMN_NOT_FOUND`, `CSV_ROW_NOT_FOUND`.

Default separator is `";"`, default quote char is `"\"`.

### `ZippedCsv`

```typescript
import { ZippedCsv } from "zippedcsv";

const zcsv = new ZippedCsv("archive.zcsv"); // loads if exists, creates otherwise

zcsv.getTableNames()           // string[]
zcsv.getMetadata()             // ZcsvMetadata (copy)
zcsv.setMetadata(partial)      // void — enables metadata.json on save
zcsv.getCsv(fileName)          // Csv — ".csv" extension optional
zcsv.addCsv(fileName, csv)     // void
zcsv.removeCsv(fileName)       // void
zcsv.save()                    // void — writes the .zcsv archive
zcsv.close()                   // void — no-op, provided for API parity
```

`ZcsvMetadata` fields: `title`, `description`, `author`, `createdAt`, `updatedAt`, `delimiter` (default `","`), `quoteChar` (default `"\""`), `hasHeader` (default `true`).
