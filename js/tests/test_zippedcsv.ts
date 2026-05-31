import { Csv, ZippedCsv } from "zippedcsv";
import AdmZip from "adm-zip";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function tempFile(dir: string, name: string): string {
  return path.join(dir, name);
}

describe("ZippedCsv", () => {
  test("add, save, read without metadata", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "example.zcsv");

    const zcsv = new ZippedCsv(filePath);
    const csv = new Csv([["a", "b", "c"], ["1", "2", "3"]]);
    zcsv.addCsv("sample.csv", csv);
    zcsv.save();
    zcsv.close();

    // metadata.json should not exist
    const zip = new AdmZip(filePath);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).not.toContain("metadata.json");

    const reopened = new ZippedCsv(filePath);
    expect(reopened.getTableNames()).toContain("sample.csv");
    const loaded = reopened.getCsv("sample.csv");
    expect(loaded.getHeader()).toEqual(["a", "b", "c"]);
    expect(loaded.getRow(0)).toEqual({ a: "1", b: "2", c: "3" });

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("metadata persists and drives CSV delimiter", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "metadata.zcsv");

    const zcsv = new ZippedCsv(filePath);
    zcsv.setMetadata({
      title: "Metadata test",
      description: "desc",
      author: "tester",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      delimiter: ";",
      quoteChar: '"',
      hasHeader: true,
    });
    zcsv.addCsv("sample.csv", new Csv([["a", "b"], ["1", "2"]]));
    zcsv.save();
    zcsv.close();

    // Verify raw archive contents
    const zip = new AdmZip(filePath);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toContain("metadata.json");
    const meta = JSON.parse(zip.readAsText("metadata.json"));
    expect(meta.delimiter).toBe(";");
    const rawCsv = zip.readAsText("sample.csv");
    expect(rawCsv).toContain(";");

    // Re-open and verify
    const reopened = new ZippedCsv(filePath);
    expect(reopened.getMetadata().delimiter).toBe(";");
    expect(reopened.getCsv("sample.csv").getRow(0)).toEqual({ a: "1", b: "2" });

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("invalid metadata JSON falls back to defaults", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "broken.zcsv");

    // Craft a broken archive manually
    const zip = new AdmZip();
    zip.addFile("metadata.json", Buffer.from('{"delimiter": ",", broken-json'));
    zip.addFile("sample.csv", Buffer.from("a,b\n1,2\n"));
    zip.writeZip(filePath);

    const zcsv = new ZippedCsv(filePath);
    expect(zcsv.getMetadata().delimiter).toBe(",");
    expect(zcsv.getCsv("sample.csv").getRow(0)).toEqual({ a: "1", b: "2" });

    // Re-saving repairs the metadata
    zcsv.save();
    const repaired = new AdmZip(filePath);
    const reparsed = JSON.parse(repaired.readAsText("metadata.json"));
    expect(typeof reparsed).toBe("object");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("non-root CSV files are ignored", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "nested.zcsv");

    const zip = new AdmZip();
    zip.addFile("root.csv", Buffer.from("a,b\n1,2\n"));
    zip.addFile("subdir/nested.csv", Buffer.from("x,y\n3,4\n"));
    zip.writeZip(filePath);

    const zcsv = new ZippedCsv(filePath);
    const names = zcsv.getTableNames();
    expect(names).toContain("root.csv");
    expect(names).not.toContain("subdir/nested.csv");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("getName with and without .csv extension", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "ext.zcsv");

    const zcsv = new ZippedCsv(filePath);
    zcsv.addCsv("table", new Csv([["a"], ["1"]]));
    zcsv.save();

    const reopened = new ZippedCsv(filePath);
    // Both forms should work for retrieval
    expect(reopened.getCsv("table").getRow(0)).toEqual({ a: "1" });
    expect(reopened.getCsv("table.csv").getRow(0)).toEqual({ a: "1" });

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("removeCsv removes the table", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "remove.zcsv");

    const zcsv = new ZippedCsv(filePath);
    zcsv.addCsv("a.csv", new Csv([["x"], ["1"]]));
    zcsv.addCsv("b.csv", new Csv([["y"], ["2"]]));
    zcsv.removeCsv("a.csv");
    zcsv.save();

    const reopened = new ZippedCsv(filePath);
    expect(reopened.getTableNames()).not.toContain("a.csv");
    expect(reopened.getTableNames()).toContain("b.csv");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("getCsv throws for unknown file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "empty.zcsv");

    const zcsv = new ZippedCsv(filePath);
    expect(() => zcsv.getCsv("missing.csv")).toThrow();

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("getMetadata returns copy", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "copy.zcsv");

    const zcsv = new ZippedCsv(filePath);
    const meta = zcsv.getMetadata();
    meta.title = "mutated";
    expect(zcsv.getMetadata().title).toBe("");

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("invalid delimiter/quoteChar normalized to defaults", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = tempFile(tmpDir, "invalid.zcsv");

    const zcsv = new ZippedCsv(filePath);
    zcsv.setMetadata({ delimiter: "abc", quoteChar: "" });
    const meta = zcsv.getMetadata();
    expect(meta.delimiter).toBe(",");
    expect(meta.quoteChar).toBe('"');

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("creates parent directories on save", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = path.join(tmpDir, "deep", "nested", "test.zcsv");

    const zcsv = new ZippedCsv(filePath);
    zcsv.save();
    expect(fs.existsSync(filePath)).toBe(true);

    fs.rmSync(tmpDir, { recursive: true });
  });
});
