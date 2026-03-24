import { describe, expect, it } from "@jest/globals";

import { runCli, TEST_ENV } from "./helpers";

describe("CLI error handling", () => {
  it("unknown category exits non-zero", async () => {
    try {
      await runCli(["nonexistent"]);
      throw new Error("Expected command to fail");
    } catch (err: unknown) {
      const execErr = err as { code: number | string; stderr: string };
      expect(execErr.code).not.toBe(0);
      expect(execErr.stderr).toContain("Unknown category");
    }
  });

  it("missing API key exits non-zero with setup message", async () => {
    const envWithoutKey = { ...TEST_ENV, ITERABLE_API_KEY: "" };
    try {
      await runCli(["campaigns", "list"], envWithoutKey);
      throw new Error("Expected command to fail");
    } catch (err: unknown) {
      const execErr = err as { code: number | string; stderr: string };
      expect(execErr.code).not.toBe(0);
      const output = execErr.stderr || "";
      expect(output.length).toBeGreaterThan(0);
    }
  });
});
