import { ZippedCsv } from "../src/index";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: tsx examples/zcsv_create.ts <path_to_zipped_csv_file>");
  process.exit(1);
}

try {
  const zcsv = new ZippedCsv(args[0]);
  zcsv.save();
  zcsv.close();
  console.log(`Zipped CSV file created: ${args[0]}`);
} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}
