<?php
/**
 * Example of using ZippedCsv to check the status of a zipped csv file.
 * Usage:
 *  php examples/zcsv_status.php <path_to_zipped_csv_file>
 * App will print:
 * 
 * - metadata
 * - list of csv files in the zipped file
 * - for each csv file print number of rows and columns
 */


include __DIR__ . '/../src/mc/csv.php';
include __DIR__ . '/../src/mc/zippedcsv.php';

use \mc\ZippedCsv;

if ($argc < 2) {
    echo "Usage: php examples/zcsv_status.php <path_to_zipped_csv_file>" . PHP_EOL;
    exit(1);
}

if(!file_exists($argv[1])) {
    echo "File not found: {$argv[1]}" . PHP_EOL;
    exit(1);
}

try {
    $zcsv = new ZippedCsv($argv[1]);
    echo "Metadata:" . PHP_EOL;
    echo json_encode($zcsv->GetMetadata(), JSON_PRETTY_PRINT) . PHP_EOL;

    $csvFiles = $zcsv->GetTableNames();
    echo "CSV files in the zipped file:" . PHP_EOL;

    foreach ($csvFiles as $csvFile) {
        $csv = $zcsv->GetCsv($csvFile);
        echo "  - {$csvFile}, rows: " . $csv->TotalRows()
            . ", columns: " . $csv->TotalColumns() . PHP_EOL;
    }

    $zcsv->Close();
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . PHP_EOL;
    exit(1);
}
