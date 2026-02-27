# Zipped CSV for Python

Python implementation of the Zipped CSV format.

## Features

- `Csv` class for CSV operations in memory and on disk
- `ZippedCsv` class for working with `.zcsv` archives
- Optional `metadata.json` support
- Fault-tolerant metadata parsing (invalid metadata falls back to safe defaults and is repaired on save)

## Quick start

From repository root:

```bash
set PYTHONPATH=python/src
python -m unittest discover -s python/tests -p "test_*.py"
```

## Examples

From repository root:

```bash
set PYTHONPATH=python/src
python python/examples/zcsv_create.py sample.zcsv
python python/examples/zcsv_append.py sample.zcsv path/to/file.csv
python python/examples/zcsv_status.py sample.zcsv
python python/examples/zcsv_print.py sample.zcsv 0
```

Detailed platform-specific example commands are available in `python/examples/README.md`.

## API

Main classes:

- `zippedcsv.Csv`
- `zippedcsv.ZippedCsv`

Both snake_case and PHP-style method aliases (`GetCsv`, `AddCsv`, `Save`, etc.) are available.
