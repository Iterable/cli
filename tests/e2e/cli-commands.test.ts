import { describe, expect, it } from "@jest/globals";

import { runCli } from "./helpers";

const describeIfKey = process.env.ITERABLE_API_KEY ? describe : describe.skip;

describeIfKey("CLI commands", () => {
  it("campaigns list returns valid output", async () => {
    const { stdout } = await runCli([
      "campaigns",
      "list",
      "--page",
      "1",
      "--pageSize",
      "1",
    ]);
    expect(stdout).toBeDefined();
    expect(stdout.length).toBeGreaterThan(0);
  });

  it("campaigns list --output json returns parseable JSON", async () => {
    const { stdout } = await runCli([
      "campaigns",
      "list",
      "--output",
      "json",
      "--page",
      "1",
      "--pageSize",
      "1",
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed).toBeDefined();
    expect(parsed).toHaveProperty("campaigns");
  });
});
