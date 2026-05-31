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
    this._csv.set(name, csv);
  }

  removeCsv(fileName: string): void {
    const name = this._normalizeName(fileName);
    this._csv.delete(name);
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
