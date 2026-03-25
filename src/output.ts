import Table from "cli-table3";

import { theme } from "./utils/theme.js";

export const OUTPUT_FORMATS = ["json", "pretty", "table"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export function getDefaultFormat(): OutputFormat {
  return process.stdout.isTTY ? "pretty" : "json";
}

export function formatOutput(
  data: unknown,
  format: OutputFormat,
  columns?: string[]
): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "pretty":
      return colorizeJson(data);
    case "table":
      return formatTable(data, columns);
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

function colorizeJson(data: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);

  if (data === null) return theme.muted("null");
  if (typeof data === "boolean") return theme.boolean(String(data));
  if (typeof data === "number") return theme.number(String(data));
  if (typeof data === "string") return theme.value(JSON.stringify(data));

  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    const items = data.map(
      (item) => `${pad1}${colorizeJson(item, indent + 1)}`
    );
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const lines = entries.map(
      ([key, val]) =>
        `${pad1}${theme.key(JSON.stringify(key))}: ${colorizeJson(val, indent + 1)}`
    );
    return `{\n${lines.join(",\n")}\n${pad}}`;
  }

  return String(data);
}

function findTableData(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    for (const [, value] of entries) {
      if (Array.isArray(value) && value.length > 0) {
        return value;
      }
    }
  }
  return null;
}

function formatTable(data: unknown, columns?: string[]): string {
  if (data === null || data === undefined) {
    return theme.muted("(empty)");
  }

  const arrayData = findTableData(data);

  if (arrayData && arrayData.length > 0) {
    const firstItem = arrayData[0];
    if (firstItem && typeof firstItem === "object") {
      let selectedColumns: string[];
      if (columns && columns.length > 0) {
        const allKeys = new Set<string>();
        for (const item of arrayData) {
          if (item && typeof item === "object") {
            Object.keys(item as Record<string, unknown>).forEach((k) =>
              allKeys.add(k)
            );
          }
        }
        const invalid = columns.filter((c) => !allKeys.has(c));
        if (invalid.length > 0) {
          console.error(
            // eslint-disable-line no-console
            `Warning: unknown column(s): ${invalid.join(", ")}. Available: ${[...allKeys].join(", ")}`
          );
        }
        selectedColumns = columns.filter((c) => allKeys.has(c));
        if (selectedColumns.length === 0) {
          selectedColumns = [...allKeys];
        }
      } else {
        const allKeys = new Set<string>();
        for (const item of arrayData) {
          if (item && typeof item === "object") {
            Object.keys(item as Record<string, unknown>).forEach((k) =>
              allKeys.add(k)
            );
          }
        }
        selectedColumns = [...allKeys];
      }
      const table = new Table({
        head: selectedColumns.map((c) => theme.bold(c)),
        wordWrap: true,
      });
      for (const item of arrayData) {
        const obj = (item ?? {}) as Record<string, unknown>;
        table.push(selectedColumns.map((col) => formatCellValue(obj[col])));
      }
      return table.toString();
    }
    const table = new Table({ head: [theme.bold("Value")] });
    for (const item of arrayData) {
      table.push([formatCellValue(item)]);
    }
    return table.toString();
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    const filteredEntries =
      columns && columns.length > 0
        ? entries.filter(([key]) => columns.includes(key))
        : entries;
    const table = new Table({
      head: [theme.bold("Key"), theme.bold("Value")],
    });
    for (const [key, value] of filteredEntries) {
      table.push([theme.key(key), formatCellValue(value)]);
    }
    return table.toString();
  }

  return String(data);
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return theme.muted("null");
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
