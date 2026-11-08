# Zipped CSV Editor

A browser-based, spreadsheet-like editor (AG Grid) for `.zcsv` archives,
evolved from the read-only viewer. Scaffold scope is **render-only**; editing
arrives with issue #28.

## Status

- Platform: browser-first, vanilla TypeScript + Vite (same stack as the
  viewer). No UI framework.
- Grid: `ag-grid-community@36.3.0` — pinned, MIT license (verified at
  adoption; re-verify before any bump).

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
- `main.ts` — DOM wiring: file input & drag-and-drop, metadata bar (always
  rendered, including defaults for archives without `metadata.json`), tabs per
  table, one AG Grid instance per active tab (destroyed/recreated on switch).
- `tests/app.test.ts` + `tests/fixtures/smoke.zcsv` — committed fixture with
  two tables, a comma cell, a CRLF-newline cell, and no `metadata.json`
  (exercises the optional-metadata path).

## Invariants

- All archive access goes through the browser adapter → the library
  (`Csv.loadFromString`). The editor never hand-parses CSV text or hand-builds
  ZIP bytes; format compatibility with the Python, PHP, and C++
  implementations is a hard requirement (CI-tested in issue #31).
- The `fs` stub Vite plugin (same as the viewer) keeps Node-only library code
  out of the browser bundle.
- AG Grid is render-only here: cell/grid editing is issue #28, File System
  Access save is issue #29.

## e2e disclaimer

This suite covers the data layer headlessly; grid DOM interactions are
exercised by the Playwright e2e suite added with issue #31.
