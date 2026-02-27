from __future__ import annotations

import os
import sys

from zippedcsv import Csv, ZippedCsv


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: python examples/zcsv_append.py <path_to_zipped_csv_file> <path_to_csv_file>")
        return 1

    zip_file = sys.argv[1]
    csv_file = sys.argv[2]

    if not os.path.exists(csv_file):
        print(f"CSV file not found: {csv_file}")
        return 1

    try:
        zcsv = ZippedCsv(zip_file)
        metadata = zcsv.GetMetadata()
        csv = Csv()
        load_result = csv.Load(
            csv_file,
            has_header=bool(metadata["hasHeader"]),
            separator=str(metadata["delimiter"]),
            quote_char=str(metadata["quoteChar"]),
        )
        if load_result != Csv.CSV_OK:
            print(f"Failed to load CSV file: {csv_file}")
            return 1
        zcsv.AddCsv(os.path.basename(csv_file), csv)
        zcsv.Save()
        zcsv.Close()
        print(f"CSV file appended to zipped csv file: {zip_file}")
        return 0
    except Exception as error:
        print(f"Error: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
