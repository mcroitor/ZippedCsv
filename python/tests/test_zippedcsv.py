import json
from pathlib import Path
import unittest
from zipfile import ZipFile
from tempfile import TemporaryDirectory

from zippedcsv import Csv, ZippedCsv


class ZippedCsvTests(unittest.TestCase):
    def test_zippedcsv_add_read_and_metadata_optional(self) -> None:
        with TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "example.zcsv"

            zcsv = ZippedCsv(str(file_path))
            csv = Csv([["a", "b", "c"], ["1", "2", "3"]])
            zcsv.AddCsv("sample.csv", csv)
            zcsv.Save()
            zcsv.Close()

            with ZipFile(file_path, "r") as archive:
                self.assertNotIn("metadata.json", archive.namelist())

            reopened = ZippedCsv(str(file_path))
            table_names = reopened.GetTableNames()
            self.assertIn("sample.csv", table_names)
            loaded = reopened.GetCsv("sample.csv")
            self.assertEqual(loaded.GetHeader(), ["a", "b", "c"])
            self.assertEqual(loaded.GetRow(0), {"a": "1", "b": "2", "c": "3"})

    def test_zippedcsv_metadata_persist_and_apply(self) -> None:
        with TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "metadata.zcsv"
            zcsv = ZippedCsv(str(file_path))
            zcsv.SetMetadata(
                {
                    "title": "Metadata test",
                    "description": "desc",
                    "author": "tester",
                    "createdAt": "2026-02-27",
                    "updatedAt": "2026-02-27",
                    "delimiter": ";",
                    "quoteChar": '"',
                    "hasHeader": True,
                }
            )
            zcsv.AddCsv("sample.csv", Csv([["a", "b"], ["1", "2"]]))
            zcsv.Save()
            zcsv.Close()

            with ZipFile(file_path, "r") as archive:
                self.assertIn("metadata.json", archive.namelist())
                metadata = json.loads(archive.read("metadata.json"))
                raw_csv = archive.read("sample.csv").decode("utf-8")
                self.assertEqual(metadata["delimiter"], ";")
                self.assertIn(";", raw_csv)

            reopened = ZippedCsv(str(file_path))
            self.assertEqual(reopened.GetMetadata()["delimiter"], ";")
            self.assertEqual(reopened.GetCsv("sample.csv").GetRow(0), {"a": "1", "b": "2"})

    def test_zippedcsv_invalid_metadata_recovery(self) -> None:
        with TemporaryDirectory() as tmpdir:
            file_path = Path(tmpdir) / "broken.zcsv"

            with ZipFile(file_path, "w") as archive:
                archive.writestr("metadata.json", '{"delimiter": ",", broken-json')
                archive.writestr("sample.csv", "a,b\n1,2\n")

            zcsv = ZippedCsv(str(file_path))
            self.assertEqual(zcsv.GetCsv("sample.csv").GetRow(0), {"a": "1", "b": "2"})
            self.assertEqual(zcsv.GetMetadata()["delimiter"], ",")
            zcsv.Save()

            with ZipFile(file_path, "r") as archive:
                metadata = json.loads(archive.read("metadata.json"))
                self.assertIsInstance(metadata, dict)


if __name__ == "__main__":
    unittest.main()
