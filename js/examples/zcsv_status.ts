import { ZippedCsv } from "../src/index";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: tsx examples/zcsv_status.ts <path_to_zipped_csv_file>");
  process.exit(1);
}

try {
  const zcsv = new ZippedCsv(args[0]);
  const metadata = zcsv.getMetadata();
  const tables = zcsv.getTableNames();

  console.log(`File: ${args[0]}`);
  console.log(`Title: ${metadata.title || "(none)"}`);
  console.log(`Description: ${metadata.description || "(none)"}`);
  console.log(`Author: ${metadata.author || "(none)"}`);
  console.log(`Created: ${metadata.createdAt || "(none)"}`);
  console.log(`Updated: ${metadata.updatedAt || "(none)"}`);
  console.log(`Delimiter: ${JSON.stringify(metadata.delimiter)}`);
  console.log(`Quote char: ${JSON.stringify(metadata.quoteChar)}`);
  console.log(`Has header: ${metadata.hasHeader}`);
  console.log(`Tables (${tables.length}):`);
  for (const name of tables) {
    const csv = zcsv.getCsv(name);
    console.log(`  ${name}: ${csv.totalRows()} row(s), ${csv.totalColumns()} column(s)`);
  }
} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}
