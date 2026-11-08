import {
  createGrid,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
  type GridApi,
  type GridOptions,
  type CellValueChangedEvent,
} from "ag-grid-community";
import { EditorStore, StoreEvent } from "./store";

ModuleRegistry.registerModules([AllCommunityModule]);

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;
const metadataDiv = document.getElementById("metadata") as HTMLDivElement;
const tabsContainer = document.getElementById("tabs-container") as HTMLDivElement;
const tabButtons = document.getElementById("tab-buttons") as HTMLDivElement;
const toolbar = document.getElementById("toolbar") as HTMLDivElement;
const gridContainer = document.getElementById("grid-container") as HTMLDivElement;
const dropZone = document.getElementById("drop-zone") as HTMLDivElement;

const btnUndo = document.getElementById("btn-undo") as HTMLButtonElement;
const btnRedo = document.getElementById("btn-redo") as HTMLButtonElement;
const btnAddRow = document.getElementById("btn-add-row") as HTMLButtonElement;
const btnRemoveRows = document.getElementById("btn-remove-rows") as HTMLButtonElement;
const btnAddColumn = document.getElementById("btn-add-column") as HTMLButtonElement;
const columnSelect = document.getElementById("column-select") as HTMLSelectElement;
const btnRemoveColumn = document.getElementById("btn-remove-column") as HTMLButtonElement;
const btnAddTable = document.getElementById("btn-add-table") as HTMLButtonElement;
const btnRenameTable = document.getElementById("btn-rename-table") as HTMLButtonElement;
const btnRemoveTable = document.getElementById("btn-remove-table") as HTMLButtonElement;

let store: EditorStore | null = null;
let activeGrid: GridApi | null = null;
let activeTableName: string | null = null;

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  await openFile(file);
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
    await openFile(file);
  }
});

async function openFile(file: File): Promise<void> {
  clearUI();
  try {
    store = await EditorStore.load(file, { onEvent: onStoreEvent });
    document.title = `Zipped CSV Editor — ${file.name}`;
    renderMetadata(store.metadata);
    renderTabs();
  } catch (err) {
    showError(`Failed to read file: ${err}`);
  }
}

function clearUI(): void {
  metadataDiv.hidden = true;
  metadataDiv.innerHTML = "";
  tabsContainer.hidden = true;
  tabButtons.innerHTML = "";
  gridContainer.innerHTML = "";
  toolbar.hidden = true;
  closeGrid();
  activeTableName = null;
  store = null;
  document.title = "Zipped CSV Editor";
}

function closeGrid(): void {
  activeGrid?.destroy();
  activeGrid = null;
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

// ── Rendering ──────────────────────────────────────────────────────────────

function renderMetadata(meta: EditorStore["metadata"]): void {
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
  tabsContainer.hidden = false;
  toolbar.hidden = false;
}

function renderTabs(): void {
  if (!store) return;
  tabButtons.innerHTML = "";
  for (const name of store.getTableNames()) {
    const button = document.createElement("button");
    button.className = "tab-btn" + (name === activeTableName ? " active" : "");
    button.textContent = (store.tableDirty(name) ? "● " : "") + name;
    button.addEventListener("click", () => selectTable(name));
    tabButtons.appendChild(button);
  }
  updateToolbar();
}

function selectTable(name: string): void {
  if (!store) return;
  const table = store.tables.get(name);
  if (!table) return;
  activeGrid?.stopEditing();
  activeTableName = name;
  renderTabs();
  renderGrid(table);
}

function renderGrid(table: EditorStore["tables"] extends Map<string, infer T> ? T : never): void;
function renderGrid(table: { name: string; header: string[]; rows: Record<string, string>[] }): void {
  closeGrid();
  gridContainer.innerHTML = "";

  const columnDefs: ColDef[] = table.header.map((column) => ({
    field: column,
    headerName: column,
  }));

  const gridOptions: GridOptions = {
    theme: themeQuartz,
    columnDefs,
    rowData: table.rows,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      wrapText: true,
      autoHeight: true,
      minWidth: 120,
      editable: true,
      cellDataType: false,
    },
    rowSelection: {
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
    },
    onCellValueChanged: (event: CellValueChangedEvent) => {
      // Only interactive edits feed the history; store/transaction updates are
      // applied via applyTransaction below and must not re-record.
      if (event.source !== "edit" || !store || !activeTableName || event.rowIndex == null) {
        return;
      }
      const column = event.colDef.field ?? "";
      if (column) {
        store.setCell(activeTableName, event.rowIndex, column, String(event.newValue ?? ""));
      }
    },
    onSelectionChanged: () => updateToolbar(),
  };

  activeGrid = createGrid(gridContainer, gridOptions);

  const emptyMsg = document.createElement("div");
  emptyMsg.className = "empty-msg";
  emptyMsg.hidden = table.rows.length > 0;
  emptyMsg.textContent = `Table "${table.name}" has no rows.`;
  gridContainer.appendChild(emptyMsg);

  refreshColumnOptions();
}

function refreshColumnOptions(): void {
  columnSelect.innerHTML = "";
  if (!store || !activeTableName) return;
  const table = store.tables.get(activeTableName);
  if (!table) return;
  for (const column of table.header) {
    const option = document.createElement("option");
    option.value = column;
    option.textContent = column;
    columnSelect.appendChild(option);
  }
  const last = table.header[table.header.length - 1];
  if (last) columnSelect.value = last;
  btnRemoveColumn.disabled = table.header.length === 0;
}

function updateToolbar(): void {
  if (!store) return;
  btnUndo.disabled = !store.canUndo;
  btnRedo.disabled = !store.canRedo;
  btnAddRow.disabled = !activeTableName;
  btnRemoveRows.disabled =
    !activeGrid || activeGrid.getSelectedNodes().length === 0;
  btnAddColumn.disabled = !activeTableName;
  btnRemoveColumn.disabled = !activeTableName;
  btnRenameTable.disabled = !activeTableName;
  btnRemoveTable.disabled = !activeTableName;
}

// ── Store events ───────────────────────────────────────────────────────────

function onStoreEvent(event: StoreEvent): void {
  renderTabs();

  switch (event.kind) {
    case "UndoRedoState":
      return; // nothing graphical; tabs/toolbar were refreshed above
    case "AddTable":
      selectTable(event.table);
      return;
    case "RemoveTable":
      if (event.table === activeTableName) {
        activeTableName = null;
        closeGrid();
        gridContainer.innerHTML = "";
      }
      return;
    case "RenameTable":
      if (event.renameFrom === activeTableName) {
        activeTableName = event.table;
        const table = store?.tables.get(event.table);
        if (table) renderGrid(table);
      }
      return;
    default:
      break;
  }

  if (!store || event.table !== activeTableName) {
    return;
  }

  if (!event.structural && event.rowIndex != null) {
    const table = store.tables.get(activeTableName!)!;
    activeGrid?.applyTransaction({ update: [table.rows[event.rowIndex]] });
    return;
  }

  const table = store.tables.get(activeTableName!);
  if (table) {
    renderGrid(table);
  } else {
    activeTableName = null;
    closeGrid();
  }
}

// ── Toolbar handlers ───────────────────────────────────────────────────────

btnUndo.addEventListener("click", () => {
  if (!store) return;
  activeGrid?.stopEditing();
  if (!store.undo()) {
    showError("Nothing to undo.");
  }
});

btnRedo.addEventListener("click", () => {
  if (!store) return;
  if (!store.redo()) {
    showError("Nothing to redo.");
  }
});

btnAddRow.addEventListener("click", () => {
  if (!store || !activeTableName) return;
  if (!store.addRow(activeTableName)) {
    showError("Could not add a row.");
  }
});

btnRemoveRows.addEventListener("click", () => {
  if (!store || !activeTableName || !activeGrid) return;
  const indices = activeGrid.getSelectedNodes().map((node) => node.rowIndex ?? -1);
  if (!store.removeRows(activeTableName, indices)) {
    showError("Could not remove the selected rows.");
  }
});

btnAddColumn.addEventListener("click", () => {
  if (!store || !activeTableName) return;
  const name = window.prompt(`New column name for ${activeTableName}:`);
  if (name === null) {
    return;
  }
  if (!store.addColumn(activeTableName, name)) {
    showError("Could not add the column (empty or duplicate name).");
  }
});

btnRemoveColumn.addEventListener("click", () => {
  if (!store || !activeTableName) return;
  const column = columnSelect.value;
  if (column && !store.removeColumn(activeTableName, column)) {
    showError("Could not remove the column.");
  }
});

btnAddTable.addEventListener("click", () => {
  if (!store) return;
  const existing = new Set(store.getTableNames());
  let suggestion = "New table.csv";
  let counter = 2;
  while (existing.has(suggestion)) {
    suggestion = `New table ${counter++}.csv`;
  }
  const input = window.prompt("New table name:", suggestion);
  if (input === null) {
    return;
  }
  const name = store.addTable(input);
  if (!name) {
    showError("Could not add the table (empty or duplicate name, or path-like).");
  }
});

btnRenameTable.addEventListener("click", () => {
  if (!store || !activeTableName) return;
  const current = activeTableName.replace(/\.csv$/i, "");
  const input = window.prompt(`Rename ${activeTableName} to:`, current);
  if (input === null) {
    return;
  }
  const name = store.renameTable(activeTableName, input);
  if (!name) {
    showError("Could not rename the table (empty or duplicate name, or path-like).");
  }
});

btnRemoveTable.addEventListener("click", () => {
  if (!store || !activeTableName) return;
  if (window.confirm(`Delete table ${activeTableName}?`)) {
    const name = activeTableName;
    store.removeTable(name);
  }
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

window.addEventListener("keydown", (event) => {
  if (!store) return;
  if (!(event.ctrlKey || event.metaKey)) {
    return;
  }
  const key = event.key.toLowerCase();
  const isUndo = key === "z" && !event.shiftKey;
  const isRedo = (key === "z" && event.shiftKey) || key === "y";
  if (!isUndo && !isRedo) {
    return;
  }

  event.preventDefault();
  // Commit a pending cell edit first so the pending value enters the history
  // before the undo/redo acts on it.
  activeGrid?.stopEditing();
  if (isUndo ? !store.undo() : !store.redo()) {
    // Nothing to do — ignore silently in the keyboard path.
  }
});
