from __future__ import annotations

import json
import os
import sys

from zippedcsv import ZippedCsv


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python examples/zcsv_status.py <path_to_zipped_csv_file>")
        return 1

    zip_file = sys.argv[1]
    if not os.path.exists(zip_file):
        print(f"File not found: {zip_file}")
        return 1

    try:
        zcsv = ZippedCsv(zip_file)
        print("Metadata:")
        print(json.dumps(zcsv.GetMetadata(), indent=2, ensure_ascii=False))

        csv_files = zcsv.GetTableNames()
        print("CSV files in the zipped file:")
        print(csv_files)

        for csv_file in csv_files:
            csv = zcsv.GetCsv(csv_file)
            print(f"CSV file: {csv_file}")
            print(f"Number of rows: {csv.TotalRows()}")
            print(f"Number of columns: {csv.TotalColumns()}")
        return 0
    except Exception as error:
        print(f"Error: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
