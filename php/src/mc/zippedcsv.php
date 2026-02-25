<?php

namespace mc;

use ZipArchive;

class ZippedCsv {

    private $csv = [];
    private $zip = null;
    private $metadata = [];
    private $hasMetadataFile = false;

    private const METADATA_FILENAME = 'metadata.json';

    private function GetDefaultMetadata(): array {
        return [
            'title' => '',
            'description' => '',
            'author' => '',
            'createdAt' => '',
            'updatedAt' => '',
            'delimiter' => ',',
            'quoteChar' => '"',
            'hasHeader' => true,
        ];
    }

    private function NormalizeMetadata(array $metadata): array {
        $normalized = $this->GetDefaultMetadata();
        foreach ($normalized as $key => $defaultValue) {
            if (!array_key_exists($key, $metadata)) {
                continue;
            }
            $value = $metadata[$key];
            if ($key === 'hasHeader') {
                if (is_bool($value)) {
                    $normalized[$key] = $value;
                }
                continue;
            }
            if (!is_string($value)) {
                continue;
            }
            $normalized[$key] = $value;
        }

        if (mb_strlen($normalized['delimiter']) !== 1) {
            $normalized['delimiter'] = $this->GetDefaultMetadata()['delimiter'];
        }
        if (mb_strlen($normalized['quoteChar']) !== 1) {
            $normalized['quoteChar'] = $this->GetDefaultMetadata()['quoteChar'];
        }

        return $normalized;
    }

    private function IsRootCsvFile(string $fileName): bool {
        return preg_match('/\.csv$/i', $fileName)
            && strpos($fileName, '/') === false
            && strpos($fileName, '\\') === false;
    }

    private function NormalizeFileName(string $fileName): string {
        return preg_match('/\.csv$/', $fileName) ? $fileName : $fileName . '.csv';
    }

    /**
     * ZippedCsv constructor.
     * @param string $zipFile path to the zipped CSV files
     */
    public function __construct(string $zipFile) {
        $this->zip = new \ZipArchive();
        if ($this->zip->open($zipFile, ZipArchive::CREATE) !== true) {
            throw new \Exception('Could not open zip file');
        }

        $this->metadata = $this->GetDefaultMetadata();
        $metadataRaw = $this->zip->getFromName(self::METADATA_FILENAME);
        if ($metadataRaw !== false) {
            $metadataDecoded = json_decode($metadataRaw, true);
            if (is_array($metadataDecoded)) {
                $this->metadata = $this->NormalizeMetadata($metadataDecoded);
            } else {
                $this->metadata = $this->GetDefaultMetadata();
            }
            $this->hasMetadataFile = true;
        }

        // get all filenames from the zip file
        $files = [];
        for ($i = 0; $i < $this->zip->numFiles; $i++) {
            $files[] = $this->zip->getNameIndex($i);
        }
        // get only csv files directly placed in the root of the zip file
        $csvFiles = array_filter($files, function($file) {
            return $this->IsRootCsvFile($file);
        });

        // each csv file add to the csv array
        foreach ($csvFiles as $file) {
            $csv = new Csv();
            $csv->LoadFromString(
                $this->zip->getFromName($file),
                $this->metadata['hasHeader'],
                $this->metadata['delimiter'],
                $this->metadata['quoteChar']
            );
            $this->csv[$file] = $csv;
        }
    }

    /**
     * Get metadata associated with the zipped CSV file
     * @return array
     */
    public function GetMetadata(): array {
        return $this->metadata;
    }

    /**
     * Set metadata for the zipped CSV file
     * @param array $metadata
     */
    public function SetMetadata(array $metadata): void {
        $this->metadata = $this->NormalizeMetadata($metadata);
        $this->hasMetadataFile = true;
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
        $fileName = $this->NormalizeFileName($fileName);
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
        $fileName = $this->NormalizeFileName($fileName);
        $this->csv[$fileName] = $csv;
    }

    /**
     * Remove a Csv object from the zip file
     * @param string $fileName
     */
    public function RemoveCsv(string $fileName) {
        $fileName = $this->NormalizeFileName($fileName);
        if (array_key_exists($fileName, $this->csv)) {
            unset($this->csv[$fileName]);
        }
    }

    /**
     * Save the Csv objects to the zip file
     */
    public function Save() {
        $existingCsvFiles = [];
        for ($i = 0; $i < $this->zip->numFiles; $i++) {
            $existingFile = $this->zip->getNameIndex($i);
            if ($this->IsRootCsvFile($existingFile)) {
                $existingCsvFiles[] = $existingFile;
            }
        }

        $currentCsvFiles = array_keys($this->csv);
        foreach ($existingCsvFiles as $existingFile) {
            if (!in_array($existingFile, $currentCsvFiles, true)) {
                $this->zip->deleteName($existingFile);
            }
        }

        foreach ($this->csv as $fileName => $csv) {
            $this->zip->addFromString(
                $fileName,
                $csv->ToString(
                    $this->metadata['hasHeader'],
                    $this->metadata['delimiter'],
                    $this->metadata['quoteChar']
                )
            );
        }

        if ($this->hasMetadataFile) {
            $this->zip->addFromString(
                self::METADATA_FILENAME,
                json_encode($this->metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
            );
        }
    }

    /**
     * Close the zip file
     */
    public function Close() {
        $this->zip->close();
    }
};