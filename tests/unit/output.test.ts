import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import chalk from "chalk";

import { formatOutput, getDefaultFormat } from "../../src/output";

let originalChalkLevel: (typeof chalk)["level"];

beforeAll(() => {
  originalChalkLevel = chalk.level;
  chalk.level = 1;
});

afterAll(() => {
  chalk.level = originalChalkLevel;
});

describe("getDefaultFormat", () => {
  it("returns json when stdout is not a TTY", () => {
    expect(getDefaultFormat()).toBe("json");
  });
});

describe("formatOutput", () => {
  describe("json format", () => {
    it("produces valid parseable JSON", () => {
      const data = { id: 1, name: "test" };
      const result = formatOutput(data, "json");
      expect(JSON.parse(result)).toEqual(data);
    });

    it("handles nested objects and arrays", () => {
      const data = {
        items: [{ id: 1 }, { id: 2 }],
        meta: { page: 1, total: 2 },
      };
      const result = formatOutput(data, "json");
      expect(JSON.parse(result)).toEqual(data);
    });

    it("handles arrays", () => {
      const data = [1, "two", true];
      const result = formatOutput(data, "json");
      expect(JSON.parse(result)).toEqual(data);
    });

    it("handles null values", () => {
      const data = { key: null, nested: { also: null } };
      const result = formatOutput(data, "json");
      expect(JSON.parse(result)).toEqual(data);
    });
  });

  describe("pretty format", () => {
    it("contains ANSI color codes", () => {
      const data = { name: "test", count: 42, active: true };
      const result = formatOutput(data, "pretty");
      // eslint-disable-next-line no-control-regex
      expect(result).toMatch(/\x1B\[/);
    });
  });

  describe("table format", () => {
    it("produces table with column headers for array of objects", () => {
      const data = [
        { id: 1, name: "first" },
        { id: 2, name: "second" },
      ];
      const result = formatOutput(data, "table");
      expect(result).toContain("id");
      expect(result).toContain("name");
      expect(result).toContain("1");
      expect(result).toContain("first");
      expect(result).toContain("2");
      expect(result).toContain("second");
    });

    it("produces key-value table for single object", () => {
      const data = { id: 1, name: "test", status: "active" };
      const result = formatOutput(data, "table");
      expect(result).toContain("id");
      expect(result).toContain("name");
      expect(result).toContain("status");
      expect(result).toContain("1");
      expect(result).toContain("test");
      expect(result).toContain("active");
    });

    it("extracts and tabulates nested array", () => {
      const data = { campaigns: [{ id: 1, name: "test" }] };
      const result = formatOutput(data, "table");
      expect(result).toContain("id");
      expect(result).toContain("name");
      expect(result).toContain("1");
      expect(result).toContain("test");
    });

    it('returns "(empty)" for null', () => {
      const result = formatOutput(null, "table");
      expect(result).toContain("(empty)");
    });

    it('returns "(empty)" for undefined', () => {
      const result = formatOutput(undefined, "table");
      expect(result).toContain("(empty)");
    });
  });
});
