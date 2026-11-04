---
title: "Add editor unit, end-to-end, and cross-language tests to CI"
labels: enhancement
issue: 31
---

## Problem

Tasks 009–012 build the editor against local checks only. Without CI wiring,
editor regressions (grid behaviour, save fidelity, or format drift) reach
`main` unnoticed — the exact failure mode that motivated the CI workflow
(issue #15).

## Proposal

- **Unit tests (vitest)** for: the command/undo stack, dirty tracking,
  `renameCsv`, save-blob structure (JSZip namelist: CSV entries present,
  `metadata.json` present iff metadata was set/edited).
- **End-to-end (Playwright, ubuntu CI)** with a committed fixture archive:
  open → edit a cell → add row/column → change delimiter via the metadata
  panel → save through the **download fallback path** (deterministic across
  engines; do not drive the native File System Access picker in tests) →
  reopen the downloaded file and assert equality.
- **Cross-language artefact test**: the e2e/vitest run writes the saved archive
  to `build/editor_output.zcsv`; extend the CI `interop` job to (a) build the
  editor, (b) produce that file via a non-browser vitest save step, and (c)
  read it with the Python implementation asserting exact rows/metadata.
- **CI wiring**: extend the `javascript` job with `npm run editor:test` and
  `npm run editor:build` steps (npm cache unchanged). Keep total e2e budget ≤ 5
  minutes; retries ≤ 2.
- `npm test` (jest, 34 library tests) remains untouched and green.

## Acceptance criteria

- [ ] All new CI jobs/steps pass on the PR; a deliberately broken editor
      assertion is spot-checked to fail the run, then reverted.
- [ ] The interop step proves: Python reads the editor-saved archive and
      asserts every row and the metadata exactly.
- [ ] e2e covers the full mutation set of task 010 plus the delimiter change
      from task 012.
- [ ] Playwright failure artifacts (traces/screenshots) upload on failure so a
      red CI run is diagnosable without reproducing locally.

## Pitfalls

- Running e2e against the dev server instead of the production build hides
  bundling regressions — e2e must run against `editor:build` output.
- Download filename handling differs per engine; assert on file content, not
  only on the name.
- The non-browser save step must exercise the same library code path as the
  browser; if the browser adapter uses Blob-only APIs, add a node-compatible
  adapter for tests rather than a separate writer.