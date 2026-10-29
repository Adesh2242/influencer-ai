import { describe, expect, it } from "vitest";
import { createCSVBlob, escapeCSVCell, toCSV, type CSVColumn } from "./csv";

interface Row {
  name: string;
  note: string;
  amount: number;
}

const COLUMNS: CSVColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Note", value: (row) => row.note },
  { header: "Amount (INR)", value: (row) => row.amount },
];

describe("escapeCSVCell", () => {
  it("leaves plain text and numbers untouched", () => {
    expect(escapeCSVCell("Priya Raman")).toBe("Priya Raman");
    expect(escapeCSVCell("चाय")).toBe("चाय");
    expect(escapeCSVCell(45000)).toBe("45000");
    expect(escapeCSVCell(3.4)).toBe("3.4");
    expect(escapeCSVCell(true)).toBe("true");
  });

  it("writes empty cells for missing or non-finite values", () => {
    expect(escapeCSVCell(null)).toBe("");
    expect(escapeCSVCell(undefined)).toBe("");
    expect(escapeCSVCell(Number.NaN)).toBe("");
    expect(escapeCSVCell(Number.POSITIVE_INFINITY)).toBe("");
    expect(escapeCSVCell("")).toBe("");
  });

  it("quotes cells with commas, quotes and line breaks, doubling inner quotes", () => {
    expect(escapeCSVCell("Hindi, English")).toBe('"Hindi, English"');
    expect(escapeCSVCell('The "chai" channel')).toBe('"The ""chai"" channel"');
    expect(escapeCSVCell("line one\nline two")).toBe('"line one\nline two"');
    expect(escapeCSVCell("line one\r\nline two")).toBe('"line one\r\nline two"');
    expect(escapeCSVCell('"')).toBe('""""');
  });

  it("prefixes an apostrophe to text that a spreadsheet would run as a formula", () => {
    expect(escapeCSVCell("=HYPERLINK(\"http://example.com\")")).toBe("\"'=HYPERLINK(\"\"http://example.com\"\")\"");
    expect(escapeCSVCell("=1+1")).toBe("'=1+1");
    expect(escapeCSVCell("+91 98765")).toBe("'+91 98765");
    expect(escapeCSVCell("-2+3")).toBe("'-2+3");
    expect(escapeCSVCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCSVCell("\t=1+1")).toBe("'\t=1+1");
    expect(escapeCSVCell("\r=1+1")).toBe("\"'\r=1+1\"");
  });

  it("guards text but keeps negative numbers numeric", () => {
    expect(escapeCSVCell(-1500)).toBe("-1500");
    expect(escapeCSVCell("-1500")).toBe("'-1500");
  });

  it("only guards a trigger in the first position", () => {
    expect(escapeCSVCell("a=b")).toBe("a=b");
    expect(escapeCSVCell("priya@example.com")).toBe("priya@example.com");
  });
});

describe("toCSV", () => {
  it("writes a header row and one CRLF-separated row per item", () => {
    const csv = toCSV(
      [
        { name: "Priya Raman", note: "Tamil, English", amount: 45000 },
        { name: "=cmd", note: 'Said "yes"', amount: -10 },
      ],
      COLUMNS,
    );
    expect(csv).toBe(
      ['Name,Note,Amount (INR)', 'Priya Raman,"Tamil, English",45000', "'=cmd,\"Said \"\"yes\"\"\",-10"].join("\r\n"),
    );
  });

  it("returns only the header for no rows", () => {
    expect(toCSV([], COLUMNS)).toBe("Name,Note,Amount (INR)");
  });

  it("does not add a byte-order mark", () => {
    const csv = toCSV([{ name: "Priya", note: "", amount: 1 }], COLUMNS);
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    expect(csv.startsWith("Name")).toBe(true);
    expect(csv.includes("﻿")).toBe(false);
  });
});

describe("createCSVBlob", () => {
  it("prepends a UTF-8 byte-order mark so Excel reads ₹ and Indic scripts correctly", async () => {
    const blob = createCSVBlob("Fee\r\n₹45,000");
    expect(blob.type).toBe("text/csv;charset=utf-8");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("Fee\r\n₹45,000");
  });
});
