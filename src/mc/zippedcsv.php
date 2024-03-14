<?php

namespace mc;

use ZipArchive;

class ZippedCsv {

    private $csv = [];
    private $zip = null;

    /**
     * ZippedCsv constructor.
     * @param string $zipFile path to the zipped CSV files
     */
    public function __construct(string $zipFile) {
        $this->zip = new \ZipArchive();
        if ($this->zip->open($zipFile, ZipArchive::CREATE) !== true) {
            throw new \Exception('Could not open zip file');
        }
        // get all filenames from the zip file
        $files = [];
        for ($i = 0; $i < $this->zip->numFiles; $i++) {
            $files[] = $this->zip->getNameIndex($i);
        }
        // get only csv files directly placed in the root of the zip file
        $csvFiles = array_filter($files, function($file) {
            return preg_match('/\.csv$/', $file);
        });

        // each csv file add to the csv array
        foreach ($csvFiles as $file) {
            $csv = new Csv();
            $csv->LoadFromString($this->zip->getFromName($file));
            // remove the .csv extension from the filename
            $file = preg_replace('/\.csv$/', '', $file);
            $this->csv[$file] = $csv;
        }
    }

    /**
     * Get the names of the tables in the zip file
     * @return array
     */
    public function GetTableNames(): array {
        return array_keys($this->csv);
    }

    /**
     * Get the Csv object from the zip file
     * @param string $fileName
     * @return Csv
     * @throws \Exception
     */
    public function GetCsv(string $fileName): Csv {
        if (!array_key_exists($fileName, $this->csv)) {
            throw new \Exception('File not found');
        }
        return $this->csv[$fileName];
    }

    /**
     * Add a Csv object to the zip file
     * @param string $fileName
     * @param Csv $csv
     */
    public function AddCsv(string $fileName, Csv $csv) {
        $this->csv[$fileName] = $csv;
    }

    /**
     * Remove a Csv object from the zip file
     * @param string $fileName
     */
    public function RemoveCsv(string $fileName) {
        if (array_key_exists($fileName, $this->csv)) {
            unset($this->csv[$fileName]);
        }
    }

    /**
     * Save the Csv objects to the zip file
     */
    public function Save() {
        foreach ($this->csv as $fileName => $csv) {
            $this->zip->addFromString($fileName . '.csv', $csv->ToString());
        }
    }

    /**
     * Close the zip file
     */
    public function Close() {
        $this->zip->close();
    }
};