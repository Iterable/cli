import { describe, expect, it } from "@jest/globals";

import { parseArgs } from "../../src/router";

describe("parseArgs", () => {
  it("parses category and action", () => {
    const result = parseArgs(["campaigns", "list"]);
    expect(result).toEqual({
      category: "campaigns",
      action: "list",
      rest: [],
      globalFlags: { help: false, version: false, force: false },
    });
  });

  it("extracts remaining args as rest", () => {
    const result = parseArgs(["campaigns", "list", "--page", "1"]);
    expect(result.category).toBe("campaigns");
    expect(result.action).toBe("list");
    expect(result.rest).toEqual(["--page", "1"]);
  });

  it("extracts --help flag", () => {
    const result = parseArgs(["--help"]);
    expect(result.globalFlags.help).toBe(true);
    expect(result.category).toBeNull();
  });

  it("extracts -h shorthand", () => {
    const result = parseArgs(["-h"]);
    expect(result.globalFlags.help).toBe(true);
  });

  it("extracts --version flag", () => {
    const result = parseArgs(["--version"]);
    expect(result.globalFlags.version).toBe(true);
    expect(result.category).toBeNull();
  });

  it("extracts -V shorthand", () => {
    const result = parseArgs(["-V"]);
    expect(result.globalFlags.version).toBe(true);
  });

  it("extracts --output", () => {
    const result = parseArgs(["--output", "table", "campaigns", "list"]);
    expect(result.globalFlags.output).toBe("table");
    expect(result.category).toBe("campaigns");
    expect(result.action).toBe("list");
  });

  it("extracts --columns", () => {
    const result = parseArgs([
      "--columns",
      "id,name,type",
      "campaigns",
      "list",
    ]);
    expect(result.globalFlags.columns).toEqual(["id", "name", "type"]);
    expect(result.category).toBe("campaigns");
  });

  it("trims whitespace from --columns values", () => {
    const result = parseArgs(["--columns", "id, name, type"]);
    expect(result.globalFlags.columns).toEqual(["id", "name", "type"]);
  });

  it("handles category-only", () => {
    const result = parseArgs(["campaigns"]);
    expect(result.category).toBe("campaigns");
    expect(result.action).toBeNull();
    expect(result.rest).toEqual([]);
  });

  it("handles empty args", () => {
    const result = parseArgs([]);
    expect(result.category).toBeNull();
    expect(result.action).toBeNull();
    expect(result.rest).toEqual([]);
    expect(result.globalFlags).toEqual({
      help: false,
      version: false,
      force: false,
    });
  });

  it("handles help with category", () => {
    const result = parseArgs(["campaigns", "--help"]);
    expect(result.category).toBe("campaigns");
    expect(result.globalFlags.help).toBe(true);
    expect(result.action).toBeNull();
  });

  it("extracts --force flag", () => {
    const result = parseArgs(["--force", "lists", "delete", "123"]);
    expect(result.globalFlags.force).toBe(true);
    expect(result.category).toBe("lists");
  });

  it("extracts -f shorthand", () => {
    const result = parseArgs(["-f", "lists", "delete"]);
    expect(result.globalFlags.force).toBe(true);
  });

  it("extracts --file flag", () => {
    const result = parseArgs(["--file", "data.json", "users", "bulk-update"]);
    expect(result.globalFlags.file).toBe("data.json");
    expect(result.category).toBe("users");
    expect(result.action).toBe("bulk-update");
  });

  it("extracts --key flag", () => {
    const result = parseArgs(["--key", "production", "campaigns", "list"]);
    expect(result.globalFlags.key).toBe("production");
    expect(result.category).toBe("campaigns");
  });

  it("extracts -k shorthand", () => {
    const result = parseArgs(["-k", "staging", "campaigns", "list"]);
    expect(result.globalFlags.key).toBe("staging");
  });

  it("handles multiple flags combined", () => {
    const result = parseArgs([
      "--force",
      "--output",
      "table",
      "--key",
      "prod",
      "--columns",
      "id,name",
      "campaigns",
      "list",
      "--pageSize",
      "5",
    ]);
    expect(result.globalFlags).toEqual({
      help: false,
      version: false,
      force: true,
      output: "table",
      key: "prod",
      columns: ["id", "name"],
    });
    expect(result.category).toBe("campaigns");
    expect(result.action).toBe("list");
    expect(result.rest).toEqual(["--pageSize", "5"]);
  });
});
