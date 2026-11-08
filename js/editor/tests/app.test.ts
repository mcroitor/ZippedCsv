import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadArchive } from "../app";

function fixtureFile(): File {
  const buffer = readFileSync(new URL("./fixtures/smoke.zcsv", import.meta.url));
  return new File([buffer], "smoke.zcsv");
}

describe("editor data layer (issue #27 acceptance)", () => {
  it("loads a committed fixture archive with two tables", async () => {
    const archive = await loadArchive(fixtureFile());
    expect(archive.tableNames).toHaveLength(2);
    expect(archive.tableNames).toContain("people.csv");
    expect(archive.tableNames).toContain("notes.csv");
  });

  it("reports exact column and row counts", async () => {
    const archive = await loadArchive(fixtureFile());
    const people = archive.tables.get("people.csv");
    expect(people).toBeDefined();
    expect(people!.header).toEqual(["name", "city"]);
    expect(people!.rows).toHaveLength(2);

    const notes = archive.tables.get("notes.csv");
    expect(notes).toBeDefined();
    expect(notes!.header).toEqual(["note", "author"]);
    expect(notes!.rows).toHaveLength(2);
  });

  it("preserves a cell containing a comma", async () => {
    const archive = await loadArchive(fixtureFile());
    const people = archive.tables.get("people.csv")!;
    expect(people.rows[0]["name"]).toBe("Doe, Jane");
    expect(people.rows[0]["city"]).toBe("New, York");
  });

  it("preserves a cell containing a newline inside one cell", async () => {
    const archive = await loadArchive(fixtureFile());
    const notes = archive.tables.get("notes.csv")!;
    expect(notes.rows[0]["note"]).toBe("first line\nsecond line (comma, included)");
  });

  it("strips CRLF row endings — a single cell is a single cell", async () => {
    const archive = await loadArchive(fixtureFile());
    const people = archive.tables.get("people.csv")!;
    for (const row of people.rows) {
      for (const value of Object.values(row)) {
        expect(value).not.toContain("\r");
        expect(value).not.toContain("\n");
      }
    }
  });

  it("displays default metadata when metadata.json is absent", async () => {
    const archive = await loadArchive(fixtureFile());
    expect(archive.metadata.delimiter).toBe(",");
    expect(archive.metadata.quoteChar).toBe('"');
    expect(archive.metadata.hasHeader).toBe(true);
    expect(archive.metadata.title).toBe("");
  });
});
