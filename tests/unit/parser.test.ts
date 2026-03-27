import { describe, expect, it } from "@jest/globals";
import { z } from "zod";

import { sortTransform } from "../../src/commands/transforms";
import { ValidationError } from "../../src/errors";
import { buildParser, describeCommand, parseCommand } from "../../src/parser";

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

  it("unknown option throws ValidationError", async () => {
    const schema = z.object({
      page: z.number().optional(),
    });
    await expect(parseCommand(schema, "test", ["--unknown"])).rejects.toThrow(
      ValidationError
    );
  });
});

describe("describeCommand", () => {
  it("treats nullable fields as optional", () => {
    const schema = z.object({
      name: z.string(),
      tag: z.string().nullable(),
    });
    const fields = describeCommand({ schema });
    const nameField = fields.find((f) => f.name === "name");
    const tagField = fields.find((f) => f.name === "tag");
    expect(nameField?.required).toBe(true);
    expect(tagField?.required).toBe(false);
  });

  it("treats fields with defaults as optional", () => {
    const schema = z.object({
      limit: z.number().default(10),
    });
    const fields = describeCommand({ schema });
    const limitField = fields.find((f) => f.name === "limit");
    expect(limitField?.required).toBe(false);
    expect(limitField?.defaultValue).toBe(10);
  });

  it("auto-detects single required scalar as positional", () => {
    const schema = z.object({
      id: z.number(),
      verbose: z.boolean().optional(),
    });
    const fields = describeCommand({ schema });
    const idField = fields.find((f) => f.name === "id");
    expect(idField?.isPositional).toBe(true);
  });

  it("does not auto-detect positional when multiple required fields exist", () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });
    const fields = describeCommand({ schema });
    expect(fields.every((f) => !f.isPositional)).toBe(true);
  });
});
