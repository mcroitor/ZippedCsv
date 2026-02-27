import unittest

from zippedcsv import Csv


class CsvTests(unittest.TestCase):
    def test_csv_add_row_associative(self) -> None:
        csv = Csv([["a", "b", "c"]])
        result = csv.AddRow({"a": "1", "b": "2", "c": "3"})
        self.assertEqual(result, Csv.CSV_OK)
        self.assertEqual(csv.TotalRows(), 1)
        self.assertEqual(csv.GetRow(0), {"a": "1", "b": "2", "c": "3"})

    def test_csv_load_from_string_empty(self) -> None:
        csv = Csv()
        result = csv.LoadFromString("")
        self.assertEqual(result, Csv.CSV_OK)
        self.assertEqual(csv.GetHeader(), [])
        self.assertEqual(csv.GetData(), [])


if __name__ == "__main__":
    unittest.main()
