<?php
/**
 * Example of using ZippedCsv to create an empty zipped csv file.
 * Usage:
 * php examples/zcsv_create.php <path_to_zipped_csv_file>
 */

require_once __DIR__ . '/../src/mc/csv.php';
require_once __DIR__ . '/../src/mc/zippedcsv.php';

use \mc\ZippedCsv;

if ($argc < 2) {
    echo "Usage: php examples/zcsv_create.php <path_to_zipped_csv_file>" . PHP_EOL;
    exit(1);
}

try {
    $zcsv = new ZippedCsv($argv[1]);
    $zcsv->Save();
    $zcsv->Close();
    echo "Zipped CSV file created: " . $argv[1] . PHP_EOL;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
