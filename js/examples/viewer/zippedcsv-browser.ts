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

/**
 * Browser-side async adapter for reading .zcsv archives.
 * Uses JSZip for ZIP parsing and Csv.loadFromString() for CSV parsing.
 * Does not depend on Node.js fs / path / adm-zip.
 */
export class ZippedCsvBrowser {
  private _csv: Map<string, Csv> = new Map();
  private _metadata: ZcsvMetadata = defaultMetadata();

  private constructor() {}

  static async fromFile(file: File): Promise<ZippedCsvBrowser> {
    const instance = new ZippedCsvBrowser();
    const zip = await JSZip.loadAsync(file);

    // Read metadata (optional)
    const metaEntry = zip.file("metadata.json");
    if (metaEntry) {
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
}
