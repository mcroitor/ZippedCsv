import { ZippedCsvBrowser, ZcsvMetadata } from "../examples/viewer/zippedcsv-browser";
import { Csv } from "../src/csv";
import { Mutation, UndoStack } from "./commands";
import type { EditorTable } from "./app";

/**
 * Editor state: mirrors the archive tables for rendering and mutates them
 * exclusively through the library (`Csv` and `ZippedCsv` APIs), recording each
 * change as an undoable Mutation. Dirty tracking derives from the history: the
 * document is clean when undo and redo are both empty; a table is dirty when
 * it is affected by at least one applied (not undone) mutation.
 */

export type StoreEventKind =
  | "SetCell"
  | "AddRow"
  | "RemoveRows"
  | "AddColumn"
  | "RemoveColumn"
  | "AddTable"
  | "RemoveTable"
  | "RenameTable"
  | "UndoRedoState";

export interface StoreEvent {
  kind: StoreEventKind;
  table: string;
  structural: boolean;
  /** Grid update hint: the touched row index (non-structural events only). */
  rowIndex?: number;
  /** Column updated (SetCell grid transactions). */
  column?: string;
  /** Rename tables: the name before the rename (event.table is the new one). */
  renameFrom?: string;
}

export interface StoreHooks {
  onEvent(event: StoreEvent): void;
}

export function normalizeTableName(name: string): string {
  return name.toLowerCase().endsWith(".csv") ? name : `${name}.csv`;
}

export class EditorStore {
  private readonly archive: ZippedCsvBrowser;
  readonly fileName: string;
  readonly tables = new Map<string, EditorTable>();
  private readonly dirtyCounts = new Map<string, number>();
  private readonly stack: UndoStack;
  private hooks: StoreHooks;

  private constructor(archive: ZippedCsvBrowser, fileName: string, hooks: StoreHooks) {
    this.archive = archive;
    this.fileName = fileName;
    this.hooks = hooks;

    this.stack = new UndoStack({
      coalesce: this.coalesceSetCell,
      onApply: (mutation) => this.onDirtyChange(mutation, false),
      onRevert: (mutation) => this.onDirtyChange(mutation, true),
      onChange: () => this.emit({ kind: "UndoRedoState", table: "", structural: false }),
    });

    for (const name of archive.getTableNames()) {
      this.tables.set(name, buildMirror(name, archive.getCsv(name)));
    }
  }

  static async load(file: File, hooks: StoreHooks): Promise<EditorStore> {
    const archive = await ZippedCsvBrowser.fromFile(file);
    return new EditorStore(archive, file.name, hooks);
  }

  // ── Read accessors ───────────────────────────────────────────────────────

  get metadata(): ZcsvMetadata {
    return this.archive.getMetadata();
  }

  getTableNames(): string[] {
    return this.archive.getTableNames();
  }

  get canUndo(): boolean {
    return this.stack.canUndo;
  }

  get canRedo(): boolean {
    return this.stack.canRedo;
  }

  /**
   * The document diverges from the loaded archive when at least one mutation
   * is on the undo stack. Undoing everything returns to the loaded state —
   * even when redo would bring the edits back — so this tracks `canUndo`.
   */
  get isDirty(): boolean {
    return this.canUndo;
  }

  tableDirty(name: string): boolean {
    return (this.dirtyCounts.get(name) ?? 0) > 0;
  }

  /** Round-trip serialization through the library (undo snapshots, save). */
  serializeTable(name: string): string {
    const meta = this.metadata;
    return this.archive.getCsv(name).toString(meta.hasHeader, meta.delimiter, meta.quoteChar);
  }

  // ── Undo / redo ──────────────────────────────────────────────────────────

  undo(): boolean {
    return this.stack.undo();
  }

  redo(): boolean {
    return this.stack.redo();
  }

  private onDirtyChange(mutation: Mutation, reverted: boolean): void {
    if (mutation.transferDirty) {
      const from = reverted ? mutation.transferDirty.to : mutation.transferDirty.from;
      const to = reverted ? mutation.transferDirty.from : mutation.transferDirty.to;
      this.dirtyCounts.set(to, this.dirtyCounts.get(from) ?? 0);
      this.dirtyCounts.delete(from);
      return;
    }
    const delta = reverted ? -1 : +1;
    for (const table of mutation.affected) {
      this.dirtyCounts.set(table, Math.max(0, (this.dirtyCounts.get(table) ?? 0) + delta));
    }
  }

  private emit(event: StoreEvent): void {
    this.hooks.onEvent(event);
  }

  /** Merges consecutive edits of the same cell into one undo step. */
  private coalesceSetCell = (top: Mutation | undefined, next: Mutation): Mutation | null => {
    if (
      top &&
      top.kind === "SetCell" &&
      next.kind === "SetCell" &&
      top.table === next.table &&
      top.rowIndex === next.rowIndex &&
      top.column === next.column
    ) {
      return new CellEditMutation(
        this.archive.getCsv(next.table!),
        this.tables.get(next.table!)!,
        (event) => this.emit(event),
        next.table!,
        next.rowIndex!,
        next.column!,
        top.oldValue!,
        next.newValue!
      );
    }
    return null;
  };

  // ── Cell edits ───────────────────────────────────────────────────────────

  setCell(table: string, rowIndex: number, column: string, newValue: string): boolean {
    const mirror = this.tables.get(table);
    if (!mirror || rowIndex < 0 || rowIndex >= mirror.rows.length) {
      return false;
    }
    const oldValue = mirror.rows[rowIndex][column];
    if (oldValue === undefined || oldValue === newValue) {
      // No-op: not recorded, does not dirty the document.
      return false;
    }
    const csv = this.archive.getCsv(table);
    const emit = (event: StoreEvent) => this.emit(event);

    // Class-based mutation: the coalesced replacement binds NEW
    // old/newValue fields (prototype methods read `this`), so a merged edit
    // undoes to the ORIGINAL value, not in-between keystrokes.
    const mutation = new CellEditMutation(csv, mirror, emit, table, rowIndex, column, oldValue, newValue);
    this.stack.push(mutation);
    return true;
  }

  // ── Row mutations ────────────────────────────────────────────────────────

  addRow(table: string): boolean {
    const mirror = this.tables.get(table);
    if (!mirror || mirror.header.length === 0) {
      return false;
    }
    const csv = this.archive.getCsv(table);
    const rowIndex = mirror.rows.length;

    this.stack.push({
      kind: "AddRow",
      label: `Add row in ${table}`,
      affected: [table],
      do: () => {
        csv.addRow(mirror.header.map(() => ""));
        mirror.rows.push(
          Object.fromEntries(mirror.header.map((column) => [column, ""])) as Record<string, string>
        );
        this.emit({ kind: "AddRow", table, structural: true, rowIndex });
      },
      undo: () => {
        csv.removeRow(rowIndex);
        mirror.rows.splice(rowIndex, 1);
        this.emit({ kind: "AddRow", table, structural: true, rowIndex });
      },
    });
    return true;
  }

  /** indices are row positions, deduplicated and sorted internally. */
  removeRows(table: string, rawIndices: number[]): boolean {
    const mirror = this.tables.get(table);
    if (!mirror || rawIndices.length === 0) {
      return false;
    }
    const indices = [...new Set(rawIndices)].sort((a, b) => a - b);
    if (indices.some((index) => index < 0 || index >= mirror.rows.length)) {
      return false;
    }
    const csv = this.archive.getCsv(table);
    const captured = indices.map((index) => ({ ...mirror.rows[index] }));

    this.stack.push({
      kind: "RemoveRows",
      label: `Remove rows in ${table}`,
      affected: [table],
      do: () => {
        for (let i = indices.length - 1; i >= 0; i--) {
          csv.removeRow(indices[i]);
          mirror.rows.splice(indices[i], 1);
        }
        this.emit({ kind: "RemoveRows", table, structural: true });
      },
      undo: () => {
        for (let i = 0; i < indices.length; i++) {
          csv.insertRow(indices[i], mirror.header.map((column) => captured[i][column] ?? ""));
          mirror.rows.splice(indices[i], 0, captured[i]);
        }
        this.emit({ kind: "RemoveRows", table, structural: true });
      },
    });
    return true;
  }

  // ── Column mutations ─────────────────────────────────────────────────────

  addColumn(table: string, rawName: string): boolean {
    const mirror = this.tables.get(table);
    const name = rawName.trim();
    if (!mirror || name.length === 0 || mirror.header.includes(name)) {
      return false;
    }
    const csv = this.archive.getCsv(table);

    this.stack.push({
      kind: "AddColumn",
      label: `Add column ${name} to ${table}`,
      affected: [table],
      do: () => {
        csv.addColumn(name, mirror.rows.map(() => ""));
        mirror.header.push(name);
        for (const row of mirror.rows) {
          row[name] = "";
        }
        this.emit({ kind: "AddColumn", table, structural: true });
      },
      undo: () => {
        csv.removeColumn(name);
        mirror.header.pop();
        for (const row of mirror.rows) {
          delete row[name];
        }
        this.emit({ kind: "AddColumn", table, structural: true });
      },
    });
    return true;
  }

  removeColumn(table: string, columnName: string): boolean {
    const mirror = this.tables.get(table);
    if (!mirror || !mirror.header.includes(columnName)) {
      return false;
    }
    const csv = this.archive.getCsv(table);
    const index = mirror.header.indexOf(columnName);
    const values = mirror.rows.map((row) => row[columnName]);

    this.stack.push({
      kind: "RemoveColumn",
      label: `Remove column ${columnName} from ${table}`,
      affected: [table],
      do: () => {
        csv.removeColumn(columnName);
        mirror.header.splice(index, 1);
        for (const row of mirror.rows) {
          delete row[columnName];
        }
        this.emit({ kind: "RemoveColumn", table, structural: true });
      },
      undo: () => {
        csv.insertColumn(index, columnName, values);
        mirror.header.splice(index, 0, columnName);
        mirror.rows.forEach((row, i) => {
          row[columnName] = values[i];
        });
        this.emit({ kind: "RemoveColumn", table, structural: true });
      },
    });
    return true;
  }

  // ── Table mutations ──────────────────────────────────────────────────────

  addTable(tableName: string): string | null {
    const name = normalizeTableName(tableName.trim());
    const basename = name.slice(0, -4);
    if (
      basename.length === 0 ||
      name.includes("/") ||
      name.includes("\\") ||
      this.tables.has(name)
    ) {
      return null;
    }

    const csv = new Csv([["Column 1"]]);

    this.stack.push({
      kind: "AddTable",
      label: `Add table ${name}`,
      affected: [name],
      do: () => {
        this.archive.addCsv(name, csv);
        this.tables.set(name, { name, header: ["Column 1"], rows: [] });
        this.emit({ kind: "AddTable", table: name, structural: true });
      },
      undo: () => {
        this.archive.removeCsv(name);
        this.tables.delete(name);
        this.emit({ kind: "AddTable", table: name, structural: true });
      },
    });
    return name;
  }

  removeTable(table: string): boolean {
    const mirror = this.tables.get(table);
    if (!mirror) {
      return false;
    }
    const csv = this.archive.getCsv(table);
    const index = this.archive.getTableNames().indexOf(table);

    this.stack.push({
      kind: "RemoveTable",
      label: `Remove table ${table}`,
      affected: [table],
      do: () => {
        this.archive.removeCsv(table);
        this.tables.delete(table);
        this.emit({ kind: "RemoveTable", table, structural: true });
      },
      undo: () => {
        this.archive.insertCsvAt(index, table, csv);
        const entries = [...this.tables.entries()];
        entries.splice(index, 0, [table, mirror]);
        this.tables.clear();
        for (const [key, value] of entries) {
          this.tables.set(key, value);
        }
        this.emit({ kind: "RemoveTable", table, structural: true });
      },
    });
    return true;
  }

  /** In-place rename preserving the table order position and the data object. */
  renameTable(from: string, rawTo: string): string | null {
    const mirror = this.tables.get(from);
    if (!mirror) {
      return null;
    }
    const to = normalizeTableName(rawTo.trim());
    if (to === from || to.includes("/") || to.includes("\\") || to.slice(0, -4).length === 0) {
      return null;
    }

    this.stack.push({
      kind: "RenameTable",
      label: `Rename ${from} to ${to}`,
      affected: [],
      transferDirty: { from, to },
      do: () => {
        this.archive.renameCsv(from, to);
        const renamed = rebuildRename(this.tables, from, to);
        this.tables.clear();
        for (const [key, value] of renamed) {
          this.tables.set(key, value);
        }
        this.emit({ kind: "RenameTable", table: to, renameFrom: from, structural: true });
      },
      undo: () => {
        this.archive.renameCsv(to, from);
        const renamed = rebuildRename(this.tables, to, from);
        this.tables.clear();
        for (const [key, value] of renamed) {
          this.tables.set(key, value);
        }
        this.emit({ kind: "RenameTable", table: from, renameFrom: to, structural: true });
      },
    });
    return to;
  }
}

function buildMirror(name: string, csv: Csv): EditorTable {
  return { name, header: csv.getHeader(), rows: csv.getData() };
}

/**
 * SetCell mutation as a class so coalesced replacements can rebind
 * old/newValue: prototype methods read `this`, so undoing a merged edit
 * restores the ORIGINAL value rather than an in-between keystroke value.
 */
class CellEditMutation implements Mutation {
  readonly kind = "SetCell" as const;
  readonly label: string;
  readonly affected: readonly string[];

  constructor(
    private readonly csv: Csv,
    private readonly mirror: EditorTable,
    private readonly emit: (event: StoreEvent) => void,
    readonly table: string,
    readonly rowIndex: number,
    readonly column: string,
    public oldValue: string,
    public newValue: string
  ) {
    this.label = `Edit ${table} [${rowIndex}] ${column}`;
    this.affected = [table];
  }

  do(): void {
    this.csv.setCellValue(this.column, this.rowIndex, this.newValue);
    this.mirror.rows[this.rowIndex][this.column] = this.newValue;
    this.emit({
      kind: "SetCell",
      table: this.table,
      structural: false,
      rowIndex: this.rowIndex,
      column: this.column,
    });
  }

  undo(): void {
    this.csv.setCellValue(this.column, this.rowIndex, this.oldValue);
    this.mirror.rows[this.rowIndex][this.column] = this.oldValue;
    this.emit({
      kind: "SetCell",
      table: this.table,
      structural: false,
      rowIndex: this.rowIndex,
      column: this.column,
    });
  }
}

/** Rename a key while preserving the insertion position in the Map. */
function rebuildRename(
  tables: ReadonlyMap<string, EditorTable>,
  from: string,
  to: string
): Map<string, EditorTable> {
  return new Map(
    [...tables.entries()].map(([key, value]) => (key === from ? [to, value] : [key, value]))
  );
}
