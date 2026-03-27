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
  columns?: string[],
  params?: Record<string, unknown>
): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "pretty":
      return colorizeJson(data);
    case "table":
      return formatTable(data, columns, params);
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

interface TableData {
  rows: unknown[];
  metadata: Record<string, unknown>;
}

function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null
  );
}

function findTableData(data: unknown): TableData | null {
  if (isObjectArray(data)) return { rows: data, metadata: {} };
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    for (const [arrayKey, value] of entries) {
      if (isObjectArray(value)) {
        const metadata: Record<string, unknown> = {};
        for (const [key, val] of entries) {
          if (key !== arrayKey) metadata[key] = val;
        }
        return { rows: value, metadata };
      }
    }
  }
  return null;
}

function collectKeys(rows: unknown[]): string[] {
  const keys = new Set<string>();
  for (const item of rows) {
    if (item && typeof item === "object") {
      for (const k of Object.keys(item as Record<string, unknown>)) {
        keys.add(k);
      }
    }
  }
  return [...keys];
}

function resolveColumns(
  requested: string[] | undefined,
  available: string[]
): string[] {
  if (!requested || requested.length === 0) return available;

  const validSet = new Set(available);
  const invalid = requested.filter((c) => !validSet.has(c));
  if (invalid.length > 0) {
    console.error(
      // eslint-disable-line no-console
      `Warning: unknown column(s): ${invalid.join(", ")}. Available: ${available.join(", ")}`
    );
  }
  const valid = requested.filter((c) => validSet.has(c));
  return valid.length > 0 ? valid : available;
}

function formatTable(
  data: unknown,
  columns?: string[],
  params?: Record<string, unknown>
): string {
  if (data === null || data === undefined) {
    return theme.muted("(empty)");
  }

  const tableData = findTableData(data);

  if (tableData) {
    const { rows, metadata } = tableData;
    const meta = formatMetadata(metadata, rows.length, params);

    if (rows.length === 0) {
      return meta ? meta.trimStart() : theme.muted("No results");
    }

    const isObjectRows = rows[0] && typeof rows[0] === "object";
    if (isObjectRows) {
      const selectedColumns = resolveColumns(columns, collectKeys(rows));
      const table = new Table({
        head: selectedColumns.map((c) => theme.bold(c)),
        wordWrap: true,
      });
      for (const item of rows) {
        const obj = (item ?? {}) as Record<string, unknown>;
        table.push(selectedColumns.map((col) => formatCellValue(obj[col])));
      }
      return table.toString() + meta;
    }

    const table = new Table({ head: [theme.bold("Value")] });
    for (const item of rows) {
      table.push([formatCellValue(item)]);
    }
    return table.toString() + meta;
  }

  // Single object: key-value table
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

function formatMetadata(
  metadata: Record<string, unknown>,
  rowCount: number,
  params?: Record<string, unknown>
): string {
  const totalKey = Object.keys(metadata).find(
    (k) => k.startsWith("total") && typeof metadata[k] === "number"
  );
  const total = totalKey ? (metadata[totalKey] as number) : undefined;
  const hasMore = typeof metadata.nextPageUrl === "string";

  if (total === undefined && !hasMore) return "";

  const page = typeof params?.page === "number" ? params.page : undefined;
  const pageSize =
    typeof params?.pageSize === "number" ? params.pageSize : undefined;

  let summary: string;
  if (rowCount === 0) {
    summary =
      total !== undefined ? `No results (${total} total)` : "No results";
  } else if (page !== undefined && pageSize !== undefined) {
    const start = (page - 1) * pageSize + 1;
    const end = start + rowCount - 1;
    summary =
      total !== undefined
        ? `Showing ${start}-${end} of ${total}`
        : `Showing ${start}-${end}`;
  } else if (total !== undefined) {
    summary = `Showing ${rowCount} of ${total}`;
  } else {
    summary = `Showing ${rowCount} results`;
  }
  if (hasMore && page !== undefined && pageSize !== undefined) {
    summary += `  (next: --page ${page + 1} --pageSize ${pageSize})`;
  } else if (hasMore) {
    summary += "  (more results available)";
  }

  return "\n" + theme.muted(summary);
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return theme.muted("null");
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
