<?php
/**
 * Example of using ZippedCsv to print specified by id CSV file from 
 * a zipped file.
 * 
 * Usage:
 *   php zcsv_print.php <zip_file> <csv_id>
 */

require_once __DIR__ . '/../src/mc/csv.php';
require_once __DIR__ . '/../src/mc/zippedcsv.php';

use \mc\ZippedCsv;

if ($argc < 3) {
    echo "Usage: php zcsv_print.php <zip_file> <csv_id>\n";
    exit(1);
}

$zipFile = $argv[1];
$csvId = (int)$argv[2];

try {
    $zcsv = new ZippedCsv($zipFile);
    $csvFiles = $zcsv->GetTableNames();

    if ($csvId < 0 || $csvId >= count($csvFiles)) {
        throw new \Exception("Invalid CSV ID");
    }

    $csvName = $csvFiles[$csvId];
    $csv = $zcsv->GetCsv($csvName);

    foreach ($csv->GetData() as $row) {
        echo implode(', ', $row) . "\n";
    }

    $zcsv->Close();
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
