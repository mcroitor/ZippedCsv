<?php

use \mc\Csv;

function test_csv_add_row_associative_returns_ok() {
    $csv = new Csv([
        ['a', 'b'],
        ['1', '2']
    ]);

    $code = $csv->AddRow(['a' => '3', 'b' => '4']);

    test($code === Csv::CSV_OK, "Csv AddRow associative returns CSV_OK");
    test($csv->TotalRows() === 2, "Csv AddRow associative adds one row");
}

function test_csv_load_from_string_supports_lf() {
    $csv = new Csv();
    $code = $csv->LoadFromString("a;b\n1;2\n", true, ';', '"');

    test($code === Csv::CSV_OK, "Csv LoadFromString LF returns CSV_OK");
    test($csv->GetHeader() === ['a', 'b'], "Csv LoadFromString LF header parsed");
    test($csv->GetRow(0) === ['a' => '1', 'b' => '2'], "Csv LoadFromString LF first row parsed");
}

function test_csv_load_from_string_empty_ok() {
    $csv = new Csv();
    $code = $csv->LoadFromString('', true, ';', '"');

    test($code === Csv::CSV_OK, "Csv LoadFromString empty returns CSV_OK");
    test($csv->GetHeader() === [], "Csv LoadFromString empty header is empty");
    test($csv->GetData() === [], "Csv LoadFromString empty data is empty");
}

// run tests
test_csv_add_row_associative_returns_ok();
test_csv_load_from_string_supports_lf();
test_csv_load_from_string_empty_ok();
