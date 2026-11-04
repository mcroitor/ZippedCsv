---
title: "Fix C++ MSYS2 package prefix in Makefile and README (ucrt64 vs mingw64)"
labels: documentation
issue: 17
---

## Problem

`cpp/Makefile:16-20` and `cpp/README.md:10-17` instruct users to install
`mingw-w64-x86_64-libzip`, `mingw-w64-x86_64-nlohmann-json`, etc. The toolchain in
this environment is `C:\msys64\ucrt64` (GCC 16.2.0), so those packages are the
wrong ABI and `make install-deps` does not prepare a working build.

## Reproduction

`cmake` finds `g++` from `ucrt64`, but `libzip` is only installed for `ucrt64`
after manually running `pacman -S mingw-w64-ucrt-x86_64-libzip`.

## Acceptance criteria

- [ ] Use `mingw-w64-ucrt-x86_64-*` consistently in `cpp/Makefile` and
      `cpp/README.md`, or detect the active MSYS2 environment.
- [ ] State the required shell (`MSYS2 UCRT64`) explicitly.
- [ ] Verify `make install-deps && make test` from a clean UCRT64 shell.
