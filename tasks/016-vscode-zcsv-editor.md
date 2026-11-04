---
title: "Register a VS Code custom editor for .zcsv archives"
labels: enhancement
issue: 34
---

## Problem (optional / stretch)

Developers receive `.zcsv` archives in tool workflows; a VS Code custom editor
puts the grid one `F1 → Open With` away, reusing the editor core with zero new
formatting logic. Alternative distribution channel next to web and Tauri.

## Proposal

- Separate extension host app reusing the editor core from `js/editor` as a
  versioned consumption point (local file/package import — NOT a source
  fork; if the workspace layout makes that impractical, the extension lives in
  its own repository and imports a built core bundle).
- Register a `CustomEditor` provider for `*.zcsv`; webview CSP allows the
  bundled assets only.
- Open: read file bytes via the VS Code workspace API → same `fromFile`-equivalent
  adapter path. Save: `Ctrl+S` / `Cmd+S` writes via the VS Code save APIs and
  marks the document clean — dirty tracking must integrate with VS Code's
  `onDidChangeCustomDocument`.
- The core must not import VS Code APIs; the extension host binds them.

## Acceptance criteria

- [ ] Launching the extension host (`F5`) opens a fixture archive in the grid
      with tabs and metadata.
- [ ] Edits mark the VS Code document dirty; `Ctrl+S` persists to disk and the
      revert/reload flow works.
- [ ] No editor-core file imports `vscode` (enforced by a lint/import check in
      the extension build).
- [ ] Packaging (`vsce package`) succeeds and produces an installable VSIX.

## Pitfalls

- Webview CSP is strict: inline scripts/styles fail — bundle everything.
- Custom editor save plumbing (`backup`, `revert`, custom document classes) is
  where VS Code integrations usually go wrong; implement `backup` early, tests
  depend on it.
- If core bundling for two hosts (web app + extension) gets heavy, prefer a
  single Vite lib-mode build output consumed by both.