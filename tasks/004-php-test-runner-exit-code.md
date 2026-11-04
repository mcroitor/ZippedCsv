---
title: "Make PHP test runner exit non-zero on failed assertions"
labels: bug
issue: 14
---

## Problem

`php/tests/runner.php` defines `test()` to only print a log line. Failed
assertions are logged as `[ERROR] test failed`, but the process still exits 0.
The current suite logs two failures while `php tests/runner.php` returns success,
so CI or a developer cannot detect the regression.

## Evidence

```text
2026-11-04 ... [ERROR] test failed
2026-11-04 ... [ERROR] test failed
... exit code 0
```

## Acceptance criteria

- [ ] Track pass/fail counts in the runner.
- [ ] Print a summary (passed/failed).
- [ ] Exit with code 1 when at least one assertion fails.
- [ ] Document the exit-code contract in `php/README.md` or the runner header.
