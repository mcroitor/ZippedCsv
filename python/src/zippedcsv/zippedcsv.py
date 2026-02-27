from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from .csv import Csv


class ZippedCsv:
    METADATA_FILENAME = "metadata.json"

    def __init__(self, zip_file: str):
        self._zip_file = Path(zip_file)
        self._csv: dict[str, Csv] = {}
        self._metadata = self._default_metadata()
        self._has_metadata_file = False

        if self._zip_file.exists():
            self._load_existing()
        else:
            self._zip_file.parent.mkdir(parents=True, exist_ok=True)

    def _default_metadata(self) -> dict[str, str | bool]:
        return {
            "title": "",
            "description": "",
            "author": "",
            "createdAt": "",
            "updatedAt": "",
            "delimiter": ",",
            "quoteChar": '"',
            "hasHeader": True,
        }

    def _normalize_metadata(self, metadata: dict) -> dict[str, str | bool]:
        normalized = self._default_metadata()
        for key, default_value in normalized.items():
            if key not in metadata:
                continue
            value = metadata[key]
            if key == "hasHeader":
                if isinstance(value, bool):
                    normalized[key] = value
                continue
            if isinstance(value, str):
                normalized[key] = value

        if len(str(normalized["delimiter"])) != 1:
            normalized["delimiter"] = ","
        if len(str(normalized["quoteChar"])) != 1:
            normalized["quoteChar"] = '"'
        return normalized

    def _is_root_csv_file(self, file_name: str) -> bool:
        lower = file_name.lower()
        return lower.endswith(".csv") and "/" not in file_name and "\\" not in file_name

    def _normalize_file_name(self, file_name: str) -> str:
        return file_name if file_name.lower().endswith(".csv") else f"{file_name}.csv"

    def _load_existing(self) -> None:
        with ZipFile(self._zip_file, mode="r") as archive:
            names = archive.namelist()

            if self.METADATA_FILENAME in names:
                self._has_metadata_file = True
                raw = archive.read(self.METADATA_FILENAME).decode("utf-8", errors="replace")
                try:
                    loaded = json.loads(raw)
                    if isinstance(loaded, dict):
                        self._metadata = self._normalize_metadata(loaded)
                    else:
                        self._metadata = self._default_metadata()
                except json.JSONDecodeError:
                    self._metadata = self._default_metadata()

            for file_name in names:
                if not self._is_root_csv_file(file_name):
                    continue
                raw_csv = archive.read(file_name).decode("utf-8", errors="replace")
                csv_obj = Csv()
                csv_obj.LoadFromString(
                    raw_csv,
                    has_header=bool(self._metadata["hasHeader"]),
                    separator=str(self._metadata["delimiter"]),
                    quote_char=str(self._metadata["quoteChar"]),
                )
                self._csv[file_name] = csv_obj

    def get_table_names(self) -> list[str]:
        return list(self._csv.keys())

    def get_metadata(self) -> dict[str, str | bool]:
        return dict(self._metadata)

    def set_metadata(self, metadata: dict) -> None:
        self._metadata = self._normalize_metadata(metadata)
        self._has_metadata_file = True

    def get_csv(self, file_name: str) -> Csv:
        normalized = self._normalize_file_name(file_name)
        if normalized not in self._csv:
            raise Exception("File not found")
        return self._csv[normalized]

    def add_csv(self, file_name: str, csv: Csv) -> None:
        normalized = self._normalize_file_name(file_name)
        self._csv[normalized] = csv

    def remove_csv(self, file_name: str) -> None:
        normalized = self._normalize_file_name(file_name)
        self._csv.pop(normalized, None)

    def save(self) -> None:
        self._zip_file.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(self._zip_file, mode="w", compression=ZIP_DEFLATED) as archive:
            for file_name, csv_obj in self._csv.items():
                archive.writestr(
                    file_name,
                    csv_obj.ToString(
                        has_header=bool(self._metadata["hasHeader"]),
                        separator=str(self._metadata["delimiter"]),
                        quote_char=str(self._metadata["quoteChar"]),
                    ),
                )
            if self._has_metadata_file:
                archive.writestr(self.METADATA_FILENAME, json.dumps(self._metadata, indent=2, ensure_ascii=False))

    def close(self) -> None:
        return None

    def GetTableNames(self) -> list[str]:
        return self.get_table_names()

    def GetMetadata(self) -> dict[str, str | bool]:
        return self.get_metadata()

    def SetMetadata(self, metadata: dict) -> None:
        self.set_metadata(metadata)

    def GetCsv(self, file_name: str) -> Csv:
        return self.get_csv(file_name)

    def AddCsv(self, file_name: str, csv: Csv) -> None:
        self.add_csv(file_name, csv)

    def RemoveCsv(self, file_name: str) -> None:
        self.remove_csv(file_name)

    def Save(self) -> None:
        self.save()

    def Close(self) -> None:
        self.close()
