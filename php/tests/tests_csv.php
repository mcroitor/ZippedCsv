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

function test_csv_quote_helpers_rfc4180() {
    $value = 'he said "hi"';
    $quoted = Csv::Quote($value, '"');
    test($quoted === '"he said ""hi"""', "Csv Quote doubles embedded quotes");
    test(Csv::Unquote($quoted, '"') === $value, "Csv Unquote restores embedded quotes");
}

function test_csv_to_string_roundtrip_with_quotes() {
    $value = 'he said "hi"';
    $csv = new Csv([['a'], [$value]]);
    $out = $csv->ToString(true, ',', '"');
    test(strpos($out, '""hi""') !== false, "Csv ToString uses doubled quotes");

    $parsed = new Csv();
    $code = $parsed->LoadFromString($out, true, ',', '"');
    test($code === Csv::CSV_OK, "Csv quoted round-trip returns CSV_OK");
    test($parsed->GetRow(0) === ['a' => $value], "Csv quoted round-trip preserves value");
}

function test_csv_save_load_roundtrip_with_quotes() {
    $value = 'he said "hi"';
    $path = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'zippedcsv_quote_test.csv';
    $csv = new Csv([['a'], [$value]]);

    test($csv->Save($path, true, ',', '"') === Csv::CSV_OK, "Csv Save quoted value returns CSV_OK");
    $parsed = new Csv();
    test($parsed->Load($path, true, ',', '"') === Csv::CSV_OK, "Csv Load quoted value returns CSV_OK");
    test($parsed->GetRow(0) === ['a' => $value], "Csv file round-trip preserves quoted value");

    @unlink($path);
}

// run tests
test_csv_add_row_associative_returns_ok();
test_csv_load_from_string_supports_lf();
test_csv_load_from_string_empty_ok();
test_csv_quote_helpers_rfc4180();
test_csv_to_string_roundtrip_with_quotes();
test_csv_save_load_roundtrip_with_quotes();
