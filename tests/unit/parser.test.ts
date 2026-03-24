import { describe, expect, it } from "@jest/globals";
import { z } from "zod";

import { sortTransform } from "../../src/commands/transforms";
import { ValidationError } from "../../src/errors";
import { buildParser, parseCommand } from "../../src/parser";

describe("buildParser", () => {
  it("registers flat fields natively with zod-opts", () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().optional(),
      verbose: z.boolean().default(false),
    });
    const built = buildParser(schema, "test");
    expect(built.jsonFallbackFields).toEqual([]);
  });

  it("complex object fields fall back to JSON string flags", () => {
    const schema = z.object({
      name: z.string(),
      metadata: z.object({ nested: z.string(), count: z.number() }).optional(),
    });
    const built = buildParser(schema, "test");
    expect(built.jsonFallbackFields).not.toContain("name");
    expect(built.jsonFallbackFields).toContain("metadata");
  });

  it("cliTransform fields are excluded from jsonFallbackFields", () => {
    const schema = z.object({
      page: z.number().optional(),
      sort: z
        .object({
          field: z.string(),
          direction: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
    });
    const built = buildParser(schema, "test", undefined, {
      sort: sortTransform,
    });
    expect(built.jsonFallbackFields).not.toContain("sort");
  });
});

describe("parseCommand", () => {
  it("sort transform: --sort and --order produce sort object", async () => {
    const schema = z.object({
      sort: z
        .object({
          field: z.string(),
          direction: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
    });
    const result = await parseCommand(
      schema,
      "test",
      ["--sort", "createdAt", "--order", "desc"],
      undefined,
      { sort: sortTransform }
    );
    expect(result).toEqual({
      sort: { field: "createdAt", direction: "desc" },
    });
  });

  it("sort transform without --order omits direction", async () => {
    const schema = z.object({
      sort: z
        .object({
          field: z.string(),
          direction: z.enum(["asc", "desc"]).optional(),
        })
        .optional(),
    });
    const result = await parseCommand(
      schema,
      "test",
      ["--sort", "createdAt"],
      undefined,
      { sort: sortTransform }
    );
    expect(result).toEqual({ sort: { field: "createdAt" } });
  });

  it("positional args work", async () => {
    const schema = z.object({ id: z.number() });
    const result = await parseCommand(schema, "test", ["123"], ["id"]);
    expect(result).toEqual({ id: 123 });
  });

  it("--json parses inline JSON", async () => {
    const schema = z.object({
      page: z.number().optional(),
      pageSize: z.number().optional(),
    });
    const result = await parseCommand(schema, "test", ["--json", '{"page":1}']);
    expect(result).toEqual({ page: 1 });
  });

  it("--json with invalid JSON throws ValidationError", async () => {
    const schema = z.object({ page: z.number().optional() });
    await expect(
      parseCommand(schema, "test", ["--json", "not-valid-json"])
    ).rejects.toThrow(ValidationError);
  });

  it("--json handles complex schemas that zod-opts cannot parse natively", async () => {
    const schema = z.object({
      name: z.string(),
      metadata: z.object({ nested: z.string(), count: z.number() }).optional(),
    });
    const result = await parseCommand(schema, "test", [
      "--json",
      '{"name":"foo","metadata":{"nested":"bar","count":5}}',
    ]);
    expect(result).toEqual({
      name: "foo",
      metadata: { nested: "bar", count: 5 },
    });
  });

  it("empty schema with empty args works", async () => {
    const result = await parseCommand(z.object({}), "test", []);
    expect(result).toEqual({});
  });

  it("--json without value throws ValidationError", async () => {
    const schema = z.object({ page: z.number().optional() });
    await expect(parseCommand(schema, "test", ["--json"])).rejects.toThrow(
      ValidationError
    );
    await expect(parseCommand(schema, "test", ["--json"])).rejects.toThrow(
      "--json requires a value"
    );
  });

  it("--json followed by another flag throws ValidationError", async () => {
    const schema = z.object({
      page: z.number().optional(),
    });
    await expect(
      parseCommand(schema, "test", ["--json", "--page"])
    ).rejects.toThrow(ValidationError);
    await expect(
      parseCommand(schema, "test", ["--json", "--page"])
    ).rejects.toThrow("--json requires a value");
  });
});
