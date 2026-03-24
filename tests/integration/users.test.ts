import { IterableClient } from "@iterable/api";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { findCommand } from "../../src/commands/registry";

const API_KEY = process.env.ITERABLE_API_KEY ?? "";
const describeIfKey = API_KEY ? describe : describe.skip;

describeIfKey("users integration", () => {
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

  it("should get user fields", async () => {
    const cmd = findCommand("users", "get-fields");
    if (!cmd) throw new Error("Command not found");
    const result = await cmd.execute(client, {});
    expect(result).toBeDefined();
  });
});
