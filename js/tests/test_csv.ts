import { Csv } from "zippedcsv";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("Csv", () => {
  test("construct from 2D array", () => {
    const csv = new Csv([["a", "b", "c"], ["1", "2", "3"]]);
    expect(csv.getHeader()).toEqual(["a", "b", "c"]);
    expect(csv.totalRows()).toBe(1);
    expect(csv.getRow(0)).toEqual({ a: "1", b: "2", c: "3" });
  });

  test("construct from array of objects", () => {
    const csv = new Csv([{ a: "1", b: "2" }, { a: "3", b: "4" }]);
    expect(csv.getHeader()).toEqual(["a", "b"]);
    expect(csv.totalRows()).toBe(2);
    expect(csv.getRow(1)).toEqual({ a: "3", b: "4" });
  });

  test("empty constructor", () => {
    const csv = new Csv();
    expect(csv.getHeader()).toEqual([]);
    expect(csv.getData()).toEqual([]);
    expect(csv.totalRows()).toBe(0);
    expect(csv.totalColumns()).toBe(0);
  });

  test("addRow with array", () => {
    const csv = new Csv([["a", "b", "c"]]);
    const result = csv.addRow(["1", "2", "3"]);
    expect(result).toBe(Csv.CSV_OK);
    expect(csv.totalRows()).toBe(1);
    expect(csv.getRow(0)).toEqual({ a: "1", b: "2", c: "3" });
  });

  test("addRow with object", () => {
    const csv = new Csv([["a", "b", "c"]]);
    const result = csv.addRow({ a: "1", b: "2", c: "3" });
    expect(result).toBe(Csv.CSV_OK);
    expect(csv.getRow(0)).toEqual({ a: "1", b: "2", c: "3" });
  });

  test("addRow size mismatch", () => {
    const csv = new Csv([["a", "b"]]);
    expect(csv.addRow(["1"])).toBe(Csv.CSV_ROW_SIZE_MISMATCH);
    expect(csv.addRow(["1", "2", "3"])).toBe(Csv.CSV_ROW_SIZE_MISMATCH);
  });

  test("addRow different keys", () => {
    const csv = new Csv([["a", "b"]]);
    expect(csv.addRow({ x: "1", y: "2" })).toBe(Csv.CSV_DIFFERENT_KEYS);
  });

  test("addColumn", () => {
    const csv = new Csv([["a", "b"], ["1", "2"], ["3", "4"]]);
    const result = csv.addColumn("c", ["5", "6"]);
    expect(result).toBe(Csv.CSV_OK);
    expect(csv.getHeader()).toEqual(["a", "b", "c"]);
    expect(csv.getColumn("c")).toEqual(["5", "6"]);
  });

  test("addColumn size mismatch", () => {
    const csv = new Csv([["a", "b"], ["1", "2"]]);
    expect(csv.addColumn("c", ["5", "6", "7"])).toBe(Csv.CSV_COLUMN_SIZE_MISMATCH);
  });

  test("removeRow", () => {
    const csv = new Csv([["a", "b"], ["1", "2"], ["3", "4"]]);
    expect(csv.removeRow(0)).toBe(Csv.CSV_OK);
    expect(csv.totalRows()).toBe(1);
    expect(csv.getRow(0)).toEqual({ a: "3", b: "4" });
  });

  test("removeRow out of bounds", () => {
    const csv = new Csv([["a", "b"], ["1", "2"]]);
    expect(csv.removeRow(5)).toBe(Csv.CSV_ROW_NOT_FOUND);
    expect(csv.removeRow(-1)).toBe(Csv.CSV_ROW_NOT_FOUND);
  });

  test("removeColumn", () => {
    const csv = new Csv([["a", "b", "c"], ["1", "2", "3"]]);
    expect(csv.removeColumn("b")).toBe(Csv.CSV_OK);
    expect(csv.getHeader()).toEqual(["a", "c"]);
    expect(csv.getRow(0)).toEqual({ a: "1", c: "3" });
  });

  test("removeColumn not found", () => {
    const csv = new Csv([["a", "b"]]);
    expect(csv.removeColumn("z")).toBe(Csv.CSV_COLUMN_NOT_FOUND);
  });

  test("setCellValue", () => {
    const csv = new Csv([["a", "b"], ["1", "2"]]);
    csv.setCellValue("b", 0, "99");
    expect(csv.getCell("b", 0)).toBe("99");
  });

  test("getColumn", () => {
    const csv = new Csv([["a", "b"], ["1", "2"], ["3", "4"]]);
    expect(csv.getColumn("a")).toEqual(["1", "3"]);
  });

  test("getData returns copies", () => {
    const csv = new Csv([["a"], ["1"]]);
    const data = csv.getData();
    data[0]["a"] = "mutated";
    expect(csv.getRow(0)["a"]).toBe("1");
  });

  test("loadFromString empty", () => {
    const csv = new Csv();
    expect(csv.loadFromString("")).toBe(Csv.CSV_OK);
    expect(csv.getHeader()).toEqual([]);
    expect(csv.getData()).toEqual([]);
  });

  test("loadFromString with header", () => {
    const csv = new Csv();
    csv.loadFromString("a,b,c\n1,2,3\n4,5,6", true, ",");
    expect(csv.getHeader()).toEqual(["a", "b", "c"]);
    expect(csv.totalRows()).toBe(2);
    expect(csv.getRow(0)).toEqual({ a: "1", b: "2", c: "3" });
  });

  test("loadFromString with semicolon delimiter", () => {
    const csv = new Csv();
    csv.loadFromString("a;b\n1;2", true, ";");
    expect(csv.getHeader()).toEqual(["a", "b"]);
    expect(csv.getRow(0)).toEqual({ a: "1", b: "2" });
  });

  test("toString round-trips data", () => {
    const original = "a,b,c\n1,2,3\n4,5,6";
    const csv = new Csv();
    csv.loadFromString(original, true, ",");
    const out = csv.toString(true, ",");
    const csv2 = new Csv();
    csv2.loadFromString(out, true, ",");
    expect(csv2.getData()).toEqual(csv.getData());
  });

  test("save and load from file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zcsv-"));
    const filePath = path.join(tmpDir, "test.csv");

    const csv = new Csv([["x", "y"], ["10", "20"]]);
    expect(csv.save(filePath, true, ",")).toBe(Csv.CSV_OK);

    const loaded = new Csv();
    expect(loaded.load(filePath, true, ",")).toBe(Csv.CSV_OK);
    expect(loaded.getHeader()).toEqual(["x", "y"]);
    expect(loaded.getRow(0)).toEqual({ x: "10", y: "20" });

    fs.rmSync(tmpDir, { recursive: true });
  });

  test("load non-existent file", () => {
    const csv = new Csv();
    expect(csv.load("/non/existent/path.csv")).toBe(Csv.CSV_FILE_NOT_READABLE);
  });
});
