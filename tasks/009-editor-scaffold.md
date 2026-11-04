---
title: "Scaffold the browser editor app with AG Grid rendering"
labels: enhancement
issue: 27
---

## Problem

The JS package ships a read-only viewer (`js/examples/viewer/`) but no editing
surface for `.zcsv` archives. The agreed platform decision: a browser-first
editor evolved from the viewer's stack — vanilla TypeScript + Vite, no UI
framework, AG Grid Community (MIT) as the Excel/Sheets-like grid.

## Proposal

- Create `js/editor/` with `index.html`, `main.ts`, `vite.config.ts`; reuse the
  viewer's `nodeStubPlugin` approach if importing `src/` needs `fs` stubs.
- Package scripts: `editor:dev`, `editor:build`, `editor:test` (vitest).
- Dependencies: `ag-grid-community` and `vitest` as devDependencies. Before
  adoption, verify the AG Grid Community package license is MIT and record the
  pinned version in `js/editor/README.md`. Fallback if the license changed:
  TanStack Table (MIT, headless).
- Rendering: open a `.zcsv` via file picker (and drag & drop); render the
  read-only metadata bar and one grid per table behind tab buttons mirroring
  `getTableNames()`.
- Data access goes exclusively through the library
  (`ZippedCsvBrowser.fromFile`, `Csv`, `ZippedCsv`) — never through hand-parsed
  CSV text, so saved output stays byte-compatible with the Python, PHP, and C++
  implementations.

## Acceptance criteria

- [ ] `npm run editor:dev` serves the editor; opening a `.zcsv` renders every
      table in a grid with tabs and the metadata bar.
- [ ] Archives without `metadata.json` display default metadata (parity with
      the optional-metadata behaviour from issue #16) and do not error.
- [ ] `npm run editor:build` produces a static bundle; `npm run editor:test`
      smoke-loads a committed fixture archive (two tables, a cell containing a
      comma, a cell containing a newline) and asserts row/column counts and
      the exact cell text.
- [ ] `npm test` (jest library tests) still runs 34/34 and jest never picks up
      editor test files (scoped `testMatch` if needed).
- [ ] CSV files inside the archive with CRLF endings render as single table
      cells; quoted values containing commas or newlines display exactly once.

## Pitfalls

- License drift of AG Grid: pin the version; the verification step above is
  part of this task, not a follow-up.
- Importing Node-only code from `src/` into the browser bundle breaks it; all
  file access must go through the browser adapter.
- jest/vitest config collision: editor tests must be excluded from jest globs
  and library tests from vitest globs.