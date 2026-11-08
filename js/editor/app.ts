import { ZippedCsvBrowser, ZcsvMetadata } from "../examples/viewer/zippedcsv-browser";
import type { Csv } from "../src/csv";

/**
 * Editor data layer. Pure data — no AG Grid or DOM imports — so it is fully
 * unit-testable in a node environment and the grid binding stays in main.ts.
 * All archive access goes through the browser adapter, which routes CSV
 * parsing through the library (`Csv.loadFromString`); the editor never
 * hand-parses CSV or hand-builds ZIP bytes.
 */

export interface EditorTable {
  name: string;
  header: string[];
  /** Rows as objects keyed by header cell text. */
  rows: Record<string, string>[];
}

export interface LoadedArchive {
  fileName: string;
  tableNames: string[];
  tables: Map<string, EditorTable>;
  metadata: ZcsvMetadata;
}

function buildEditorTable(name: string, csv: Csv): EditorTable {
  return { name, header: csv.getHeader(), rows: csv.getData() };
}

export async function loadArchive(file: File): Promise<LoadedArchive> {
  const zipped = await ZippedCsvBrowser.fromFile(file);

  const tableNames = zipped.getTableNames();
  const tables = new Map<string, EditorTable>();
  for (const name of tableNames) {
    tables.set(name, buildEditorTable(name, zipped.getCsv(name)));
  }

  // The adapter normalizes a missing metadata.json to defaults; the editor
  // displays defaults for such archives (issue #16 parity). Presence
  // detection lands with metadata editing (issue #30).
  return {
    fileName: file.name,
    tableNames,
    tables,
    metadata: zipped.getMetadata(),
  };
}
