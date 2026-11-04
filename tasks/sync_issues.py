#!/usr/bin/env python3
"""Create or update GitHub issues from Markdown task files in this directory.

Each task file uses a small front matter block:

    ---
    title: "Short imperative title"
    labels: bug, documentation
    issue: 12
    ---

    Body ...

The issue number is written back after creation, making subsequent runs
idempotent. Requires an authenticated GitHub CLI (`gh auth status`).
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

TASK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TASK_DIR.parent
GH_FALLBACK = Path(r"C:\Program Files\GitHub CLI\gh.exe")


def find_gh() -> str:
    exe = shutil.which("gh")
    if exe:
        return exe
    if GH_FALLBACK.exists():
        return str(GH_FALLBACK)
    sys.exit("gh CLI not found; install it or add it to PATH")


def parse_task(path: Path) -> tuple[dict[str, str], str]:
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines(keepends=True)

    if not lines or lines[0].strip() != "---":
        raise ValueError(f"{path.name}: missing front matter")
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration as exc:
        raise ValueError(f"{path.name}: unterminated front matter") from exc

    meta: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        meta[key.strip()] = value

    body = "".join(lines[end + 1 :]).lstrip("\r\n")
    return meta, body


def parse_labels(meta: dict[str, str]) -> list[str]:
    return [label.strip() for label in meta.get("labels", "").split(",") if label.strip()]


def parse_issue_number(meta: dict[str, str]) -> int | None:
    raw = meta.get("issue", "").strip().lstrip("#")
    return int(raw) if raw.isdigit() else None


def write_issue_number(path: Path, number: int) -> None:
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines(keepends=True)
    end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")

    for i in range(1, end):
        if lines[i].lower().startswith("issue:"):
            lines[i] = f"issue: {number}\n"
            break
    else:
        lines.insert(end, f"issue: {number}\n")

    path.write_text("".join(lines), encoding="utf-8", newline="\n")


def gh_run(gh: str, args: list[str]) -> subprocess.CompletedProcess[str]:
    print("+ gh " + " ".join(args))
    result = subprocess.run(
        [gh, *args],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"gh failed ({result.returncode}): {message}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="preview only")
    parser.add_argument(
        "--update",
        action="store_true",
        help="update issues that already have an issue number",
    )
    args = parser.parse_args()

    gh = find_gh()
    tasks = sorted(
        path
        for path in TASK_DIR.glob("*.md")
        if path.name.lower() != "readme.md"
    )
    if not tasks:
        print("No task files found.", file=sys.stderr)
        return 1

    created = 0
    updated = 0
    skipped = 0

    for path in tasks:
        try:
            meta, body = parse_task(path)
        except ValueError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1

        title = meta.get("title", "").strip()
        if not title:
            print(f"error: {path.name}: missing title", file=sys.stderr)
            return 1

        labels = parse_labels(meta)
        number = parse_issue_number(meta)
        action = "update" if number and args.update else "create" if not number else "skip"

        if args.dry_run:
            target = f"#{number}" if number else "(new)"
            print(f"[dry-run] {action:6} {target:6} {path.name}: {title}")
            continue

        if number and not args.update:
            skipped += 1
            print(f"skip #{number}: {title}")
            continue

        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".md",
            delete=False,
        ) as handle:
            handle.write(body)
            body_file = handle.name

        try:
            if number:
                cmd = [
                    "issue",
                    "edit",
                    str(number),
                    "--title",
                    title,
                    "--body-file",
                    body_file,
                ]
                for label in labels:
                    cmd.extend(["--add-label", label])
                gh_run(gh, cmd)
                updated += 1
                print(f"updated #{number}: {title}")
            else:
                cmd = [
                    "issue",
                    "create",
                    "--title",
                    title,
                    "--body-file",
                    body_file,
                ]
                for label in labels:
                    cmd.extend(["--label", label])
                result = gh_run(gh, cmd)
                url = result.stdout.strip().splitlines()[-1]
                match = re.search(r"/issues/(\d+)$", url)
                if not match:
                    raise RuntimeError(f"could not parse issue number from {url!r}")
                number = int(match.group(1))
                write_issue_number(path, number)
                created += 1
                print(f"created #{number}: {url}")
        finally:
            Path(body_file).unlink(missing_ok=True)

    if not args.dry_run:
        print(f"done: {created} created, {updated} updated, {skipped} skipped")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as exc:  # pragma: no cover - defensive CLI path
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        raise SystemExit(130)
