---
title: "Meet editor performance budgets for large archives"
labels: enhancement
issue: 32
---

## Problem

The format is string-only CSV in a zip, but real datasets can reach ~100k rows
per table. Edit latency and save time must stay spreadsheet-like; unmeasured,
the first 100k-row archive will turn the grid into a janky prototype.

## Proposal

- Add `npm run editor:bench`: a committed script that generates a synthetic
  archive (100k rows × 20 columns, plus a second small table), runs against the
  **production build**, and records medians of 5 runs for:
  - open (from file to first paint),
  - cell edit round-trip (keystroke commit → UI consistent),
  - undo,
  - save (in-memory serialize → Blob).
  Print a table of results; document the reference hardware (CI runner class).
- Budgets: open ≤ 3 s, cell edit round-trip ≤ 16 ms, undo ≤ 100 ms,
  save ≤ 5 s.
- If budgets are missed, apply in order: (1) dirty-per-table serialization so
  save serializes only changed tables, (2) move ZIP reconstruction into a Web
  Worker, (3) virtualized row model review. Re-measure after each step.

## Acceptance criteria

- [ ] Benchmark script committed and reproducible from a clean checkout
      (`editor:build && editor:bench`).
- [ ] Results recorded in `js/editor/README.md` with the environment noted;
      every budget either met or a follow-up issue opened with the measured
      gap.
- [ ] Library tests (jest 34), editor unit tests, and e2e remain green — no
      perf optimization may break the task-013 suite.
- [ ] The editor stays usable at 100k rows: add/remove/edit operations on the
      large table complete within the budgets.

## Pitfalls

- Benchmarks on the dev server mislead (HMR, unminified) — production build
  only.
- GC pauses create outliers; use medians with warm-up runs, report p95 as well.
- The `ZipFile` write path in the browser adapter may build the entire archive
  in memory; if save dominates, measure memory too (peak MB) before and after
  the worker split.