from __future__ import annotations

import sys

from zippedcsv import ZippedCsv


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python examples/zcsv_create.py <path_to_zipped_csv_file>")
        return 1

    try:
        zcsv = ZippedCsv(sys.argv[1])
        zcsv.Save()
        zcsv.Close()
        print(f"Zipped CSV file created: {sys.argv[1]}")
        return 0
    except Exception as error:
        print(f"Error: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
