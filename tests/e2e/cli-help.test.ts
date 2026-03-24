import { describe, expect, it } from "@jest/globals";

import { runCli } from "./helpers";

describe("CLI help output", () => {
  it("--help exits 0 and stdout contains 'campaigns'", async () => {
    const { stdout } = await runCli(["--help"]);
    expect(stdout).toContain("campaigns");
  });

  it("campaigns --help exits 0 and stdout contains 'list'", async () => {
    const { stdout } = await runCli(["campaigns", "--help"]);
    expect(stdout).toContain("list");
  });

  it("--version exits 0 and matches version pattern", async () => {
    const { stdout } = await runCli(["--version"]);
    expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });
});
