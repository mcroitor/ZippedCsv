---
title: "Clean up JS README duplication and untracked sample fixture"
labels: documentation
issue: 18
---

## Problem

- `js/README.md:84-85` repeats the `ZcsvMetadata` field description; the first
  copy also ends with a stray carriage return.
- `tests/example.zcsv` exists on disk but is not tracked because `.gitignore`
  ignores `*.zcsv`. No documentation references it, so it is unclear whether it
  is a fixture or a leftover.

## Acceptance criteria

- [ ] Remove the duplicated line and normalize line endings in `js/README.md`.
- [ ] Either track the sample with a `!tests/example.zcsv` negation (and document
      its purpose) or delete it.
- [ ] No other documentation references stale paths.
