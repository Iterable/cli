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
      return colorizeJson(JSON.stringify(data, null, 2));
    case "table":
      return formatTable(data, columns);
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

function colorizeJson(json: string): string {
  return json
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      (_match, key: string) => `${theme.key(key)}:`
    )
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      (_match, value: string) => `: ${theme.value(value)}`
    )
    .replace(
      /:\s*(\d+(?:\.\d+)?)/g,
      (_match, num: string) => `: ${theme.number(num)}`
    )
    .replace(
      /:\s*(true|false)/g,
      (_match, bool: string) => `: ${theme.boolean(bool)}`
    )
    .replace(/:\s*(null)/g, () => `: ${theme.muted("null")}`)
    .replace(
      /(?<=[[,])\s*("(?:[^"\\]|\\.)*")/g,
      (_match, str: string) => ` ${theme.value(str)}`
    )
    .replace(
      /(?<=[[,])\s*(\d+(?:\.\d+)?)\b/g,
      (_match, num: string) => ` ${theme.number(num)}`
    );
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
