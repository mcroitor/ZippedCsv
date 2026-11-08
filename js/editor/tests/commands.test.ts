import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { EditorStore, StoreEvent } from "../store";

function toFile(bytes: Uint8Array, name: string): File {
  // Build a fresh ArrayBuffer: DOM FilePart typing rejects shared buffers.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name);
}

function fixtureFile(): File {
  const buffer = readFileSync(new URL("./fixtures/smoke.zcsv", import.meta.url));
  return toFile(new Uint8Array(buffer), "smoke.zcsv");
}

async function loadFixture(): Promise<EditorStore> {
  return EditorStore.load(fixtureFile(), { onEvent: () => {} });
}

/** Builds tables in memory from raw CSV text (no fixture file needed). */
async function loadInMemory(csvByName: Record<string, string>): Promise<EditorStore> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(csvByName)) {
    zip.file(name.toLowerCase().endsWith(".csv") ? name : `${name}.csv`, content);
  }
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return EditorStore.load(toFile(bytes, "mem.zcsv"), { onEvent: () => {} });
}

function snapshot(store: EditorStore, table: string): string {
  return store.serializeTable(table);
}

describe("EditorStore mutations and undo (issue #28 acceptance)", () => {
  it("edits a cell through the library and restores a byte-identical snapshot on undo", async () => {
    const store = await loadFixture();
    const before = snapshot(store, "people.csv");

    expect(store.setCell("people.csv", 0, "name", "Doe, Jane (edited)")).toBe(true);
    expect(store.tables.get("people.csv")!.rows[0]["name"]).toBe("Doe, Jane (edited)");
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(store.tables.get("people.csv")!.rows[0]["name"]).toBe("Doe, Jane");
    expect(snapshot(store, "people.csv")).toBe(before);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(snapshot(store, "people.csv")).not.toBe(before);
    expect(store.tables.get("people.csv")!.rows[0]["name"]).toBe("Doe, Jane (edited)");
  });

  it("coalesces consecutive edits of the same cell into one undo step", async () => {
    const store = await loadFixture();
    const before = snapshot(store, "notes.csv");

    store.setCell("notes.csv", 1, "note", "draft");
    store.setCell("notes.csv", 1, "note", "draft v2");
    store.setCell("notes.csv", 1, "note", "final");

    expect(store.canUndo).toBe(true);
    store.undo();
    expect(store.tables.get("notes.csv")!.rows[1]["note"]).toBe("single line note");
    expect(snapshot(store, "notes.csv")).toBe(before);
    // One undo consumed all three edits — redo step count must match.
    store.redo();
    expect(store.tables.get("notes.csv")!.rows[1]["note"]).toBe("final");
  });

  it("does not coalesce edits of different cells", async () => {
    const store = await loadInMemory({ people: "a,b\n1,2\n" });
    store.setCell("people.csv", 0, "a", "x");
    store.setCell("people.csv", 0, "b", "y");
    expect(store.tables.get("people.csv")!.rows[0]).toEqual({ a: "x", b: "y" });

    store.undo(); // pops the b edit
    expect(store.tables.get("people.csv")!.rows[0]["a"]).toBe("x");
    expect(store.tables.get("people.csv")!.rows[0]["b"]).toBe("2");

    store.undo(); // pops the a edit
    expect(store.tables.get("people.csv")!.rows[0]).toEqual({ a: "1", b: "2" });

    store.redo();
    store.redo();
    expect(store.tables.get("people.csv")!.rows[0]).toEqual({ a: "x", b: "y" });
  });

  it("adds and removes rows; undo restores order and content", async () => {
    const store = await loadFixture();
    const before = snapshot(store, "people.csv");

    expect(store.addRow("people.csv")).toBe(true);
    expect(store.tables.get("people.csv")!.rows).toHaveLength(3);

    store.undo();
    expect(snapshot(store, "people.csv")).toBe(before);

    store.redo();
    const rows = store.tables.get("people.csv")!.rows;
    expect(rows).toHaveLength(3);
    expect(Object.values(rows[2])).toEqual(["", ""]);
  });

  it("removes multiple rows and undo restores their original positions", async () => {
    const store = await loadInMemory({
      grid: "h1,h2\nr1c1,r1c2\nr2c1,r2c2\nr3c1,r3c2\n",
    });
    const before = snapshot(store, "grid.csv");
    expect(store.getTableNames()).toEqual(["grid.csv"]);

    expect(store.removeRows("grid.csv", [0, 2])).toBe(true);
    expect(store.tables.get("grid.csv")!.rows).toHaveLength(1);
    expect(store.tables.get("grid.csv")!.rows[0]["h1"]).toBe("r2c1");

    store.undo();
    expect(snapshot(store, "grid.csv")).toBe(before);

    store.redo();
    expect(snapshot(store, "grid.csv")).not.toBe(before);
    expect(store.getTableNames()).toEqual(["grid.csv"]);
  });

  it("adds and removes a column; undo restores content and position", async () => {
    const store = await loadFixture();
    const before = snapshot(store, "notes.csv");

    expect(store.addColumn("notes.csv", "tags")).toBe(true);
    expect(store.tables.get("notes.csv")!.header).toEqual(["note", "author", "tags"]);

    expect(store.removeColumn("notes.csv", "author")).toBe(true);
    expect(store.tables.get("notes.csv")!.header).toEqual(["note", "tags"]);
    expect(snapshot(store, "notes.csv")).not.toBe(before);

    store.undo(); // undo removeColumn
    expect(store.tables.get("notes.csv")!.header).toEqual(["note", "author", "tags"]);
    expect(store.tables.get("notes.csv")!.rows[1]["author"]).toBe("Bob");
    expect(snapshot(store, "notes.csv")).not.toBe(before);

    store.undo(); // undo addColumn
    expect(store.tables.get("notes.csv")!.header).toEqual(["note", "author"]);
    expect(snapshot(store, "notes.csv")).toBe(before);

    for (let i = 0; i < 2; i++) {
      store.redo();
    }
    expect(store.tables.get("notes.csv")!.header).toEqual(["note", "tags"]);
  });

  it("adds a table, removes a table, and restores its original order position on undo", async () => {
    const store = await loadFixture();
    const orderBefore = store.getTableNames();

    const name = store.addTable("extra");
    expect(name).toBe("extra.csv");
    expect(store.getTableNames()).toEqual([...orderBefore, "extra.csv"]);

    store.removeTable("people.csv");
    expect(store.getTableNames()).toEqual(["notes.csv", "extra.csv"]);

    store.undo(); // undo removeTable
    expect(store.getTableNames()).toEqual(orderBefore.concat("extra.csv"));
    expect(store.tables.get("people.csv")!.rows[0]["name"]).toBe("Doe, Jane");

    store.undo(); // undo addTable
    expect(store.getTableNames()).toEqual(orderBefore);
  });

  it("renames a table in place, preserving order and data", async () => {
    const store = await loadFixture();
    const before = snapshot(store, "notes.csv");

    expect(store.renameTable("notes.csv", "memo")).toBe("memo.csv");
    expect(store.getTableNames()).toEqual(["people.csv", "memo.csv"]);
    expect(store.tables.get("memo.csv")!.rows[0]["author"]).toBe("Jane");
    expect(snapshot(store, "memo.csv")).toBe(before);

    store.undo();
    expect(store.getTableNames()).toEqual(["people.csv", "notes.csv"]);
  });

  it("tracks dirty state per table and for the document", async () => {
    const store = await loadFixture();
    expect(store.isDirty).toBe(false);
    expect(store.tableDirty("people.csv")).toBe(false);

    store.setCell("people.csv", 1, "city", "Miami");
    expect(store.isDirty).toBe(true);
    expect(store.tableDirty("people.csv")).toBe(true);
    expect(store.tableDirty("notes.csv")).toBe(false);

    store.renameTable("people.csv", "contacts");
    expect(store.tableDirty("contacts.csv")).toBe(true);
    expect(store.tableDirty("people.csv")).toBe(false);

    store.undo(); // undo rename — dirty follows back
    expect(store.tableDirty("people.csv")).toBe(true);

    store.undo(); // undo setCell — document becomes clean
    expect(store.isDirty).toBe(false);

    store.redo();
    store.redo();
    expect(store.isDirty).toBe(true);
  });

  it("ignores no-op cell edits", async () => {
    const store = await loadFixture();
    expect(store.setCell("people.csv", 0, "name", "Doe, Jane")).toBe(false);
    expect(store.canUndo).toBe(false);
    expect(store.isDirty).toBe(false);
  });

  it("stays responsive on 10k rows for cell edits", async () => {
    const rows: string[] = ["idx,value"];
    for (let i = 0; i < 10_000; i++) {
      rows.push(`${i},v${i}`);
    }
    const store = await loadInMemory({ big: rows.join("\n") + "\n" });

    const start = performance.now();
    expect(store.setCell("big.csv", 9999, "value", "changed")).toBe(true);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50); // generous budget; typical runs are <5 ms
    expect(store.tables.get("big.csv")!.rows[9999]["value"]).toBe("changed");
  });
});

describe("EditorStore events", () => {
  it("emits events for mutations and undo/redo state changes", async () => {
    const events: StoreEvent[] = [];
    const store = await EditorStore.load(fixtureFile(), {
      onEvent: (event) => events.push(event),
    });

    store.setCell("people.csv", 0, "name", "X");
    store.undo();

    const kinds = events.map((event) => event.kind);
    // push → do() + UndoRedoState; undo → do() + UndoRedoState
    expect(kinds.filter((kind) => kind === "SetCell").length).toBe(2);
    expect(kinds.filter((kind) => kind === "UndoRedoState").length).toBe(2);
  });
});
