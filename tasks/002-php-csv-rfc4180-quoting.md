---
title: "Make PHP CSV quoting RFC 4180-compliant"
labels: bug
issue: 12
---

## Problem

`php/src/mc/csv.php::Quote()` escapes embedded quote characters with a backslash
(`\"`) instead of doubling them (`""`). `LoadFromString` uses `str_getcsv`, which
expects standard CSV quoting, so even a PHP -> PHP round-trip corrupts data, and
Python/JS/C++ readers see the wrong value.

## Reproduction

```php
$csv = new mc\Csv([['a'], ['he said "hi"']]);
$out = $csv->ToString(true, ',', '"');
// "a"
// "he said \"hi\""
$back = new mc\Csv();
$back->LoadFromString($out, true, ',', '"');
var_export($back->GetRow(0));
// ['a' => 'he said \\"hi\\"']  <- expected 'he said "hi"'
```

The same archive read with the Python implementation returns
`{'a': 'he said \\hi\\""'}`.

## Fix

- Double the quote character in `Quote()` (`str_replace($q, $q.$q, $value)`).
- Remove the backslash unescaping in `Unquote()`.
- Pass an explicit `$escape` argument to `str_getcsv()` (e.g. `''`) to resolve the
  PHP 8.5 deprecation warnings at `php/src/mc/csv.php:295,305`.

## Acceptance criteria

- [ ] Embedded quotes round-trip through `ToString`/`LoadFromString`.
- [ ] A PHP-written archive with quoted fields is read correctly by Python (and
      ideally JS/C++).
- [ ] No `str_getcsv()` deprecation warnings on PHP 8.5.
- [ ] Add a regression test containing a value with `"`.
