# Zipped CSV Editor

A browser-based, spreadsheet-like editor (AG Grid) for `.zcsv` archives,
evolved from the read-only viewer.

## Status

- Platform: browser-first, vanilla TypeScript + Vite (same stack as the
  viewer). No UI framework.
- Grid: `ag-grid-community@36.3.0` — pinned, MIT license (verified at
  adoption; re-verify before any bump).
- Editing core (#28) is live: cell edits, add/remove rows and columns,
  add/rename/delete tables, document-level undo/redo with per-cell
  coalescing, and dirty tracking (document + per-table). Persistence
  (save/open via File System Access API) is issue #29.

## Commands

| Script | Purpose |
|---|---|
| `npm run editor:dev` | Vite dev server for the editor |
| `npm run editor:build` | Production static bundle (`editor/dist`) |
| `npm run editor:typecheck` | `tsc --noEmit` over editor + library sources |
| `npm run editor:test` | Vitest unit tests (node environment, data layer only) |

`npm test` (jest, library tests) is untouched and independent.

## Architecture

- `app.ts` — pure data layer: loads an archive via
  `examples/viewer/zippedcsv-browser.ts` (JSZip + library `Csv` parsing) and
  exposes tables as header + row records. No DOM/grid imports, so it is
  unit-testable in node.
- `store.ts` — editable state: mirrors the archive's tables and mutates them
  exclusively through library methods (`Csv.addRow/insertRow/removeRow/…`,
  browser adapter `addCsv/removeCsv/renameCsv/insertCsvAt`). Every mutation is
  a `Mutation` command (`commands.ts`) on a document-level `UndoStack`:
  consecutive edits of the same cell coalesce into one undo step; renames
  transfer dirty bookkeeping. `isDirty` tracks content divergence from the
  loaded archive (`canUndo`).
- `main.ts` — DOM wiring: file input & drag-and-drop, metadata bar (always
  rendered, including defaults for archives without `metadata.json`), tabs per
  table (with `●` dirty marks), toolbar (undo/redo, rows, columns, table
  lifecycle), one AG Grid instance per active tab with editable cells and row
  selection. Pending cell edits are committed (stopEditing) before tab
  switches and undo/redo.
- `tests/` — vitest suites for the data layer and the mutation/undo stack, plus
  a committed fixture `smoke.zcsv` (two tables, a comma cell, a CRLF-newline
  cell, no `metadata.json`).

## Additive library APIs introduced by the editor (with jest coverage)

- `Csv.insertRow(index, row)` / `Csv.insertColumn(index, columnName, column)` —
  positional inserts so removals can be undone at their original index.
- `ZippedCsv.renameCsv(from, to)` — in-place rename preserving table order and
  the data object.
- `ZippedCsv.insertCsvAt(index, fileName, csv)` — restores a deleted table at
  its original order position.
- Browser adapter: `addCsv/removeCsv/renameCsv/insertCsvAt` mirroring the node
  semantics (the browser `ZippedCsv` equivalent).

## Invariants

- All archive access goes through the browser adapter → the library
  (`Csv.loadFromString`). The editor never hand-parses CSV text or hand-builds
  ZIP bytes; format compatibility with the Python, PHP, and C++
  implementations is a hard requirement (CI-tested in issue #31).
- The `fs` stub Vite plugin (same as the viewer) keeps Node-only library code
  out of the browser bundle.
- Read-only metadata display for now: metadata editing is issue #30, File
  System Access save is issue #29.

## e2e disclaimer

This suite covers the data layer headlessly; grid DOM interactions are
exercised by the Playwright e2e suite added with issue #31.
