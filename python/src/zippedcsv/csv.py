from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path
from typing import Any


class Csv:
    SEPARATOR = ";"
    QUOTE_CHAR = '"'

    CSV_OK = 0
    CSV_FILE_NOT_READABLE = 2
    CSV_FILE_NOT_WRITABLE = 3
    CSV_ROW_SIZE_MISMATCH = 4
    CSV_COLUMN_SIZE_MISMATCH = 5
    CSV_DIFFERENT_KEYS = 6
    CSV_COLUMN_NOT_FOUND = 7
    CSV_ROW_NOT_FOUND = 8

    def __init__(self, data: list[list[str]] | list[dict[str, Any]] | None = None):
        self._data: list[dict[str, str]] = []
        self._header: list[str] = []

        if not data:
            return

        if not all(isinstance(row, (list, dict)) for row in data):
            raise ValueError("Each row must be list or dict")

        first = data[0]
        if isinstance(first, list):
            self._header = [str(x) for x in first]
            for row in data[1:]:
                if not isinstance(row, list) or len(row) != len(self._header):
                    raise ValueError("All rows must be lists with header length")
                self._data.append(dict(zip(self._header, [str(x) for x in row], strict=True)))
            return

        keys = list(first.keys())
        for row in data:
            if not isinstance(row, dict) or list(row.keys()) != keys:
                raise ValueError("All rows must have the same keys")
        self._header = [str(k) for k in keys]
        self._data = [{str(k): str(v) for k, v in row.items()} for row in data]  # type: ignore[arg-type]

    def get_header(self) -> list[str]:
        return list(self._header)

    def get_data(self) -> list[dict[str, str]]:
        return [row.copy() for row in self._data]

    def total_rows(self) -> int:
        return len(self._data)

    def total_columns(self) -> int:
        return len(self._header)

    def get_row(self, index: int) -> dict[str, str]:
        return self._data[index].copy()

    def get_column(self, column_name: str) -> list[str]:
        return [row[column_name] for row in self._data]

    def get_cell(self, column_name: str, index: int) -> str:
        return self._data[index][column_name]

    def add_row(self, row: list[str] | dict[str, str]) -> int:
        if len(row) != len(self._header):
            return self.CSV_ROW_SIZE_MISMATCH

        if isinstance(row, dict):
            if list(row.keys()) != self._header:
                return self.CSV_DIFFERENT_KEYS
            self._data.append({k: str(v) for k, v in row.items()})
            return self.CSV_OK

        self._data.append(dict(zip(self._header, [str(v) for v in row], strict=True)))
        return self.CSV_OK

    def add_column(self, column_name: str, column: list[str]) -> int:
        if len(column) != len(self._data):
            return self.CSV_COLUMN_SIZE_MISMATCH
        self._header.append(column_name)
        for idx, row in enumerate(self._data):
            row[column_name] = str(column[idx])
        return self.CSV_OK

    def set_cell_value(self, column_name: str, index: int, value: str) -> None:
        self._data[index][column_name] = value

    def remove_row(self, index: int) -> int:
        if index < 0 or index >= len(self._data):
            return self.CSV_ROW_NOT_FOUND
        del self._data[index]
        return self.CSV_OK

    def remove_column(self, column_name: str) -> int:
        if column_name not in self._header:
            return self.CSV_COLUMN_NOT_FOUND
        self._header.remove(column_name)
        for row in self._data:
            row.pop(column_name, None)
        return self.CSV_OK

    def save(
        self,
        file_name: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        try:
            content = self.to_string(has_header=has_header, separator=separator, quote_char=quote_char)
            Path(file_name).write_text(content, encoding="utf-8", newline="")
            return self.CSV_OK
        except OSError:
            return self.CSV_FILE_NOT_WRITABLE

    def load(
        self,
        file_name: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        try:
            content = Path(file_name).read_text(encoding="utf-8")
        except OSError:
            return self.CSV_FILE_NOT_READABLE
        return self.load_from_string(content, has_header=has_header, separator=separator, quote_char=quote_char)

    def load_from_string(
        self,
        csv_string: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        self._data = []
        self._header = []

        cleaned = [line for line in csv_string.splitlines() if line.strip() != ""]
        if not cleaned:
            return self.CSV_OK

        reader = csv.reader(cleaned, delimiter=separator, quotechar=quote_char)
        rows = list(reader)
        if not rows:
            return self.CSV_OK

        first = rows[0]
        if has_header:
            self._header = [str(v) for v in first]
            data_rows = rows[1:]
        else:
            self._header = [str(i) for i in range(len(first))]
            data_rows = rows

        for row in data_rows:
            self._data.append(dict(zip(self._header, [str(v) for v in row], strict=True)))
        return self.CSV_OK

    def to_string(
        self,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> str:
        output = StringIO()
        writer = csv.writer(output, delimiter=separator, quotechar=quote_char, lineterminator="\n")
        if has_header:
            writer.writerow(self._header)
        for row in self._data:
            writer.writerow([row[h] for h in self._header])
        return output.getvalue()

    @staticmethod
    def quote(value: str, quote_char: str = QUOTE_CHAR) -> str:
        return f"{quote_char}{value}{quote_char}"

    @staticmethod
    def unquote(value: str, quote_char: str = QUOTE_CHAR) -> str:
        if len(value) >= 2 and value[0] == quote_char and value[-1] == quote_char:
            return value[1:-1]
        return value

    def GetHeader(self) -> list[str]:
        return self.get_header()

    def GetData(self) -> list[dict[str, str]]:
        return self.get_data()

    def TotalRows(self) -> int:
        return self.total_rows()

    def TotalColumns(self) -> int:
        return self.total_columns()

    def GetRow(self, index: int) -> dict[str, str]:
        return self.get_row(index)

    def GetColumn(self, column_name: str) -> list[str]:
        return self.get_column(column_name)

    def GetCell(self, column_name: str, index: int) -> str:
        return self.get_cell(column_name, index)

    def AddRow(self, row: list[str] | dict[str, str]) -> int:
        return self.add_row(row)

    def AddColumn(self, column_name: str, column: list[str]) -> int:
        return self.add_column(column_name, column)

    def SetCellValue(self, column_name: str, index: int, value: str) -> None:
        self.set_cell_value(column_name, index, value)

    def RemoveRow(self, index: int) -> int:
        return self.remove_row(index)

    def RemoveColumn(self, column_name: str) -> int:
        return self.remove_column(column_name)

    def Save(
        self,
        file_name: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        return self.save(file_name, has_header, separator, quote_char)

    def Load(
        self,
        file_name: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        return self.load(file_name, has_header, separator, quote_char)

    def LoadFromString(
        self,
        csv_string: str,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> int:
        return self.load_from_string(csv_string, has_header, separator, quote_char)

    def ToString(
        self,
        has_header: bool = True,
        separator: str = SEPARATOR,
        quote_char: str = QUOTE_CHAR,
    ) -> str:
        return self.to_string(has_header, separator, quote_char)

    @staticmethod
    def Quote(value: str, quote_char: str = QUOTE_CHAR) -> str:
        return Csv.quote(value, quote_char)

    @staticmethod
    def Unquote(value: str, quote_char: str = QUOTE_CHAR) -> str:
        return Csv.unquote(value, quote_char)
