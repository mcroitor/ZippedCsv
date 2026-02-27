# Python Examples

Examples for the Python `zippedcsv` implementation.

## Run without manual `PYTHONPATH` (recommended)

From repository root:

```bash
python -m pip install -e python
```

Then run examples:

```bash
python python/examples/zcsv_create.py sample.zcsv
python python/examples/zcsv_append.py sample.zcsv path/to/file.csv
python python/examples/zcsv_status.py sample.zcsv
python python/examples/zcsv_print.py sample.zcsv 0
```

## Run with `PYTHONPATH`

### Windows (cmd)

```bat
set PYTHONPATH=python/src
python python/examples/zcsv_create.py sample.zcsv
python python/examples/zcsv_append.py sample.zcsv path\to\file.csv
python python/examples/zcsv_status.py sample.zcsv
python python/examples/zcsv_print.py sample.zcsv 0
```

### Windows (PowerShell)

```powershell
$env:PYTHONPATH = "python/src"
python python/examples/zcsv_create.py sample.zcsv
python python/examples/zcsv_append.py sample.zcsv path/to/file.csv
python python/examples/zcsv_status.py sample.zcsv
python python/examples/zcsv_print.py sample.zcsv 0
```

### Linux/macOS

```bash
export PYTHONPATH=python/src
python python/examples/zcsv_create.py sample.zcsv
python python/examples/zcsv_append.py sample.zcsv path/to/file.csv
python python/examples/zcsv_status.py sample.zcsv
python python/examples/zcsv_print.py sample.zcsv 0
```
