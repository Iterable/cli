import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { loadCliConfig } from "../../src/config";

describe("loadCliConfig", () => {
  const envBackup: Record<string, string | undefined> = {};
  const ENV_KEYS = ["ITERABLE_API_KEY", "ITERABLE_BASE_URL", "NODE_ENV"];

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      envBackup[key] = process.env[key];
    }
    process.env.NODE_ENV = "test";
    delete process.env.ITERABLE_API_KEY;
    delete process.env.ITERABLE_BASE_URL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("returns config with ITERABLE_API_KEY env var", async () => {
    process.env.ITERABLE_API_KEY = "test-key-123";
    const config = await loadCliConfig();
    expect(config.apiKey).toBe("test-key-123");
  });

  it("returns ITERABLE_BASE_URL when set", async () => {
    process.env.ITERABLE_API_KEY = "test-key-123";
    process.env.ITERABLE_BASE_URL = "https://custom.example.com";
    const config = await loadCliConfig();
    expect(config.baseUrl).toBe("https://custom.example.com");
  });

  it("throws error without ITERABLE_API_KEY", async () => {
    await expect(loadCliConfig()).rejects.toThrow(/No API key found/);
  });

  it("uses default base URL https://api.iterable.com", async () => {
    process.env.ITERABLE_API_KEY = "test-key";
    const config = await loadCliConfig();
    expect(config.baseUrl).toBe("https://api.iterable.com");
  });
});
