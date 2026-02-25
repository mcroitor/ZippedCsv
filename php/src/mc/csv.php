<?php

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

    private $data = [];
    private $header = [];

    /**
     * Construct a CSV / Matrix instance
     */
    public function __construct(array $data = [])
    {
        if (count($data) === 0) {
            return;
        }
        // if each row is not an array, throw an exception
        foreach ($data as $row) {
            if (!is_array($row)) {
                throw new \Exception('Each row must be an array');
            }
        }
        // validate that all rows have the same keys
        $keys = array_keys($data[0]);
        foreach ($data as $row) {
            if (array_keys($row) !== $keys) {
                throw new \Exception('All rows must have the same keys');
            }
        }
        // if keys are numeric and sequential, use the keys as header
        if (array_keys($data[0]) === range(0, count($data[0]) - 1)) {
            $this->header = array_shift($data);
            foreach ($data as $row) {
                $this->data[] = array_combine($this->header, $row);
            }
        } else {
            $this->header = array_keys($data[0]);
            $this->data = $data;
        }
    }

    /**
     * Returns the header of the CSV data
     * @return array
     */
    public function GetHeader(): array
    {
        return $this->header;
    }

    /**
     * All data as array of arrays
     * @return array
     */
    public function GetData(): array
    {
        return $this->data;
    }

    /**
     * Number of lines in the CSV
     * @return int
     */
    public function TotalRows(): int
    {
        return count($this->data);
    }

    /**
     * Number of columns in the CSV
     * @return int
     */
    public function TotalColumns(): int
    {
        return count($this->header);
    }

    /**
     * Get row by index number
     * @param $index
     * @return array
     */
    public function GetRow(int $index): array
    {
        return $this->data[$index];
    }

    /**
     * Get column by column name
     * @param $columnName
     * @return array
     */
    public function GetColumn(string $columnName): array
    {
        $result = [];
        foreach ($this->data as $row) {
            $result[] = $row[$columnName];
        }
        return $result;
    }

    /**
     * @param $columnName
     * @param $index
     * @return mixed cell value
     */
    public function GetCell(string $columnName, int $index): string
    {
        return $this->data[$index][$columnName];
    }

    /**
     * Add a row to the CSV
     * @param array $row
     * @return int error code, 0 if no error
     */
    public function AddRow(array $row): int
    {
        if (count($row) !== count($this->header)) {
            return self::CSV_ROW_SIZE_MISMATCH;
        }
        if (array_keys($row) === $this->header) {
            $this->data[] = $row;
        } else if (array_keys($row) === range(0, count($row) - 1)) {
            $this->data[] = array_combine($this->header, $row);
            return self::CSV_OK;
        }
        return self::CSV_DIFFERENT_KEYS;
    }

    /**
     * Add a column to the CSV
     * @param string $columnName
     * @param array $column
     * @return int error code, 0 if no error
     */
    public function AddColumn(string $columnName, array $column): int
    {
        if (count($column) !== count($this->data)) {
            return self::CSV_COLUMN_SIZE_MISMATCH;
        }
        $this->header[] = $columnName;
        foreach ($this->data as $index => $row) {
            $this->data[$index][$columnName] = $column[$index];
        }
        return self::CSV_OK;
    }

    /**
     * Set a cell value
     * @param string $columnName
     * @param int $index
     * @param string $value
     */
    public function SetCellValue(string $columnName, int $index, string $value): void
    {
        $this->data[$index][$columnName] = $value;
    }

    /**
     * Remove a row by index
     * @param int $index
     * @return int error code, 0 if no error
     */
    public function RemoveRow(int $index): int
    {
        if (!isset($this->data[$index])) {
            return self::CSV_ROW_NOT_FOUND;
        }
        array_splice($this->data, $index, 1);
        return self::CSV_OK;
    }

    /**
     * Remove a column by name
     * @param string $columnName
     * @return int error code, 0 if no error
     */
    public function RemoveColumn(string $columnName): int
    {
        $index = array_search($columnName, $this->header);
        if ($index === false) {
            return self::CSV_COLUMN_NOT_FOUND;
        }
        array_splice($this->header, $index, 1);
        foreach ($this->data as $rowIndex => $row) {
            unset($this->data[$rowIndex][$columnName]);
        }
        return self::CSV_OK;
    }

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
    ): int {
        $file = fopen($fileName, 'w');
        if ($file === false) {
            return self::CSV_FILE_NOT_WRITABLE;
        }
        if ($hasHeader) {
            fputcsv($file, $this->header, $separator, $quoteChar);
        }
        foreach ($this->data as $row) {
            fputcsv($file, array_values($row), $separator, $quoteChar);
        }
        fclose($file);
        return self::CSV_OK;
    }

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
    ): int {
        $file = fopen($fileName, 'r');
        if ($file === false) {
            return self::CSV_FILE_NOT_READABLE;
        }
        $this->data = [];

        $firstRow = fgetcsv($file, 0, $separator, $quoteChar);
        if ($hasHeader) {
            $this->header = $firstRow;
        } else {
            $this->header = range(0, count($firstRow) - 1);
            $this->data[] = array_combine($this->header, $firstRow);
        }

        while (($row = fgetcsv($file, 0, $separator, $quoteChar)) !== false) {
            $this->data[] = array_combine($this->header, $row);
        }
        fclose($file);
        return self::CSV_OK;
    }

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
    ): int {
        $this->data = [];

        $lines = explode(PHP_EOL, $csvString);
        // remove all empty lines
        $lines = array_filter($lines, function ($line) {
            return !empty($line);
        });

        $firstRow = str_getcsv($lines[0], $separator, $quoteChar);
        if ($hasHeader) {
            $this->header = $firstRow;
            array_shift($lines);
        } else {
            $this->header = range(0, count($firstRow) - 1);
            $this->data[] = array_combine($this->header, $firstRow);
        }

        foreach ($lines as $line) {
            $row = str_getcsv($line, $separator, $quoteChar);
            $this->data[] = array_combine($this->header, $row);
        }
        return self::CSV_OK;
    }

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
    ): string {
        $result = '';
        if ($hasHeader) {
            $result .= implode($separator, array_map(function ($value) use ($quoteChar) {
                return Csv::Quote($value, $quoteChar);
            }, $this->header)) . PHP_EOL;
        }
        foreach ($this->data as $row) {
            $result .= implode($separator, array_map(function ($value) use ($quoteChar) {
                return Csv::Quote($value, $quoteChar);
            }, $row)) . PHP_EOL;
        }
        return $result;
    }

    /**
     * Helper function, quote a string with a quoteChar
     * @param string $value
     * @param string $quoteChar default is double quote
     * @return string
     */
    public static function Quote(string $value, string $quoteChar = Csv::QUOTE_CHAR): string
    {
        // replace quoteChar with backslash + quoteChar
        $value = str_replace($quoteChar, '\\' . $quoteChar, $value);
        return $quoteChar . $value . $quoteChar;
    }

    /**
     * Helper function, unquote a string with a quoteChar
     * @param string $value
     * @param string $quoteChar default is double quote
     * @return string
     */
    public static function Unquote(string $value, string $quoteChar = Csv::QUOTE_CHAR): string
    {
        // remove first and last quoteChar
        $str = substr($value, 1, -1);
        // replace backslash + quoteChar with quoteChar
        return str_replace('\\' . $quoteChar, $quoteChar, $str);
    }
}
