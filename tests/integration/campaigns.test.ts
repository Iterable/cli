import { IterableClient } from "@iterable/api";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { findCommand } from "../../src/commands/registry";

const API_KEY = process.env.ITERABLE_API_KEY ?? "";
const describeIfKey = API_KEY ? describe : describe.skip;

describeIfKey("campaigns integration", () => {
  let client: IterableClient;
  beforeAll(() => {
    client = new IterableClient({
      apiKey: API_KEY,
      baseUrl: "https://api.iterable.com",
    });
  });
  afterAll(() => {
    client.destroy();
  });

  it("should list campaigns with default params", async () => {
    const cmd = findCommand("campaigns", "list");
    if (!cmd) throw new Error("Command not found");
    const result = await cmd.execute(client, {});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("campaigns");
    expect(Array.isArray((result as Record<string, unknown>).campaigns)).toBe(
      true
    );
  });

  it("should list campaigns with pagination params", async () => {
    const cmd = findCommand("campaigns", "list");
    if (!cmd) throw new Error("Command not found");
    const result = await cmd.execute(client, { page: 1, pageSize: 2 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("campaigns");
    expect(Array.isArray((result as Record<string, unknown>).campaigns)).toBe(
      true
    );
  });
});
