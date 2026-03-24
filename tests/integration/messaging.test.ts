import { IterableClient } from "@iterable/api";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { findCommand } from "../../src/commands/registry";

const API_KEY = process.env.ITERABLE_API_KEY ?? "";
const describeIfKey = API_KEY ? describe : describe.skip;

describeIfKey("messaging integration", () => {
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

  it("should get channels", async () => {
    const cmd = findCommand("messaging", "get-channels");
    if (!cmd) throw new Error("Command not found");
    const result = await cmd.execute(client, {});
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });

  it("should get message types", async () => {
    const cmd = findCommand("messaging", "get-message-types");
    if (!cmd) throw new Error("Command not found");
    const result = await cmd.execute(client, {});
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });
});
