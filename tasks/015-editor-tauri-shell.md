---
title: "Package the editor as a Tauri desktop shell"
labels: enhancement
issue: 33
---

## Problem (optional / stretch)

The browser editor (tasks 009–014) reached feature stability. Native desktop
distribution adds real file dialogs, double-click-to-open for `.zcsv`, and an
installable artifact — without forking the UI.

## Proposal

- Wrap the static editor build with **Tauri v2** (Rust toolchain, system
  webview, small binary). Electron is the fallback if Rust tooling blocks CI,
  but Tauri is the decision for repo hygiene.
- File I/O: inside the Tauri webview the File System Access API is not
  available — implement open/save via Tauri dialog + fs plugins, routed into
  the SAME library code path (bytes → `ZippedCsvBrowser` adapter input). No
  second serialization path.
- File association for `.zcsv`, single instance, sensible window size.
- CI: a windows-latest job step producing the portable `.exe` artifact on
  tags (unsigned is acceptable for now; code signing is a later decision).

## Acceptance criteria

- [ ] `tauri dev` and the packaged build both load the editor; open → edit →
      save works end-to-end through native dialogs.
- [ ] Double-clicking a `.zcsv` file opens it in the app.
- [ ] The pure-web version's behaviour is unchanged (CI e2e green without
      Tauri).
- [ ] CI windows artifact builds on a tag; artifact opens on a clean machine
      without dev tools installed.

## Pitfalls

- Detect the Tauri host at runtime and swap the file-IO adapter; guard against
  calling the web `showOpenFilePicker` inside Tauri (it must be replaced, not
  shimmed).
- Keep the desktop shell strictly additive: no editor-core import may depend
  on Tauri APIs, or the web/PWA build breaks.
- System webviews (WebView2/WebKit) are not Chrome; re-run e2e smoke against
  the packaged app once before tagging.