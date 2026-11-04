---
title: "Add metadata editing with format-parity validation"
labels: enhancement
issue: 30
---

## Problem

The editor's metadata bar is read-only, but `metadata.json` drives how every
table serializes (delimiter, quoteChar, hasHeader). Editing it needs hard
validation parity with the libraries, because arbitrary values can corrupt
round-trips for the other implementations.

## Proposal

- Editable panel fields: `title`, `description`, `author`, `createdAt`,
  `updatedAt` (free text), `delimiter` and `quoteChar` (single character),
  `hasHeader` (checkbox).
- Validation rules (mirror the library normalizers, they must not diverge):
  - `delimiter` and `quoteChar` must be exactly one character.
  - Reject whitespace/newline characters in both.
  - Reject `delimiter === quoteChar`.
  - Rejected input reverts the field and shows a message; the panel never
    half-applies a change set.
- Changing `delimiter`/`quoteChar`/`hasHeader` re-serializes all tables on the
  next save; show a two-line serialization preview per affected table and
  require an explicit Apply+confirm. Quoting of header/data cells is handled
  by the library, not the panel.
- `metadata.json` persistence follows the library `setMetadata` semantics:
  present only after edits (or if the loaded archive had it), matching the
  decision in issue #16. Saving without any metadata edit must not create the
  file (regression-tested in task 011).
- Opening an archive with malformed `metadata.json`: the libraries fall back to
  defaults; the panel shows a "recovered defaults" badge until the user saves
  (which rewrites valid JSON — same recovery behaviour as PHP, issue #12).

## Acceptance criteria

- [ ] Each validation rule above has a unit test, including the empty-string
      delimiter (reject with the field-level message).
- [ ] Changing the delimiter from `,` to `;` re-serializes the grid and the
      saved bytes correctly; reopening the saved archive with the Python
      implementation (or the CI interop step of task 013) yields identical
      rows.
- [ ] `hasHeader = false` archives serialize without a header row and reload
      treating the first row as data (unit test on serialization).
- [ ] A malformed `metadata.json` fixture renders the defaults, shows the
      badge, and a single metadata edit suffices for the next save to write
      valid JSON (assert JSON parse on the output blob).
- [ ] `updatedAt` is only written when the user edits it — no automatic
      timestamping (asserted in the save unit test).

## Pitfalls

- Delimiter/quote validation lives in TWO places (panel + library); the panel
  must call the library-level normalizer rather than duplicating rules — add a
  library `validateMetadata()` if missing, and test it once there.
- Applying metadata while a cell edit is pending loses the edit; commit cell
  edits before Apply (same guard as task 010's undo path).
- The preview is informational only: the source of truth for saved bytes is
  the library serialization, never the preview renderer.