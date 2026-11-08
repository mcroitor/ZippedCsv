import JSZip from "jszip";
import { Csv } from "../../src/csv";

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

function defaultMetadata(): ZcsvMetadata {
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

function normalizeMetadata(raw: Record<string, unknown>): ZcsvMetadata {
  const result = defaultMetadata();
  const stringFields = [
    "title", "description", "author",
    "createdAt", "updatedAt", "delimiter", "quoteChar",
  ] as const;
  for (const key of stringFields) {
    if (typeof raw[key] === "string") result[key] = raw[key] as string;
  }
  if (typeof raw["hasHeader"] === "boolean") result.hasHeader = raw["hasHeader"];
  if (result.delimiter.length !== 1) result.delimiter = ",";
  if (result.quoteChar.length !== 1) result.quoteChar = '"';
  return result;
}

function isRootCsvFile(name: string): boolean {
  return (
    name.toLowerCase().endsWith(".csv") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

const METADATA_FILENAME_BROWSER = "metadata.json";

/**
 * Browser-side async adapter for reading .zcsv archives.
 * Uses JSZip for ZIP parsing and Csv.loadFromString() for CSV parsing.
 * Does not depend on Node.js fs / path / adm-zip.
 */
export class ZippedCsvBrowser {
  private _csv: Map<string, Csv> = new Map();
  private _metadata: ZcsvMetadata = defaultMetadata();
  private _hasMetadataFile = false;

  private constructor() {}

  static async fromFile(file: File): Promise<ZippedCsvBrowser> {
    const instance = new ZippedCsvBrowser();
    // Read the bytes through arrayBuffer() so the adapter works in browsers
    // AND in node-based unit tests — JSZip's node path does not recognize the
    // node File object, while ArrayBuffer is supported on both platforms.
    const zip = await JSZip.loadAsync(await file.arrayBuffer());

    // Read metadata (optional)
    const metaEntry = zip.file("metadata.json");
    if (metaEntry) {
      instance._hasMetadataFile = true;
      const text = await metaEntry.async("text");
      try {
        const raw: unknown = JSON.parse(text);
        if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
          instance._metadata = normalizeMetadata(raw as Record<string, unknown>);
        }
      } catch {
        // Malformed JSON — keep defaults
      }
    }

    // Collect root-level CSV entries first, then read async sequentially
    const csvEntries: Array<[string, JSZip.JSZipObject]> = [];
    zip.forEach((relativePath, entry) => {
      if (isRootCsvFile(relativePath)) {
        csvEntries.push([relativePath, entry]);
      }
    });

    for (const [name, entry] of csvEntries) {
      const text = await entry.async("text");
      const csv = new Csv();
      csv.loadFromString(
        text,
        instance._metadata.hasHeader,
        instance._metadata.delimiter,
        instance._metadata.quoteChar,
      );
      instance._csv.set(name, csv);
    }

    return instance;
  }

  getTableNames(): string[] {
    return Array.from(this._csv.keys());
  }

  getMetadata(): ZcsvMetadata {
    return { ...this._metadata };
  }

  getCsv(name: string): Csv {
    const csv = this._csv.get(name);
    if (!csv) throw new Error(`Table not found: ${name}`);
    return csv;
  }

  // ── Mutations (editor) ───────────────────────────────────────────────────
  // Semantics mirror the node ZippedCsv; toBytes() is the single
  // serialization path for saving (issue #29).

  setMetadata(metadata: Partial<ZcsvMetadata>): void {
    this._metadata = normalizeMetadata(metadata as Record<string, unknown>);
    this._hasMetadataFile = true;
  }

  hasMetadataFile(): boolean {
    return this._hasMetadataFile;
  }

  /**
   * Serializes the archive through the library: every table via
   * `Csv.toString(...)` with the metadata settings; metadata.json is included
   * only after it existed on load or a setMetadata call (issue #16 parity).
   * `updatedAt` and friends are never touched implicitly.
   */
  async toBytes(): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const [name, csv] of this._csv) {
      const content = csv.toString(
        this._metadata.hasHeader,
        this._metadata.delimiter,
        this._metadata.quoteChar
      );
      zip.file(name, content);
    }
    if (this._hasMetadataFile) {
      zip.file(
        METADATA_FILENAME_BROWSER,
        JSON.stringify(this._metadata, null, 2)
      );
    }
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }

  addCsv(fileName: string, csv: Csv): void {
    const name = ZippedCsvBrowser._normalizeFilename(fileName);
    if (!isRootCsvFile(name)) {
      throw new Error(`Only root-level CSV file names are supported: ${fileName}`);
    }
    this._csv.set(name, csv);
  }

  removeCsv(fileName: string): void {
    this._csv.delete(ZippedCsvBrowser._normalizeFilename(fileName));
  }

  /** In-place rename preserving order position and the Csv object. */
  renameCsv(from: string, to: string): void {
    const fromName = ZippedCsvBrowser._normalizeFilename(from);
    const toName = ZippedCsvBrowser._normalizeFilename(to);
    if (fromName === toName) return;
    if (!isRootCsvFile(toName)) {
      throw new Error(`Only root-level CSV file names are supported: ${to}`);
    }
    const csv = this._csv.get(fromName);
    if (!csv) throw new Error(`Table not found: ${fromName}`);
    if (this._csv.has(toName)) throw new Error(`Duplicate table name: ${toName}`);
    this._csv = new Map(
      [...this._csv.entries()].map(([key, value]) => [
        key === fromName ? toName : key,
        value,
      ])
    );
  }

  /** Inserts at a position of the table order (0..size); undo support. */
  insertCsvAt(index: number, fileName: string, csv: Csv): void {
    const name = ZippedCsvBrowser._normalizeFilename(fileName);
    if (!isRootCsvFile(name)) {
      throw new Error(`Only root-level CSV file names are supported: ${fileName}`);
    }
    if (index < 0 || index > this._csv.size) {
      throw new Error(`Invalid table position: ${index}`);
    }
    if (this._csv.has(name)) throw new Error(`Duplicate table name: ${name}`);
    const entries = [...this._csv.entries()];
    entries.splice(index, 0, [name, csv]);
    this._csv = new Map(entries);
  }

  private static _normalizeFilename(name: string): string {
    return name.toLowerCase().endsWith(".csv") ? name : `${name}.csv`;
  }
}
