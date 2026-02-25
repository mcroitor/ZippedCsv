<?php

use \mc\Csv;
use \mc\ZippedCsv;

const ZIPPED_CSV_FILENAME = __DIR__ . '/example.zcsv';
const CSV_NAME1 = "sample.csv";
const CSV_NAME2 = "sample2.csv";

function test_zippedcsv_create() {
    $zcsv = new ZippedCsv(ZIPPED_CSV_FILENAME);

    test($zcsv instanceof ZippedCsv, "ZippedCsv instance created");
}

function test_zippedcsv_add() {
    $zcsv = new ZippedCsv(ZIPPED_CSV_FILENAME);
    $csv = new Csv([
        ['a', 'b', 'c'],
        ['1', '2', '3']
    ]);

    $zcsv->AddCsv(CSV_NAME1, $csv);

    $zcsv->Save();
    $zcsv->Close();

    test(file_exists(ZIPPED_CSV_FILENAME), "ZippedCsv file created");
}

function test_zippedcsv_read() {
    $zcsv = new ZippedCsv(ZIPPED_CSV_FILENAME);

    $csvFiles = $zcsv->GetTableNames();

    test(array_search(CSV_NAME1, $csvFiles) !== false, "Csv file found in zipped file");

    $csv = $zcsv->GetCsv(CSV_NAME1);

    test($csv instanceof Csv, "Csv instance created from zipped file");
    test($csv->GetHeader() == ['a', 'b', 'c'], "Csv header matches");

    test($csv->GetRow(0) == ['a' => '1', 'b' => '2', 'c' => '3'], "Csv row match");
}

//run tests
test_zippedcsv_create();
test_zippedcsv_add();
test_zippedcsv_read();