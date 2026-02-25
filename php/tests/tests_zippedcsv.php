<?php

use \mc\Csv;
use \mc\ZippedCsv;

const ZIPPED_CSV_FILENAME = __DIR__ . '/example.zcsv';
const ZIPPED_CSV_NO_METADATA_FILENAME = __DIR__ . '/example_no_metadata.zcsv';
const ZIPPED_CSV_WITH_METADATA_FILENAME = __DIR__ . '/example_with_metadata.zcsv';
const ZIPPED_CSV_INVALID_METADATA_FILENAME = __DIR__ . '/example_invalid_metadata.zcsv';
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

function test_zippedcsv_metadata_optional() {
    if (file_exists(ZIPPED_CSV_NO_METADATA_FILENAME)) {
        unlink(ZIPPED_CSV_NO_METADATA_FILENAME);
    }

    $zcsv = new ZippedCsv(ZIPPED_CSV_NO_METADATA_FILENAME);
    $zcsv->AddCsv(CSV_NAME1, new Csv([
        ['a', 'b'],
        ['1', '2']
    ]));
    $zcsv->Save();
    $zcsv->Close();

    $zip = new ZipArchive();
    $zip->open(ZIPPED_CSV_NO_METADATA_FILENAME);
    $metadata = $zip->getFromName('metadata.json');
    $zip->close();

    test($metadata === false, "metadata.json is optional and not created by default");
}

function test_zippedcsv_metadata_apply_and_persist() {
    if (file_exists(ZIPPED_CSV_WITH_METADATA_FILENAME)) {
        unlink(ZIPPED_CSV_WITH_METADATA_FILENAME);
    }

    $zcsv = new ZippedCsv(ZIPPED_CSV_WITH_METADATA_FILENAME);
    $zcsv->SetMetadata([
        'title' => 'Metadata test',
        'description' => 'Metadata behavior check',
        'author' => 'tests',
        'createdAt' => '2026-02-25',
        'updatedAt' => '2026-02-25',
        'delimiter' => ';',
        'quoteChar' => '"',
        'hasHeader' => true,
    ]);

    $zcsv->AddCsv(CSV_NAME2, new Csv([
        ['a', 'b'],
        ['1', '2']
    ]));
    $zcsv->Save();
    $zcsv->Close();

    $zip = new ZipArchive();
    $zip->open(ZIPPED_CSV_WITH_METADATA_FILENAME);
    $metadataRaw = $zip->getFromName('metadata.json');
    $csvRaw = $zip->getFromName(CSV_NAME2);
    $zip->close();

    $metadata = json_decode($metadataRaw, true);

    test($metadataRaw !== false, "metadata.json created when metadata is set");
    test($metadata['delimiter'] === ';', "metadata delimiter persisted");
    test(strpos($csvRaw, ';') !== false, "csv persisted with metadata delimiter");

    $reopened = new ZippedCsv(ZIPPED_CSV_WITH_METADATA_FILENAME);
    $reopenedMetadata = $reopened->GetMetadata();
    $csv = $reopened->GetCsv(CSV_NAME2);
    $reopened->Close();

    test($reopenedMetadata['delimiter'] === ';', "metadata loaded from metadata.json");
    test($csv->GetRow(0) == ['a' => '1', 'b' => '2'], "csv parsed using metadata settings");
}

function test_zippedcsv_invalid_metadata_recovery() {
    if (file_exists(ZIPPED_CSV_INVALID_METADATA_FILENAME)) {
        unlink(ZIPPED_CSV_INVALID_METADATA_FILENAME);
    }

    $zip = new ZipArchive();
    $zip->open(ZIPPED_CSV_INVALID_METADATA_FILENAME, ZipArchive::CREATE);
    $zip->addFromString('metadata.json', '{"delimiter": ",", broken-json');
    $zip->addFromString('sample.csv', "a,b\n1,2\n");
    $zip->close();

    $zcsv = new ZippedCsv(ZIPPED_CSV_INVALID_METADATA_FILENAME);
    $csv = $zcsv->GetCsv(CSV_NAME1);
    $metadata = $zcsv->GetMetadata();
    $zcsv->Save();
    $zcsv->Close();

    test($csv->GetRow(0) == ['a' => '1', 'b' => '2'], "invalid metadata does not break csv reading");
    test($metadata['delimiter'] === ',', "invalid metadata falls back to safe defaults");

    $zip = new ZipArchive();
    $zip->open(ZIPPED_CSV_INVALID_METADATA_FILENAME);
    $metadataRaw = $zip->getFromName('metadata.json');
    $zip->close();

    $metadataDecoded = json_decode($metadataRaw, true);
    test(is_array($metadataDecoded), "invalid metadata is rewritten as valid json on save");
}

//run tests
test_zippedcsv_create();
test_zippedcsv_add();
test_zippedcsv_read();
test_zippedcsv_metadata_optional();
test_zippedcsv_metadata_apply_and_persist();
test_zippedcsv_invalid_metadata_recovery();