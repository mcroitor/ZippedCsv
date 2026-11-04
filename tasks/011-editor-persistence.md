---
title: "Wire editor open/save through File System Access API with fallbacks"
labels: enhancement
issue: 29
---

## Problem

The editor (tasks 009–010) can edit an in-memory archive but cannot write
files. Browser file I/O differs per engine: Chromium offers the File System
Access API (true save-to-file), Firefox/Safari need a download fallback. Save
fidelity is also under test cross-language (task 013), so the writing path is
the risky part of the editor.

## Proposal

- Open paths (all three, feature-detected): existing file input, drag & drop
  onto the window, `showOpenFilePicker` with
  `accept: { "application/zip": [".zcsv", ".csv.zip"] }`.
- Save path: `showSaveFilePicker` with the same accept types and the loaded
  file name as `suggestedName`; write via the library (`ZippedCsv.save()`
  behind the browser adapter). Fallback for engines without the API: build the
  Blob once through the same library path and trigger an `a[download]`.
- "Save as" (new name) and `Ctrl+S` (save when a handle exists, else Save as).
- Warn on `beforeunload` when the document is dirty.
- The editor never constructs CSV/ZIP bytes itself — the library is the single
  serialization path so output stays readable by Python/PHP/C++ (the CI
  cross-language test relies on this).
- Metadata policy: saving does NOT touch `updatedAt` or create
  `metadata.json` automatically; that happens only via metadata edits
  (task 012), matching the optional-metadata behaviour from issue #16.

## Acceptance criteria

- [ ] Chromium: open → edit → save → reopen renders identical data; a second
      save to the same handle works (overwrite permission holds).
- [ ] Firefox/Safari build: save produces a correct downloadable `.zcsv`
      (verify by re-opening the downloaded file).
- [ ] Saving an archive whose metadata was never edited does not add
      `metadata.json` to the output ZIP (assert with JSZip namelist in a
      vitest).
- [ ] Cancelling any picker is a no-op that preserves the dirty state; a
      revoked handle (`NotAllowedError`) shows a non-fatal message and keeps
      edits in memory.
- [ ] Closing a dirty document warns; a clean document closes without a
      prompt; `Ctrl+S` focuses/affects the active table context only.

## Pitfalls

- `showSaveFilePicker` is undefined outside secure contexts; gate the feature
  detection, do not feature-sniff on user agent strings.
- The download fallback must not double-serialize: build the Blob from `save()`
  output, not from a parallel hand-written ZIP writer.
- Handle-less reopen after save (Firefox) resets the dirty state without a
  real handle — track "saved content hash" instead of a boolean for reliable
  dirty detection.