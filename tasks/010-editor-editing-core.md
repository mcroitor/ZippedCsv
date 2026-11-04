---
title: "Implement grid editing core with undo/redo and table management"
labels: enhancement
issue: 28
---

## Problem

After the editor scaffold (task 009) renders archives, users need the actual
editing primitives of a spreadsheet: cell editing, row/column/table lifecycle,
and undo/redo — plus a dirty indicator, since save lands in a later task.

## Proposal

- Mutations (in this order of implementation):
  1. Edit a cell — commits into the `Csv` object through its API.
  2. Add row (append), remove selected row(s).
  3. Add column (name prompt), remove selected column.
  4. Add table (unique name, `.csv` extension normalised like `AddCsv`),
     remove table, rename table.
- If a required `Csv` mutation API is missing in `js/src/csv.ts` (e.g. a cell
  setter), add it as an additive, tested library method with naming parity to
  Python/PHP (keep the PascalCase convention used there).
- Add `ZippedCsv.renameCsv(from, to)` to `js/src/zippedcsv.ts`: preserves table
  order, rejects missing sources and name collisions, normalises the
  extension. Unit-tested; no other implementation needs it yet — document that
  in the method's doc comment.
- Undo/redo: one document-level command stack; every mutation is a command
  with `do()` / `undo()`. Coalesce consecutive edits of the same cell into one
  command. Keyboard: `Ctrl+Z`, `Ctrl+Y`/`Ctrl+Shift+Z`.
- Dirty tracking: one document-level flag plus per-table flags; tab shows a
  dirty indicator. State returns to clean when the archive is reloaded or
  every command is undone.

## Acceptance criteria

- [ ] Every listed mutation works in the grid and is undoable and redoable;
      undo restores `getCsv(name).toString()` to a byte-identical snapshot.
- [ ] Undoing a table deletion restores the table name, data, and its original
      position in `getTableNames()` order.
- [ ] `renameCsv` unit tests cover: order preservation, missing source, name
      collision, extension normalisation.
- [ ] Typing in a cell then immediately undo removes the coalesced edit once,
      not character-by-character.
- [ ] Dirty indicators appear for each mutation and clear on full undo / reload.
- [ ] Grid stays responsive with 10,000 rows during edit/undo (no full re-render
      on unrelated cell commits).

## Pitfalls

- Bypassing `Csv` APIs and mutating display state directly silently breaks
  dirty tracking and save fidelity — all edits round-trip through the library.
- Rename must not detach `Csv` objects (in-place rename, not remove+add with
  data loss on error).
- Pending in-flight cell edits must commit before table switches or undo
  executes, otherwise the command stack captures stale values.