<?php

function message(string $type, string $message) {
    $timestamp = date('Y-m-d H:i:s');
    echo "{$timestamp} [{$type}] {$message}" . PHP_EOL;
}

function info(string $message) {
    message('INFO', $message);
}

function error(string $message) {
    message('ERROR', $message);
}

function debug(string $message) {
    message('DEBUG', $message);
}

function test(bool $expression, string $pass = "test passed", string $fail = "test failed") {
    $expression ? info($pass) : error($fail);
}


include_once __DIR__ . '/../src/mc/csv.php';
include_once __DIR__ . '/../src/mc/zippedcsv.php';

// tests

include_once __DIR__ . '/tests_zippedcsv.php';
