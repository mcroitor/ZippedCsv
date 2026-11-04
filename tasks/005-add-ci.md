---
title: "Add CI workflow for C++, Python, JS/TS, and PHP"
labels: enhancement
issue: 15
---

## Problem

The repository has no `.github/workflows/`. The broken TypeScript build reached
`main`, the PHP suite silently fails two assertions, and none of the four
implementations are exercised on push/PR.

## Proposal

Add a GitHub Actions workflow that runs on `push` and `pull_request`:

- **C++ (Windows/MSYS2):** install
  `mingw-w64-ucrt-x86_64-{libzip,nlohmann-json,catch,cmake}`, configure with
  CMake, build, run `ctest`.
- **Python:** `pip install pytest`, run `python -m pytest`.
- **JS/TS:** `npm ci`, `npm test`, `npm run build`.
- **PHP:** run `php tests/runner.php` (after fixing the runner exit code).

Consider a separate job or step that creates a `.zcsv` in one language and reads
it in another to catch format drift.

## Acceptance criteria

- [ ] Workflow runs on push and pull_request.
- [ ] All four language jobs are present and green.
- [ ] A failing test fails the workflow.
- [ ] Runtime/dependency caching is used where practical.
