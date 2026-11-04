---
title: "Align PHP default metadata delimiter with the format spec (,)"
labels: bug
issue: 13
---

## Problem

`php/src/mc/zippedcsv.php:23` defaults `metadata['delimiter']` to `;`. The root
`README.md` specifies `,`, and the Python, JS and C++ implementations use `,`.
As a result, PHP creates semicolon-separated archives without `metadata.json`
that other implementations cannot read.

## Reproduction

Create an archive with PHP (`new ZippedCsv`, `AddCsv`, `Save`) without calling
`SetMetadata`, then open it with Python:

```text
header = ['a;"b"']        # expected ['a', 'b']
row0   = {'a;"b"': '1;"2"'}
```

This is also why two assertions in `php/tests/tests_zippedcsv.php`
(`invalid metadata does not break csv reading`, `invalid metadata falls back to
safe defaults`) currently fail: the fallback delimiter must be `,`.

## Acceptance criteria

- [ ] Change the default metadata delimiter to `,` in `php/src/mc/zippedcsv.php`.
- [ ] Keep `Csv::SEPARATOR` (`;`) unchanged unless the API contract is explicitly
      redefined; metadata defaults are the compatibility surface.
- [ ] PHP test suite passes with no failures.
- [ ] Add an interop test/fixture proving a PHP no-metadata archive is read by
      Python (or another implementation) with delimiter `,`.
