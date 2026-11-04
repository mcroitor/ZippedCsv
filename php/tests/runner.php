<?php

/**
 * PHP test runner.
 *
 * Exit code contract:
 *   0 - all assertions passed
 *   1 - at least one assertion failed
 */

$testsPassed = 0;
$testsFailed = 0;

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
    global $testsPassed, $testsFailed;

    if ($expression) {
        $testsPassed++;
        info($pass);
    } else {
        $testsFailed++;
        error($fail);
    }
}


include_once __DIR__ . '/../src/mc/csv.php';
include_once __DIR__ . '/../src/mc/zippedcsv.php';

// tests

include_once __DIR__ . '/tests_csv.php';
include_once __DIR__ . '/tests_zippedcsv.php';

$testsTotal = $testsPassed + $testsFailed;
$summary = "Tests: {$testsPassed} passed, {$testsFailed} failed, {$testsTotal} total";
$testsFailed > 0 ? error($summary) : info($summary);

exit($testsFailed > 0 ? 1 : 0);
