---
title: "Fix JS/TS build: corrupted Csv.loadFromString in js/src/csv.ts"
labels: bug
issue: 11
---

## Problem

`main` does not compile the TypeScript implementation. `js/src/csv.ts` contains a
mangled `loadFromString` method left by automated review-fix commits. The block
references undeclared identifiers (`i`, `j`, `row`, `obj`) and duplicates
fragments.

## Evidence

```text
$ cd js && npx tsc --noEmit
src/csv.ts(200,7): error TS1128: Declaration or statement expected.
...
Test Suites: 2 failed, 2 total
Tests:       0 total
```

The last known-good implementation is in commit `ce96ea1` ("js is done").

## Expected behavior

`npm test` runs all 32 tests and passes; `npx tsc --noEmit` reports no errors.

## Acceptance criteria

- [ ] Restore `loadFromString` with an explicit `const obj` per row and a
      row-length check returning `Csv.CSV_ROW_SIZE_MISMATCH`.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm test` passes 32/32 tests.
- [ ] Add a regression test for a row whose column count differs from the header.
