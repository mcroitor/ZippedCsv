import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { EditorStore } from "../store";
import { ZippedCsvBrowser } from "../../examples/viewer/zippedcsv-browser";

function toFile(bytes: Uint8Array, name: string): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name);
}

function fixtureFile(): File {
  const buffer = readFileSync(new URL("./fixtures/smoke.zcsv", import.meta.url));
  return toFile(new Uint8Array(buffer), "smoke.zcsv");
}

async function loadStoreFixture(): Promise<EditorStore> {
  return EditorStore.load(fixtureFile(), { onEvent: () => {} });
}

describe("adapter save bytes (issue #29 acceptance)", () => {
  it("saving an archive whose metadata was never set adds no metadata.json", async () => {
    const store = await loadStoreFixture();
    const bytes = await store.toBytes();

    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(["people.csv", "notes.csv"])
    );
    expect(zip.file("metadata.json")).toBeNull();
  });

  it("save → reopen shows identical data (open → edit → save → reopen)", async () => {
    const store = await loadStoreFixture();
    expect(store.setCell("people.csv", 1, "city", "Miami, Beach")).toBe(true);

    const bytes = await store.toBytes();
    const reopened = await ZippedCsvBrowser.fromFile(toFile(bytes, "roundtrip.zcsv"));

    expect(reopened.getTableNames()).toEqual(["people.csv", "notes.csv"]);
    expect(reopened.getCsv("people.csv").getCell("city", 1)).toBe("Miami, Beach");
    expect(reopened.getCsv("notes.csv").getRow(0)["author"]).toBe("Jane");
    // Defaults preserved exactly as they were in memory.
    expect(reopened.getMetadata().delimiter).toBe(",");
    expect(reopened.getMetadata().quoteChar).toBe('"');
    expect(reopened.getMetadata().hasHeader).toBe(true);
  });

  it("saved bytes are deterministic so a second save overwrites consistently", async () => {
    const store = await loadStoreFixture();
    const bytes1 = await store.toBytes();
    const bytes2 = await store.toBytes();
    expect(Buffer.from(bytes1).equals(Buffer.from(bytes2))).toBe(true);
  });

  it("archives with metadata.json keep it on save, including '; delimiter round-trip", async () => {
    const zip = new JSZip();
    zip.file(
      "metadata.json",
      JSON.stringify({ delimiter: ";", quoteChar: '"', hasHeader: true })
    );
    zip.file("people.csv", "name;city\r\n\"Doe; Jane\";Boston\r\n");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const store = await EditorStore.load(toFile(bytes, "meta.zcsv"), {
      onEvent: () => {},
    });
    expect(store.hasMetadataFile()).toBe(true);

    const saved = await store.toBytes();
    const reopenedZip = await JSZip.loadAsync(saved);
    expect(reopenedZip.file("metadata.json")).not.toBeNull();
    const metaText = await reopenedZip.file("metadata.json")!.async("text");
    expect((JSON.parse(metaText) as { delimiter: string }).delimiter).toBe(";");

    const reopened = await ZippedCsvBrowser.fromFile(toFile(saved, "meta2.zcsv"));
    expect(reopened.getCsv("people.csv").getCell("city", 0)).toBe("Boston");
    expect(reopened.getCsv("people.csv").getCell("name", 0)).toBe("Doe; Jane");
  });

  it("a malformed metadata.json is rewritten as valid JSON on save", async () => {
    const zip = new JSZip();
    zip.file("metadata.json", "this is {not valid json");
    zip.file("people.csv", "a,b\n1,2\n");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const store = await EditorStore.load(toFile(bytes, "bad.zcsv"), {
      onEvent: () => {},
    });
    expect(store.hasMetadataFile()).toBe(true); // file existed → rewritten
    expect(store.metadata.delimiter).toBe(","); // recovery with defaults

    const saved = await store.toBytes();
    const out = await JSZip.loadAsync(saved);
    const metaText = await out.file("metadata.json")!.async("text");
    expect((JSON.parse(metaText) as { delimiter: string }).delimiter).toBe(",");
  });

  it("updatedAt and friends are never touched implicitly", async () => {
    const zip = new JSZip();
    zip.file(
      "metadata.json",
      JSON.stringify({ delimiter: ",", updatedAt: "2026-11-01", title: "T" })
    );
    zip.file("people.csv", "a,b\n1,2\n");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const store = await EditorStore.load(toFile(bytes, "ts.zcsv"), {
      onEvent: () => {},
    });
    store.setCell("people.csv", 0, "a", "1 (kept)");
    const saved = await store.toBytes();

    const out = await JSZip.loadAsync(saved);
    const metaText = await out.file("metadata.json")!.async("text");
    const meta = JSON.parse(metaText) as { updatedAt: string; title: string };
    expect(meta.updatedAt).toBe("2026-11-01");
    expect(meta.title).toBe("T");
  });

  it("setMetadata marks the metadata file for persistence", async () => {
    const store = await loadStoreFixture();
    expect(store.hasMetadataFile()).toBe(false);

    store.tables; // touch not needed; metadata editing UI lands with #30
    const bytes = await store.toBytes();
    let zipOut = await JSZip.loadAsync(bytes);
    expect(zipOut.file("metadata.json")).toBeNull();

    // Adapter-level guarantee behind the metadata panel (issue #30):
    const adapter = ZippedCsvBrowser.fromFile(fixtureFile());
    const instance = await adapter;
    expect(instance.hasMetadataFile()).toBe(false);
    instance.setMetadata({ title: "Touched" });
    expect(instance.hasMetadataFile()).toBe(true);
    const withMeta = await instance.toBytes();
    zipOut = await JSZip.loadAsync(withMeta);
    expect(zipOut.file("metadata.json")).not.toBeNull();
  });

  it("epoch-based unsaved tracking marks and clears on save", async () => {
    const store = await loadStoreFixture();
    expect(store.hasUnsavedChanges()).toBe(false);

    store.setCell("people.csv", 0, "name", "X");
    expect(store.hasUnsavedChanges()).toBe(true);

    // Undoing the only edit returns to the loaded content — not unsaved.
    store.undo();
    expect(store.hasUnsavedChanges()).toBe(false);

    store.setCell("people.csv", 0, "name", "Y");
    store.markSaved(); // simulate a successful save
    expect(store.hasUnsavedChanges()).toBe(false);

    // Undoing one step past the save also diverges from saved content.
    store.undo();
    expect(store.hasUnsavedChanges()).toBe(true);
  });
});
