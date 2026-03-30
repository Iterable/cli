import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  fetchLatestVersion,
  readCache,
  type UpdateCache,
  writeCache,
} from "../../src/update";

const TEST_DIR = join(tmpdir(), `iterable-update-test-${process.pid}`);
const TEST_CACHE = join(TEST_DIR, "update-cache.json");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("readCache", () => {
  it("returns undefined when file does not exist", () => {
    expect(readCache(TEST_CACHE)).toBeUndefined();
  });

  it("returns undefined for invalid JSON", () => {
    writeFileSync(TEST_CACHE, "not json");
    expect(readCache(TEST_CACHE)).toBeUndefined();
  });

  it("reads a valid cache file", () => {
    const cache: UpdateCache = { latest: "1.0.0", checkedAt: 1000 };
    writeFileSync(TEST_CACHE, JSON.stringify(cache));
    expect(readCache(TEST_CACHE)).toEqual(cache);
  });

  it("returns undefined for valid JSON with wrong shape", () => {
    writeFileSync(TEST_CACHE, '{"unrelated": true}');
    expect(readCache(TEST_CACHE)).toBeUndefined();
  });

  it("returns undefined for partial cache (missing checkedAt)", () => {
    writeFileSync(TEST_CACHE, '{"latest": "1.0.0"}');
    expect(readCache(TEST_CACHE)).toBeUndefined();
  });
});

describe("writeCache", () => {
  it("creates the directory and writes the cache", () => {
    const nested = join(TEST_DIR, "sub", "update-cache.json");
    const cache: UpdateCache = { latest: "2.0.0", checkedAt: Date.now() };
    writeCache(cache, nested);
    const raw = JSON.parse(readFileSync(nested, "utf-8"));
    expect(raw).toEqual(cache);
  });

  it("overwrites an existing cache", () => {
    writeCache({ latest: "1.0.0", checkedAt: 1000 }, TEST_CACHE);
    writeCache({ latest: "2.0.0", checkedAt: 2000 }, TEST_CACHE);
    expect(readCache(TEST_CACHE)).toEqual({ latest: "2.0.0", checkedAt: 2000 });
  });

  it("does not throw on permission errors", () => {
    expect(() =>
      writeCache({ latest: "1.0.0", checkedAt: 1000 }, "/root/nope/cache.json")
    ).not.toThrow();
  });
});

describe("fetchLatestVersion", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns the latest version from the registry", async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "3.0.0" }),
    } as Response);

    const version = await fetchLatestVersion("@iterable/cli");
    expect(version).toBe("3.0.0");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://registry.npmjs.org/%40iterable%2Fcli/latest",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns undefined on non-ok response", async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    expect(await fetchLatestVersion("nonexistent-pkg")).toBeUndefined();
  });

  it("returns undefined on network error", async () => {
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network error"));

    expect(await fetchLatestVersion("@iterable/cli")).toBeUndefined();
  });

  it("returns undefined when response has no version field", async () => {
    globalThis.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({ name: "@iterable/cli" }),
    } as Response);

    expect(await fetchLatestVersion("@iterable/cli")).toBeUndefined();
  });
});
