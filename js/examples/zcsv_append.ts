import * as fs from "fs";
import * as path from "path";
import { Csv, ZippedCsv } from "../src/index";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: tsx examples/zcsv_append.ts <path_to_zipped_csv_file> <path_to_csv_file>");
  process.exit(1);
}

const [zipFile, csvFile] = args;

if (!fs.existsSync(csvFile)) {
  console.error(`CSV file not found: ${csvFile}`);
  process.exit(1);
}

try {
  const zcsv = new ZippedCsv(zipFile);
  const metadata = zcsv.getMetadata();

  const csv = new Csv();
  const result = csv.load(
    csvFile,
    metadata.hasHeader,
    metadata.delimiter,
    metadata.quoteChar
  );

  if (result !== Csv.CSV_OK) {
    console.error(`Failed to load CSV file: ${csvFile}`);
    process.exit(1);
  }

  zcsv.addCsv(path.basename(csvFile), csv);
  zcsv.save();
  zcsv.close();
  console.log(`CSV file appended to zipped CSV file: ${zipFile}`);
} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}
