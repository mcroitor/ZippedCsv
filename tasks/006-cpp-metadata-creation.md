---
title: "Decide and unify metadata.json creation behavior in the C++ implementation"
labels: enhancement
issue: 16
---

## Problem

`cpp/src/zippedcsv.cpp:231-244` always writes `metadata.json` on `Save()`, even
when the caller never called `SetMetadata`. Python, JS and PHP only create the
file after metadata is set or when it already exists.

The format allows optional metadata, so always writing is valid, but the behavior
is inconsistent and the C++ test named "without metadata" does not assert the
absence of the file.

## Decision needed

Pick one of:

1. Track whether metadata was explicitly set and write `metadata.json` only then
   (match other implementations).
2. Keep always-write, document it in `cpp/README.md`, and add assertions that
   the generated metadata contains the expected defaults.

## Acceptance criteria

- [ ] Behavior is consistent across implementations or explicitly documented.
- [ ] Tests cover the chosen behavior (including `metadata.json` presence/absence).
