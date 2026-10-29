// CSV export for spreadsheets. Cells are quoted per RFC 4180 and guarded against formula
// injection, because exported text (names, bios, brief input) is not under the app's control.

export type CSVValue = string | number | boolean | null | undefined;

export interface CSVColumn<T> {
  header: string;
  value: (row: T) => CSVValue;
}

/** First characters that make Excel, Google Sheets or LibreOffice read a cell as a formula. */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

const UTF8_BOM = "﻿";

// Revoking the object URL straight after click() can cancel the download in some browsers.
const REVOKE_DELAY_MS = 30_000;

/**
 * Escapes one cell. Numbers are written as they are (a number can't carry a formula, and a
 * negative value must stay numeric); text that could start a formula gets a leading apostrophe;
 * anything containing a comma, double quote or line break is wrapped in quotes.
 */
export function escapeCSVCell(value: CSVValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  let text = String(value);
  if (FORMULA_TRIGGERS.has(text.charAt(0))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A header row plus one row per item, separated by CRLF. No byte-order mark: see createCSVBlob. */
export function toCSV<T>(rows: readonly T[], columns: readonly CSVColumn<T>[]): string {
  const header = columns.map((column) => escapeCSVCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCSVCell(column.value(row))).join(","));
  return [header, ...body].join("\r\n");
}

/** Excel only reads a CSV as UTF-8 (₹, Devanagari, Tamil...) when the file starts with a byte-order mark. */
export function createCSVBlob(csv: string): Blob {
  return new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8" });
}

/** Saves `csv` as a file through a temporary link. Browser only. */
export function downloadCSV(filename: string, csv: string): void {
  const url = URL.createObjectURL(createCSVBlob(csv));
  const link = document.createElement("a");
  link.href = url;
  link.download = /\.csv$/i.test(filename) ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
