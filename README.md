# Zipped CSV

## Description

This project represents a new format for tabular data storage. It presents a multiple CSV files zipped together. Zipped CSV file contains a set of CSV files and, possible, one metadata file. The metadata file is optional and contains the description of the zipped CSV file. The metadata file is in JSON format. Extension of the zipped CSV file is `.zcsv` or `csv.zip`.

The following is the structure of the zipped CSV file:

```text
zipped_csv_file.zcsv
│   metadata.json
│
│   file1.csv
│   file2.csv
│   ...
```

The `metadata.json` file contains the following fields:

- `title`: Title of the zipped CSV file, can be empty;
- `description`: Description of the zipped CSV file, can be empty;
- `author`: Author of the zipped CSV file, can be empty;
- `createdAt`: Date of creation of the zipped CSV file, can be empty;
- `updatedAt`: Date of last update of the zipped CSV file, can be empty;
- `delimiter`: Separator used in the CSV files. Default is `,`;
- `quoteChar`: Quote character used in the CSV files. Default is `"`.
- `hasHeader`: Boolean value that indicates if the CSV files have a header. Default is `true`.

If the `metadata.json` file is not present, the default values are used.

Example of the `metadata.json` file:

```json
{
  "title": "Zipped CSV file",
  "description": "This is an example of the zipped CSV file.",
  "author": "John Doe",
  "createdAt": "2021-01-01",
  "updatedAt": "2021-01-02",
  "delimiter": ",",
  "quoteChar": "\"",
  "hasHeader": true
}
```

## Examples of usage

- [PHP](php/README.md)