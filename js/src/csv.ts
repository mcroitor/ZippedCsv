import * as fs from "fs";
import Papa from "papaparse";

export class Csv {
  static readonly SEPARATOR = ";";
  static readonly QUOTE_CHAR = '"';

  static readonly CSV_OK = 0;
  static readonly CSV_FILE_NOT_READABLE = 2;
  static readonly CSV_FILE_NOT_WRITABLE = 3;
  static readonly CSV_ROW_SIZE_MISMATCH = 4;
  static readonly CSV_COLUMN_SIZE_MISMATCH = 5;
  static readonly CSV_DIFFERENT_KEYS = 6;
  static readonly CSV_COLUMN_NOT_FOUND = 7;
  static readonly CSV_ROW_NOT_FOUND = 8;

  private _header: string[] = [];
  private _data: Record<string, string>[] = [];

  constructor(data?: string[][] | Record<string, string>[]) {
    if (!data || data.length === 0) {
      return;
    }

    const first = data[0];
    if (Array.isArray(first)) {
      const rows = data as string[][];
      this._header = rows[0].map(String);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length !== this._header.length) {
          throw new Error("All rows must have the same length as the header");
        }
        const obj: Record<string, string> = {};
        for (let j = 0; j < this._header.length; j++) {
          obj[this._header[j]] = String(row[j]);
        }
        this._data.push(obj);
      }
    } else {
      const rows = data as Record<string, string>[];
      const keys = Object.keys(first);
      for (const row of rows) {
        const rowKeys = Object.keys(row);
        if (rowKeys.length !== keys.length || !rowKeys.every((k, i) => k === keys[i])) {
          throw new Error("All rows must have the same keys in the same order");
        }
      }
      this._header = keys.map(String);
      this._data = rows.map((row) => {
        const obj: Record<string, string> = {};
        for (const k of keys) {
          obj[k] = String(row[k]);
        }
        return obj;
      });
    }
  }

  getHeader(): string[] {
    return [...this._header];
  }

  getData(): Record<string, string>[] {
    return this._data.map((row) => ({ ...row }));
  }

  totalRows(): number {
    return this._data.length;
  }

  totalColumns(): number {
    return this._header.length;
  }

  getRow(index: number): Record<string, string> {
    return { ...this._data[index] };
  }

  getColumn(columnName: string): string[] {
    return this._data.map((row) => row[columnName]);
  }

  getCell(columnName: string, index: number): string {
    return this._data[index][columnName];
  }

  addRow(row: string[] | Record<string, string>): number {
    if (Array.isArray(row)) {
      if (row.length !== this._header.length) {
        return Csv.CSV_ROW_SIZE_MISMATCH;
      }
      const obj: Record<string, string> = {};
      for (let i = 0; i < this._header.length; i++) {
        obj[this._header[i]] = String(row[i]);
      }
      this._data.push(obj);
      return Csv.CSV_OK;
    } else {
      if (Object.keys(row).length !== this._header.length) {
        return Csv.CSV_ROW_SIZE_MISMATCH;
      }
      const rowKeys = Object.keys(row);
      if (rowKeys.length !== this._header.length || !rowKeys.every((k, i) => k === this._header[i])) {
        return Csv.CSV_DIFFERENT_KEYS;
      }
      this._data.push({ ...row });
      return Csv.CSV_OK;
    }
  }

  addColumn(columnName: string, column: string[]): number {
    if (column.length !== this._data.length) {
      return Csv.CSV_COLUMN_SIZE_MISMATCH;
    }
    this._header.push(columnName);
    for (let i = 0; i < this._data.length; i++) {
      this._data[i][columnName] = String(column[i]);
    }
    return Csv.CSV_OK;
  }

  setCellValue(columnName: string, index: number, value: string): void {
    this._data[index][columnName] = value;
  }

  removeRow(index: number): number {
    if (index < 0 || index >= this._data.length) {
      return Csv.CSV_ROW_NOT_FOUND;
    }
    this._data.splice(index, 1);
    return Csv.CSV_OK;
  }

  removeColumn(columnName: string): number {
    const idx = this._header.indexOf(columnName);
    if (idx === -1) {
      return Csv.CSV_COLUMN_NOT_FOUND;
    }
    this._header.splice(idx, 1);
    for (const row of this._data) {
      delete row[columnName];
    }
    return Csv.CSV_OK;
  }

  loadFromString(
    csvString: string,
    hasHeader = true,
    separator = Csv.SEPARATOR,
    quoteChar = Csv.QUOTE_CHAR
  ): number {
    this._header = [];
    this._data = [];

    const trimmed = csvString.trim();
    if (!trimmed) {
      return Csv.CSV_OK;
    }

    const result = Papa.parse<string[]>(trimmed, {
      delimiter: separator,
      quoteChar: quoteChar,
      skipEmptyLines: true,
    });

    const rows = result.data;
    if (rows.length === 0) {
      return Csv.CSV_OK;
    }

    if (hasHeader) {
      this._header = rows[0].map(String);
      for (let i = 1; i < rows.length; i++) {
        const obj: Record<string, string> = {};
        for (let j = 0; j < this._header.length; j++) {
          obj[this._header[j]] = String(rows[i][j] ?? "");
        }
        this._data.push(obj);
      }
    } else {
      this._header = rows[0].map((_, idx) => String(idx));
      for (const row of rows) {
        const obj: Record<string, string> = {};
        for (let j = 0; j < this._header.length; j++) {
          obj[this._header[j]] = String(row[j] ?? "");
        }
        this._data.push(obj);
      }
    }

    return Csv.CSV_OK;
  }

  toString(
    hasHeader = true,
    separator = Csv.SEPARATOR,
    quoteChar = Csv.QUOTE_CHAR
  ): string {
    const rows: string[][] = [];

    if (hasHeader) {
      rows.push(this._header);
    }

    for (const row of this._data) {
      rows.push(this._header.map((k) => row[k] ?? ""));
    }

    return Papa.unparse(rows, {
      delimiter: separator,
      quoteChar: quoteChar,
      newline: "\n",
    });
  }

  load(
    filePath: string,
    hasHeader = true,
    separator = Csv.SEPARATOR,
    quoteChar = Csv.QUOTE_CHAR
  ): number {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      return Csv.CSV_FILE_NOT_READABLE;
    }
    return this.loadFromString(content, hasHeader, separator, quoteChar);
  }

  save(
    filePath: string,
    hasHeader = true,
    separator = Csv.SEPARATOR,
    quoteChar = Csv.QUOTE_CHAR
  ): number {
    try {
      const content = this.toString(hasHeader, separator, quoteChar);
      fs.writeFileSync(filePath, content, "utf-8");
      return Csv.CSV_OK;
    } catch {
      return Csv.CSV_FILE_NOT_WRITABLE;
    }
  }
}
