# Task backlog

This directory is the source of truth for tracked work items. Each file
describes one GitHub issue in Markdown with a small YAML front matter block.

## File format

```markdown
---
title: "Short imperative title"
labels: bug, javascript
issue: 12
---

## Problem
...
```

- `title` — required, used as the GitHub issue title.
- `labels` — optional, comma-separated existing repository labels.
- `issue` — filled automatically after creation; do not edit by hand unless you
  need to link an existing issue.

The body starts after the closing `---` and is sent verbatim.

## Usage

```bash
python tasks/sync_issues.py --dry-run   # preview
python tasks/sync_issues.py             # create missing issues
python tasks/sync_issues.py --update    # update already-created issues
```

The script needs an authenticated `gh` CLI (`gh auth status`). It stores the
created issue number back into the task file, so runs are idempotent.
