import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridOptions,
} from "ag-grid-community";
import { loadArchive, EditorTable, LoadedArchive } from "./app";

ModuleRegistry.registerModules([AllCommunityModule]);

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;
const metadataDiv = document.getElementById("metadata") as HTMLDivElement;
const tabsContainer = document.getElementById("tabs-container") as HTMLDivElement;
const tabButtons = document.getElementById("tab-buttons") as HTMLDivElement;
const gridContainer = document.getElementById("grid-container") as HTMLDivElement;
const dropZone = document.getElementById("drop-zone") as HTMLDivElement;

let archive: LoadedArchive | null = null;
let activeGrid: GridApi | null = null;
let activeTableName: string | null = null;

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    await openArchive(file);
  } catch (err) {
    showError(`Failed to read file: ${err}`);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    try {
      await openArchive(file);
    } catch (err) {
      showError(`Failed to read file: ${err}`);
    }
  }
});

async function openArchive(file: File): Promise<void> {
  clearUI();
  errorDiv.hidden = true;

  const loaded = await loadArchive(file);
  archive = loaded;
  renderMetadata(loaded.metadata);
  renderTabs();
}

function clearUI(): void {
  metadataDiv.hidden = true;
  metadataDiv.innerHTML = "";
  tabsContainer.hidden = true;
  tabButtons.innerHTML = "";
  gridContainer.innerHTML = "";
  activeGrid?.destroy();
  activeGrid = null;
  activeTableName = null;
  archive = null;
}

function showError(msg: string): void {
  errorDiv.textContent = msg;
  errorDiv.hidden = false;
}

function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMetadata(meta: LoadedArchive["metadata"]): void {
  // Show all fields, including defaults — an archive without metadata.json
  // displays the defaults (issue #16 parity).
  const fields: [string, string][] = [
    ["Title", meta.title],
    ["Author", meta.author],
    ["Description", meta.description],
    ["Created", meta.createdAt],
    ["Updated", meta.updatedAt],
    ["Delimiter", meta.delimiter],
    ["Quote char", meta.quoteChar],
    ["Has header", String(meta.hasHeader)],
  ];

  metadataDiv.innerHTML = fields
    .map(([k, v]) => `<span class="meta-item"><strong>${escHtml(k)}:</strong> ${escHtml(v)}</span>`)
    .join("");
  metadataDiv.hidden = false;
  tabsContainer.hidden = false;
}

function renderTabs(): void {
  if (!archive) return;
  tabButtons.innerHTML = "";
  archive.tableNames.forEach((name, index) => {
    const button = document.createElement("button");
    button.className = "tab-btn";
    button.textContent = name;
    button.addEventListener("click", () => selectTable(name));
    tabButtons.appendChild(button);
    if (index === 0) selectTable(name);
  });
}

function selectTable(name: string): void {
  if (!archive) return;
  const table = archive.tables.get(name);
  if (!table) return;

  Array.from(tabButtons.children).forEach((child) => {
    const button = child as HTMLButtonElement;
    button.classList.toggle("active", button.textContent === name);
  });

  renderGrid(table);
}

function destroyGrid(): void {
  activeGrid?.destroy();
  activeGrid = null;
}

function renderGrid(table: EditorTable): void {
  destroyGrid();
  activeTableName = table.name;
  gridContainer.innerHTML = "";

  const columnDefs: ColDef[] = table.header.map((column) => ({
    field: column,
    headerName: column,
  }));

  const defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    wrapText: true,
    autoHeight: true,
    minWidth: 120,
    // Read-only scaffold: editing arrives with the editing core (issue #28).
    editable: false,
  };

  const gridOptions: GridOptions = {
    theme: themeQuartz,
    columnDefs,
    defaultColDef,
    rowData: table.rows,
  };
  activeGrid = createGrid(gridContainer, gridOptions);
  activeTableName = table.name;

  const emptyMsg = document.createElement("div");
  emptyMsg.className = "empty-msg";
  emptyMsg.id = "empty-msg";
  emptyMsg.hidden = table.rows.length > 0;
  emptyMsg.textContent = `Table "${activeTableName}" has no rows.`;
  gridContainer.appendChild(emptyMsg);
}
