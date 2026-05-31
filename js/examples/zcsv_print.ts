import { ZippedCsv } from "../src/index";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: tsx examples/zcsv_print.ts <path_to_zipped_csv_file> <table_index>");
  process.exit(1);
}

const tableIndex = parseInt(args[1], 10);
if (isNaN(tableIndex) || tableIndex < 0) {
  console.error("Table index must be a non-negative integer.");
  process.exit(1);
}

try {
  const zcsv = new ZippedCsv(args[0]);
  const tables = zcsv.getTableNames();

  if (tableIndex >= tables.length) {
    console.error(`Table index ${tableIndex} out of range. Archive has ${tables.length} table(s).`);
    process.exit(1);
  }

  const name = tables[tableIndex];
  const csv = zcsv.getCsv(name);

  console.log(`Table: ${name}`);
  console.log(`Header: ${JSON.stringify(csv.getHeader())}`);
  for (let i = 0; i < csv.totalRows(); i++) {
    console.log(`Row ${i}: ${JSON.stringify(csv.getRow(i))}`);
  }
} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}
