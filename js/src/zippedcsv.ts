import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { Csv } from "./csv";

export interface ZcsvMetadata {
  title: string;
  description: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  delimiter: string;
  quoteChar: string;
  hasHeader: boolean;
}

export class ZippedCsv {
  static readonly METADATA_FILENAME = "metadata.json";

  private _zipFile: string;
  private _csv: Map<string, Csv> = new Map();
  private _metadata: ZcsvMetadata;
  private _hasMetadataFile = false;

  constructor(zipFile: string) {
    this._zipFile = zipFile;
    this._metadata = ZippedCsv._defaultMetadata();

    if (fs.existsSync(zipFile)) {
      this._loadExisting();
    } else {
      const dir = path.dirname(zipFile);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private static _defaultMetadata(): ZcsvMetadata {
    return {
      title: "",
      description: "",
      author: "",
      createdAt: "",
      updatedAt: "",
      delimiter: ",",
      quoteChar: '"',
      hasHeader: true,
    };
  }

  private static _normalizeMetadata(raw: Record<string, unknown>): ZcsvMetadata {
    const defaults = ZippedCsv._defaultMetadata();
    const result = { ...defaults };

    const stringFields = [
      "title", "description", "author", "createdAt", "updatedAt",
      "delimiter", "quoteChar",
    ] as const;

    for (const key of stringFields) {
      if (typeof raw[key] === "string") {
        result[key] = raw[key] as string;
      }
    }

    if (typeof raw["hasHeader"] === "boolean") {
      result.hasHeader = raw["hasHeader"];
    }

    if (result.delimiter.length !== 1) result.delimiter = ",";
    if (result.quoteChar.length !== 1) result.quoteChar = '"';

    return result;
  }

  private static _isRootCsvFile(name: string): boolean {
    return name.toLowerCase().endsWith(".csv") && !name.includes("/") && !name.includes("\\");
  }

  private _normalizeName(fileName: string): string {
    return fileName.toLowerCase().endsWith(".csv") ? fileName : `${fileName}.csv`;
  }

  private _loadExisting(): void {
    const zip = new AdmZip(this._zipFile);
    const entries = zip.getEntries();

    const metaEntry = entries.find(
      (e) => e.entryName === ZippedCsv.METADATA_FILENAME
    );

    if (metaEntry) {
      this._hasMetadataFile = true;
      try {
        const raw = JSON.parse(metaEntry.getData().toString("utf-8"));
        if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
          this._metadata = ZippedCsv._normalizeMetadata(raw as Record<string, unknown>);
        } else {
          this._metadata = ZippedCsv._defaultMetadata();
        }
      } catch {
        this._metadata = ZippedCsv._defaultMetadata();
      }
    }

    for (const entry of entries) {
      if (!ZippedCsv._isRootCsvFile(entry.entryName)) {
        continue;
      }
      const content = entry.getData().toString("utf-8");
      const csv = new Csv();
      csv.loadFromString(
        content,
        this._metadata.hasHeader,
        this._metadata.delimiter,
        this._metadata.quoteChar
      );
      this._csv.set(entry.entryName, csv);
    }
  }

  getTableNames(): string[] {
    return Array.from(this._csv.keys());
  }

  getMetadata(): ZcsvMetadata {
    return { ...this._metadata };
  }

  setMetadata(metadata: Partial<ZcsvMetadata>): void {
    this._metadata = ZippedCsv._normalizeMetadata(metadata as Record<string, unknown>);
    this._hasMetadataFile = true;
  }

  getCsv(fileName: string): Csv {
    const name = this._normalizeName(fileName);
    const csv = this._csv.get(name);
    if (!csv) {
      throw new Error(`File not found: ${name}`);
    }
    return csv;
  }

  addCsv(fileName: string, csv: Csv): void {
    const name = this._normalizeName(fileName);
    if (!ZippedCsv._isRootCsvFile(name)) {
      throw new Error(`Only root-level CSV file names are supported: ${fileName}`);
    }
    this._csv.set(name, csv);
  }

  removeCsv(fileName: string): void {
    const name = this._normalizeName(fileName);
    this._csv.delete(name);
  }

  /**
   * Rename a table in place: order position and the Csv object are preserved.
   * The ".csv" extension is added to both arguments when missing. Renaming to
   * the same (normalised) name is a no-op; a missing source or an existing
   * target throws.
   */
  renameCsv(from: string, to: string): void {
    const fromName = this._normalizeName(from);
    const toName = this._normalizeName(to);
    if (fromName === toName) {
      return;
    }
    if (!ZippedCsv._isRootCsvFile(toName)) {
      throw new Error(`Only root-level CSV file names are supported: ${to}`);
    }
    const csv = this._csv.get(fromName);
    if (!csv) {
      throw new Error(`File not found: ${fromName}`);
    }
    if (this._csv.has(toName)) {
      throw new Error(`Duplicate CSV file name: ${toName}`);
    }
    this._csv = new Map(
      [...this._csv.entries()].map(([key, value]) => [
        key === fromName ? toName : key,
        value,
      ])
    );
  }

  /**
   * Add a Csv object at a specific position of the table order (0 or the
   * current size appends). Additive API for the editor's undo stack so a
   * deleted table can be restored at its original position — the other
   * implementations do not have it yet.
   */
  insertCsvAt(index: number, fileName: string, csv: Csv): void {
    const name = this._normalizeName(fileName);
    if (!ZippedCsv._isRootCsvFile(name)) {
      throw new Error(`Only root-level CSV file names are supported: ${fileName}`);
    }
    if (index < 0 || index > this._csv.size) {
      throw new Error(`Invalid CSV position: ${index}`);
    }
    if (this._csv.has(name)) {
      throw new Error(`Duplicate CSV file name: ${name}`);
    }
    const entries = [...this._csv.entries()];
    entries.splice(index, 0, [name, csv]);
    this._csv = new Map(entries);
  }

  save(): void {
    const dir = path.dirname(this._zipFile);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const zip = new AdmZip();

    for (const [name, csv] of this._csv) {
      const content = csv.toString(
        this._metadata.hasHeader,
        this._metadata.delimiter,
        this._metadata.quoteChar
      );
      zip.addFile(name, Buffer.from(content, "utf-8"));
    }

    if (this._hasMetadataFile) {
      zip.addFile(
        ZippedCsv.METADATA_FILENAME,
        Buffer.from(JSON.stringify(this._metadata, null, 2), "utf-8")
      );
    }

    zip.writeZip(this._zipFile);
  }

  close(): void {
    // No-op: resources are not held open; provided for API parity.
  }
}
