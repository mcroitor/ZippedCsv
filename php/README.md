# Zipped CSV

## Introduction

A small PHP library to work with zipped CSV files.

## Dependencies

- PHP 7.4 or higher
- Zip extension for PHP

## Examples of usage

### Create a zipped CSV file

```php
use \mc\ZippedCsv;

$zcsv = new ZippedCsv('zipped_csv_file.zcsv');
$csv = new Csv([
    ['a', 'b', 'c'],
    ['1', '2', '3']
]);

$zcsv->AddCsv("sample.csv", $csv);

// You can pass table name with or without ".csv" extension.
// AddCsv("sample", $csv) and AddCsv("sample.csv", $csv) are equivalent.

$zcsv->Save();
$zcsv->Close();
```

### Read a zipped CSV file

```php
use \mc\ZippedCsv;

$zcsv = new ZippedCsv('zipped_csv_file.zcsv');

$csvFiles = $zcsv->GetTableNames();
// Table names returned by GetTableNames() preserve the names stored in archive
// (for example: "sample.csv").

foreach ($csvFiles as $csvFile) {
    $csv = $zcsv->GetCsv($csvFile);
    $header = $csv->GetHeader();
    $rows = $csv->GetRows();
    // Do something with the header and rows
    echo "CSV file: $csvFile" . PHP_EOL;
    echo "Header: " . json_encode($header) . PHP_EOL;
    echo "Rows: " . json_encode($rows) . PHP_EOL;
}
```

## API description

### Csv class

```php

namespace mc;

class Csv
{
    public const SEPARATOR = ';';
    public const QUOTE_CHAR = '"';

    public const CSV_OK = 0;
    public const CSV_FILE_NOT_READABLE = 2;
    public const CSV_FILE_NOT_WRITABLE = 3;
    public const CSV_ROW_SIZE_MISMATCH = 4;
    public const CSV_COLUMN_SIZE_MISMATCH = 5;
    public const CSV_DIFFERENT_KEYS = 6;
    public const CSV_COLUMN_NOT_FOUND = 7;
    public const CSV_ROW_NOT_FOUND = 8;

    /**
     * Construct a CSV / Matrix instance
     */
    public function __construct(array $data = []);

    /**
     * Returns the header of the CSV data
     * @return array
     */
    public function GetHeader(): array;

    /**
     * All data as array of arrays
     * @return array
     */
    public function GetData(): array;

    /**
     * Number of lines in the CSV
     * @return int
     */
    public function TotalRows(): int;

    /**
     * Number of columns in the CSV
     * @return int
     */
    public function TotalColumns(): int;

    /**
     * Get row by index number
     * @param $index
     * @return array
     */
    public function GetRow(int $index): array;

    /**
     * Get column by column name
     * @param $columnName
     * @return array
     */
    public function GetColumn(string $columnName): array;

    /**
     * @param $columnName
     * @param $index
     * @return mixed cell value
     */
    public function GetCell(string $columnName, int $index): string;

    /**
     * Add a row to the CSV
     * @param array $row
     * @return int error code, 0 if no error
     */
    public function AddRow(array $row): int;

    /**
     * Add a column to the CSV
     * @param string $columnName
     * @param array $column
     * @return int error code, 0 if no error
     */
    public function AddColumn(string $columnName, array $column): int;

    /**
     * Set a cell value
     * @param string $columnName
     * @param int $index
     * @param string $value
     */
    public function SetCellValue(string $columnName, int $index, string $value): void;

    /**
     * Remove a row by index
     * @param int $index
     * @return int error code, 0 if no error
     */
    public function RemoveRow(int $index): int;

    /**
     * Remove a column by name
     * @param string $columnName
     * @return int error code, 0 if no error
     */
    public function RemoveColumn(string $columnName): int;

    /**
     * Save CSV into file
     * @param $fileName
     * @param $hasHeader default is true
     * @param $separator CSV separator, default ';'
     * @param $quoteChar CSV quote character, default '"'
     * @return int error code, 0 if no error
     */
    public function Save(
        string $fileName,
        bool $hasHeader = true,
        string $separator = Csv::SEPARATOR,
        string $quoteChar = Csv::QUOTE_CHAR
    ): int;

    /**
     * Load a CSV from a file
     * @param string $fileName
     * @param bool $hasHeader default is true
     * @param string $separator default is ';'
     * @param string $quoteChar default is '"'
     * @return int error code, 0 if no error
     */
    public function Load(
        string $fileName,
        bool $hasHeader = true,
        string $separator = Csv::SEPARATOR,
        string $quoteChar = Csv::QUOTE_CHAR
    ): int;

    /**
     * Load a CSV from a string
     * @param string $csvString
     * @param bool $hasHeader default is true
     * @param string $separator default is ';'
     * @param string $quoteChar default is '"'
     * @return int error code, 0 if no error
     */
    public function LoadFromString(
        string $csvString,
        bool $hasHeader = true,
        string $separator = Csv::SEPARATOR,
        string $quoteChar = Csv::QUOTE_CHAR
    ): int;

    /**
     * Convert the CSV to a string
     * @param bool $hasHeader default is true
     * @param string $separator default is ';'
     * @param string $quoteChar default is '"'
     * @return string
     */
    public function ToString(
        bool $hasHeader = true,
        string $separator = Csv::SEPARATOR,
        string $quoteChar = Csv::QUOTE_CHAR
    ): string;

    /**
     * Helper function, quote a string with a quoteChar
     * @param string $value
     * @param string $quoteChar default is double quote
     * @return string
     */
    public static function Quote(string $value, string $quoteChar = Csv::QUOTE_CHAR): string;

    /**
     * Helper function, unquote a string with a quoteChar
     * @param string $value
     * @param string $quoteChar default is double quote
     * @return string
     */
    public static function Unquote(string $value, string $quoteChar = Csv::QUOTE_CHAR): string;
}
```

### ZippedCsv class

```php
namespace mc;

class ZippedCsv {

    private $csv = [];
    private $zip = null;

    /**
     * ZippedCsv constructor.
     * @param string $zipFile path to the zipped CSV files
     */
    public function __construct(string $zipFile);

    /**
     * Get the names of the tables in the zip file
     * @return array
     */
    public function GetTableNames(): array;

    /**
     * Get zcsv metadata.
     * If metadata.json is missing, default metadata is returned.
     * @return array
     */
    public function GetMetadata(): array;

    /**
     * Set zcsv metadata and mark metadata.json for persistence.
     * @param array $metadata
     */
    public function SetMetadata(array $metadata): void;

    /**
     * Note: $fileName in GetCsv/AddCsv/RemoveCsv accepts both forms:
     * "sample" and "sample.csv".
     */

    /**
     * Get the Csv object from the zip file
     * @param string $fileName
     * @return Csv
     * @throws \Exception
     */
    public function GetCsv(string $fileName): Csv;

    /**
     * Add a Csv object to the zip file
        * @param string $fileName table name, with or without ".csv" extension
     * @param Csv $csv
     */
    public function AddCsv(string $fileName, Csv $csv);

    /**
     * Remove a Csv object from the zip file
     * @param string $fileName
     */
    public function RemoveCsv(string $fileName);

    /**
     * Save the Csv objects to the zip file
     */
    public function Save();

    /**
     * Note: metadata.json is optional.
     * It is written only after SetMetadata(...) is called.
        * If metadata.json is malformed, safe defaults are used in memory
        * and corrected metadata.json is written on Save().
     */

    /**
     * Close the zip file
     */
    public function Close();
};
```
