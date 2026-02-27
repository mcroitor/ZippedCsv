from __future__ import annotations

import sys

from zippedcsv import ZippedCsv


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python examples/zcsv_print.py <zip_file> <csv_id>")
        return 1

    zip_file = sys.argv[1]
    csv_id = int(sys.argv[2])

    try:
        zcsv = ZippedCsv(zip_file)
        csv_files = zcsv.GetTableNames()

        if csv_id < 0 or csv_id >= len(csv_files):
            raise Exception("Invalid CSV ID")

        csv_name = csv_files[csv_id]
        csv = zcsv.GetCsv(csv_name)
        for row in csv.GetData():
            print(", ".join(row.values()))
        return 0
    except Exception as error:
        print(f"Error: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
