import { ZippedCsvBrowser, ZcsvMetadata } from "./zippedcsv-browser";
import { Csv } from "../../src/csv";

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;
const metadataDiv = document.getElementById("metadata") as HTMLDivElement;
const tabsContainer = document.getElementById("tabs-container") as HTMLDivElement;
const tabButtons = document.getElementById("tab-buttons") as HTMLDivElement;
const tabContent = document.getElementById("tab-content") as HTMLDivElement;

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  clearUI();

  try {
    const zcsv = await ZippedCsvBrowser.fromFile(file);
    renderMetadata(zcsv.getMetadata());
    renderTabs(zcsv);
  } catch (err) {
    showError(`Failed to read file: ${err}`);
  }
});

function clearUI(): void {
  errorDiv.hidden = true;
  errorDiv.textContent = "";
  metadataDiv.hidden = true;
  metadataDiv.innerHTML = "";
  tabsContainer.hidden = true;
  tabButtons.innerHTML = "";
  tabContent.innerHTML = "";
}

function showError(msg: string): void {
  errorDiv.textContent = msg;
  errorDiv.hidden = false;
}

function renderMetadata(meta: ZcsvMetadata): void {
  const fields: [string, string][] = [
    ["Title", meta.title],
    ["Author", meta.author],
    ["Description", meta.description],
    ["Created", meta.createdAt],
    ["Updated", meta.updatedAt],
    ["Delimiter", meta.delimiter],
    ["Quote char", meta.quoteChar],
    ["Has header", String(meta.hasHeader)],
  ].filter(([, v]) => v !== "") as [string, string][];

  if (fields.length === 0) return;

  metadataDiv.innerHTML = fields
    .map(([k, v]) => `<span class="meta-item"><strong>${k}:</strong> ${escHtml(v)}</span>`)
    .join("");
  metadataDiv.hidden = false;
}

function renderTabs(zcsv: ZippedCsvBrowser): void {
  const names = zcsv.getTableNames();

  if (names.length === 0) {
    showError("No CSV tables found in this archive.");
    return;
  }

  names.forEach((name, idx) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (idx === 0 ? " active" : "");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      document.querySelectorAll<HTMLButtonElement>(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderTable(zcsv.getCsv(name));
    });
    tabButtons.appendChild(btn);
  });

  renderTable(zcsv.getCsv(names[0]));
  tabsContainer.hidden = false;
}

function renderTable(csv: Csv): void {
  const header = csv.getHeader();
  const data = csv.getData();

  if (header.length === 0) {
    tabContent.innerHTML = '<p class="empty-msg">This table is empty.</p>';
    return;
  }

  const ths = header
    .map((h) => `<th title="${escHtml(h)}">${escHtml(h)}</th>`)
    .join("");

  const trs = data
    .map(
      (row) =>
        `<tr>${header
          .map((h) => `<td title="${escHtml(row[h] ?? "")}">${escHtml(row[h] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const rowLabel = `${data.length} row${data.length !== 1 ? "s" : ""}`;

  tabContent.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
    <p class="row-count">${rowLabel}</p>
  `;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
