<?php
/**
 * Example of using ZippedCsv to append a csv file to an existing zipped
 * csv file. If the zipped csv file does not exist, it will be created.
 * 
 * Usage:
 *   php examples/zcsv_append.php <path_to_zipped_csv_file> <path_to_csv_file>
 */

include __DIR__ . '/../src/mc/csv.php';
include __DIR__ . '/../src/mc/zippedcsv.php';

use \mc\ZippedCsv;

if ($argc < 3) {
    echo "Usage: php examples/zcsv_append.php <path_to_zipped_csv_file> <path_to_csv_file>" . PHP_EOL;
    exit(1);
}

if(!file_exists($argv[2])) {
    echo "CSV file not found: " . $argv[2] . PHP_EOL;
    exit(1);
}

try {
    $zcsv = new ZippedCsv($argv[1]);
    $csv = new \mc\Csv();
    $csv->Load($argv[2]);
    $csvFileName = basename($argv[2]);
    $zcsv->AddCsv($csvFileName, $csv);
    $zcsv->Save();
    $zcsv->Close();
    echo "CSV file appended to zipped csv file: " . $argv[1] . PHP_EOL;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
