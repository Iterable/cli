import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import * as crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  KeyManager as KeyManagerClass,
  type SecurityExecutor,
} from "../../src/key-manager";

let mockRandomUUID: jest.SpiedFunction<typeof crypto.randomUUID>;
let uuidCounter: number;

describe("KeyManager", () => {
  let tempDir: string;
  let keyManager: KeyManagerClass;
  let mockExecSecurity: jest.MockedFunction<SecurityExecutor>;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";

    uuidCounter = 0;
    mockRandomUUID = jest.spyOn(crypto, "randomUUID");
    mockRandomUUID.mockImplementation(() => {
      uuidCounter++;
      const padded = String(uuidCounter).padStart(12, "0");
      return `00000000-0000-0000-0000-${padded}`;
    });

    mockExecSecurity = jest.fn(
      async (_args: string[]) => ""
    ) as unknown as jest.MockedFunction<SecurityExecutor>;
    mockExecSecurity.mockResolvedValue("");

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "keymanager-cli-test-"));
    keyManager = new KeyManagerClass(tempDir, mockExecSecurity);
  });

  afterEach(async () => {
    mockRandomUUID.mockRestore();
    await fs.rm(tempDir, { recursive: true, force: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  // ── Initialization ──────────────────────────────────────────────────

  describe("initialize", () => {
    it("should create config directory if it doesn't exist", async () => {
      const nestedDir = path.join(tempDir, "nested", "dir");
      const km = new KeyManagerClass(nestedDir, mockExecSecurity);
      await km.initialize();

      const stats = await fs.stat(nestedDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create empty metadata file on first init", async () => {
      await keyManager.initialize();

      const metadataPath = path.join(tempDir, "keys.json");
      const raw = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(raw) as { keys: unknown[]; version: number };

      expect(metadata).toEqual({ keys: [], version: 1 });
    });

    it("should load existing metadata file", async () => {
      const metadataPath = path.join(tempDir, "keys.json");
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          keys: [
            {
              id: "existing-id",
              name: "existing-key",
              baseUrl: "https://api.iterable.com",
              created: "2024-01-01T00:00:00.000Z",
              isActive: true,
            },
          ],
          version: 1,
        })
      );

      await keyManager.initialize();
      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]?.name).toBe("existing-key");
    });

    it("should handle missing config dir gracefully", async () => {
      const missingDir = path.join(tempDir, "does-not-exist");
      const km = new KeyManagerClass(missingDir, mockExecSecurity);
      await km.initialize();

      const stats = await fs.stat(missingDir);
      expect(stats.isDirectory()).toBe(true);

      const keys = await km.listKeys();
      expect(keys).toEqual([]);
    });
  });

  // ── Add key ─────────────────────────────────────────────────────────

  describe("addKey", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should add a valid key and store in keychain", async () => {
      const id = await keyManager.addKey(
        "production",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      expect(mockExecSecurity).toHaveBeenCalledWith([
        "add-generic-password",
        "-a",
        id,
        "-s",
        "iterable-cli",
        "-w",
        "a".repeat(32),
        "-U",
      ]);

      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatchObject({
        id,
        name: "production",
        baseUrl: "https://api.iterable.com",
        isActive: true,
      });
    });

    it("should validate API key format (32-char hex)", async () => {
      await expect(
        keyManager.addKey("test", "short", "https://api.iterable.com")
      ).rejects.toThrow(
        "API key must be a 32-character lowercase hexadecimal string"
      );
    });

    it("should reject uppercase hex in API key", async () => {
      await expect(
        keyManager.addKey("test", "A".repeat(32), "https://api.iterable.com")
      ).rejects.toThrow(
        "API key must be a 32-character lowercase hexadecimal string"
      );
    });

    it("should validate base URL is HTTPS", async () => {
      await expect(
        keyManager.addKey("test", "a".repeat(32), "http://api.iterable.com")
      ).rejects.toThrow("Base URL must use HTTPS protocol for security");
    });

    it("should reject invalid URL format", async () => {
      await expect(
        keyManager.addKey("test", "a".repeat(32), "not-a-url")
      ).rejects.toThrow("Invalid base URL format");
    });

    it("should accept localhost URLs for development", async () => {
      const id = await keyManager.addKey(
        "dev",
        "a".repeat(32),
        "http://localhost:8080"
      );

      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should handle keychain storage failure", async () => {
      mockExecSecurity.mockRejectedValueOnce(new Error("Keychain error"));

      await expect(
        keyManager.addKey("test", "a".repeat(32), "https://api.iterable.com")
      ).rejects.toThrow("Failed to store key in macOS Keychain");
    });
  });

  // ── List keys ───────────────────────────────────────────────────────

  describe("listKeys", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should return empty array when no keys exist", async () => {
      const keys = await keyManager.listKeys();
      expect(keys).toEqual([]);
    });

    it("should return all keys", async () => {
      await keyManager.addKey(
        "key1",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      await keyManager.addKey(
        "key2",
        "b".repeat(32),
        "https://api.eu.iterable.com"
      );

      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(2);
      expect(keys[0]?.name).toBe("key1");
      expect(keys[1]?.name).toBe("key2");
    });

    it("should return copies (not mutable references)", async () => {
      await keyManager.addKey(
        "test",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const keys1 = await keyManager.listKeys();
      const keys2 = await keyManager.listKeys();
      expect(keys1).not.toBe(keys2);
    });
  });

  // ── Get key ─────────────────────────────────────────────────────────

  describe("getKey", () => {
    let testKeyId: string;

    beforeEach(async () => {
      await keyManager.initialize();
      testKeyId = await keyManager.addKey(
        "test-key",
        "a".repeat(32),
        "https://api.iterable.com"
      );
    });

    it("should retrieve key by ID", async () => {
      mockExecSecurity.mockResolvedValueOnce("a".repeat(32));

      const apiKey = await keyManager.getKey(testKeyId);
      expect(apiKey).toBe("a".repeat(32));

      expect(mockExecSecurity).toHaveBeenCalledWith([
        "find-generic-password",
        "-a",
        testKeyId,
        "-s",
        "iterable-cli",
        "-w",
      ]);
    });

    it("should retrieve key by name", async () => {
      mockExecSecurity.mockResolvedValueOnce("a".repeat(32));

      const apiKey = await keyManager.getKey("test-key");
      expect(apiKey).toBe("a".repeat(32));
    });

    it("should return null for nonexistent key", async () => {
      const apiKey = await keyManager.getKey("does-not-exist");
      expect(apiKey).toBeNull();
    });

    it("should throw on keychain retrieval failure", async () => {
      mockExecSecurity.mockRejectedValueOnce(new Error("Keychain locked"));

      await expect(keyManager.getKey(testKeyId)).rejects.toThrow(
        "Failed to retrieve key from macOS Keychain"
      );
    });
  });

  // ── Active key ──────────────────────────────────────────────────────

  describe("active key", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should auto-activate the first key added", async () => {
      await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const keys = await keyManager.listKeys();
      expect(keys[0]?.isActive).toBe(true);
    });

    it("should not auto-activate second key", async () => {
      await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      await keyManager.addKey(
        "second",
        "b".repeat(32),
        "https://api.eu.iterable.com"
      );

      const keys = await keyManager.listKeys();
      expect(keys[0]?.isActive).toBe(true);
      expect(keys[1]?.isActive).toBe(false);
    });

    it("setActiveKey should switch the active key by name", async () => {
      await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      await keyManager.addKey(
        "second",
        "b".repeat(32),
        "https://api.eu.iterable.com"
      );

      await keyManager.setActiveKey("second");

      const keys = await keyManager.listKeys();
      expect(keys[0]?.isActive).toBe(false);
      expect(keys[1]?.isActive).toBe(true);
    });

    it("setActiveKey should switch the active key by ID", async () => {
      await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      const secondId = await keyManager.addKey(
        "second",
        "b".repeat(32),
        "https://api.eu.iterable.com"
      );

      await keyManager.setActiveKey(secondId);

      const keys = await keyManager.listKeys();
      expect(keys[0]?.isActive).toBe(false);
      expect(keys[1]?.isActive).toBe(true);
    });

    it("getActiveKey should return the correct key value", async () => {
      await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      mockExecSecurity.mockResolvedValueOnce("a".repeat(32));
      const active = await keyManager.getActiveKey();
      expect(active).toBe("a".repeat(32));
    });

    it("getActiveKey should return null when no keys exist", async () => {
      const active = await keyManager.getActiveKey();
      expect(active).toBeNull();
    });

    it("getActiveKeyMetadata should return null when no keys exist", async () => {
      const metadata = await keyManager.getActiveKeyMetadata();
      expect(metadata).toBeNull();
    });

    it("getActiveKeyMetadata should return the active key", async () => {
      await keyManager.addKey(
        "prod",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const metadata = await keyManager.getActiveKeyMetadata();
      expect(metadata).toMatchObject({
        name: "prod",
        baseUrl: "https://api.iterable.com",
        isActive: true,
      });
    });

    it("setActiveKey should throw for nonexistent key", async () => {
      await expect(keyManager.setActiveKey("ghost")).rejects.toThrow(
        "Key not found"
      );
    });

    it("setActiveKey deactivates all other keys", async () => {
      await keyManager.addKey("k1", "a".repeat(32), "https://api.iterable.com");
      await keyManager.addKey("k2", "b".repeat(32), "https://api.iterable.com");
      await keyManager.addKey("k3", "c".repeat(32), "https://api.iterable.com");

      await keyManager.setActiveKey("k3");

      const keys = await keyManager.listKeys();
      const activeKeys = keys.filter((k) => k.isActive);
      expect(activeKeys).toHaveLength(1);
      expect(activeKeys[0]?.name).toBe("k3");
    });
  });

  // ── Delete key ──────────────────────────────────────────────────────

  describe("deleteKey", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should remove a non-active key", async () => {
      const firstId = await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      const secondId = await keyManager.addKey(
        "second",
        "b".repeat(32),
        "https://api.eu.iterable.com"
      );
      await keyManager.setActiveKey(secondId);

      await keyManager.deleteKey(firstId);

      expect(mockExecSecurity).toHaveBeenCalledWith([
        "delete-generic-password",
        "-a",
        firstId,
        "-s",
        "iterable-cli",
      ]);

      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]?.name).toBe("second");
    });

    it("should allow deleting the active key", async () => {
      const id = await keyManager.addKey(
        "only-key",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      await keyManager.deleteKey(id);
      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(0);
    });

    it("should throw for nonexistent key ID", async () => {
      await expect(keyManager.deleteKey("no-such-id")).rejects.toThrow(
        "Key not found with ID"
      );
    });

    it("should continue if keychain deletion fails", async () => {
      const firstId = await keyManager.addKey(
        "first",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      const secondId = await keyManager.addKey(
        "second",
        "b".repeat(32),
        "https://api.iterable.com"
      );
      await keyManager.setActiveKey(secondId);

      mockExecSecurity.mockRejectedValueOnce(new Error("Keychain failure"));

      await keyManager.deleteKey(firstId);

      const keys = await keyManager.listKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]?.name).toBe("second");
    });
  });

  // ── Duplicate detection ─────────────────────────────────────────────

  describe("duplicate detection", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should reject duplicate names", async () => {
      await keyManager.addKey(
        "production",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      await expect(
        keyManager.addKey(
          "production",
          "b".repeat(32),
          "https://api.iterable.com"
        )
      ).rejects.toThrow('Key with name "production" already exists');
    });

    it("findKeyByValue should find an existing key", async () => {
      const apiKeyValue = "a".repeat(32);
      mockExecSecurity.mockResolvedValue(apiKeyValue);

      await keyManager.addKey("prod", apiKeyValue, "https://api.iterable.com");

      const found = await keyManager.findKeyByValue(apiKeyValue);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("prod");
    });

    it("findKeyByValue should return null for unknown value", async () => {
      mockExecSecurity.mockResolvedValue("a".repeat(32));

      await keyManager.addKey(
        "prod",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const found = await keyManager.findKeyByValue("f".repeat(32));
      expect(found).toBeNull();
    });
  });

  // ── Update key ──────────────────────────────────────────────────────

  describe("updateKey", () => {
    let testKeyId: string;

    beforeEach(async () => {
      await keyManager.initialize();
      testKeyId = await keyManager.addKey(
        "original",
        "a".repeat(32),
        "https://api.iterable.com"
      );
    });

    it("should change the name", async () => {
      await keyManager.updateKey(
        testKeyId,
        "renamed",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(testKeyId);
      expect(meta?.name).toBe("renamed");
    });

    it("should change the base URL", async () => {
      await keyManager.updateKey(
        testKeyId,
        "original",
        "a".repeat(32),
        "https://api.eu.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(testKeyId);
      expect(meta?.baseUrl).toBe("https://api.eu.iterable.com");
    });

    it("should change the API key value", async () => {
      const newKey = "b".repeat(32);
      await keyManager.updateKey(
        testKeyId,
        "original",
        newKey,
        "https://api.iterable.com"
      );

      expect(mockExecSecurity).toHaveBeenCalledWith(
        expect.arrayContaining(["add-generic-password", "-w", newKey])
      );
    });

    it("should set the updated timestamp", async () => {
      await keyManager.updateKey(
        testKeyId,
        "original",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(testKeyId);
      expect(meta?.updated).toBeDefined();
    });

    it("should find key by name for update", async () => {
      await keyManager.updateKey(
        "original",
        "renamed",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(testKeyId);
      expect(meta?.name).toBe("renamed");
    });

    it("should reject name conflict with another key", async () => {
      await keyManager.addKey(
        "other",
        "b".repeat(32),
        "https://api.iterable.com"
      );

      await expect(
        keyManager.updateKey(
          testKeyId,
          "other",
          "a".repeat(32),
          "https://api.iterable.com"
        )
      ).rejects.toThrow('Key with name "other" already exists');
    });

    it("should throw for nonexistent key", async () => {
      await expect(
        keyManager.updateKey(
          "ghost",
          "new-name",
          "a".repeat(32),
          "https://api.iterable.com"
        )
      ).rejects.toThrow("Key not found: ghost");
    });

    it("should allow keeping the same name", async () => {
      await keyManager.updateKey(
        testKeyId,
        "original",
        "b".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(testKeyId);
      expect(meta?.name).toBe("original");
    });
  });

  // ── Validation errors ───────────────────────────────────────────────

  describe("validation errors", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should reject empty API key", async () => {
      await expect(
        keyManager.addKey("test", "", "https://api.iterable.com")
      ).rejects.toThrow("API key is required");
    });

    it("should reject non-hex API key", async () => {
      await expect(
        keyManager.addKey(
          "test",
          "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
          "https://api.iterable.com"
        )
      ).rejects.toThrow(
        "API key must be a 32-character lowercase hexadecimal string"
      );
    });

    it("should reject API key with wrong length", async () => {
      await expect(
        keyManager.addKey("test", "abcdef", "https://api.iterable.com")
      ).rejects.toThrow(
        "API key must be a 32-character lowercase hexadecimal string"
      );
    });

    it("should reject non-HTTPS URL for non-localhost", async () => {
      await expect(
        keyManager.addKey("test", "a".repeat(32), "http://api.iterable.com")
      ).rejects.toThrow("Base URL must use HTTPS protocol for security");
    });

    it("should reject empty key name", async () => {
      await expect(
        keyManager.addKey("", "a".repeat(32), "https://api.iterable.com")
      ).rejects.toThrow("Key name is required");
    });

    it("should reject whitespace-only key name", async () => {
      await expect(
        keyManager.addKey("   ", "a".repeat(32), "https://api.iterable.com")
      ).rejects.toThrow("Key name is required");
    });

    it("should accept http://localhost", async () => {
      const id = await keyManager.addKey(
        "local",
        "a".repeat(32),
        "http://localhost:3000"
      );
      expect(id).toBeDefined();
    });

    it("should accept http://127.0.0.1", async () => {
      const id = await keyManager.addKey(
        "local",
        "a".repeat(32),
        "http://127.0.0.1:3000"
      );
      expect(id).toBeDefined();
    });
  });

  // ── hasKeys ─────────────────────────────────────────────────────────

  describe("hasKeys", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should return false when no keys exist", async () => {
      expect(await keyManager.hasKeys()).toBe(false);
    });

    it("should return true when keys exist", async () => {
      await keyManager.addKey(
        "test",
        "a".repeat(32),
        "https://api.iterable.com"
      );
      expect(await keyManager.hasKeys()).toBe(true);
    });
  });

  // ── getKeyMetadata ──────────────────────────────────────────────────

  describe("getKeyMetadata", () => {
    beforeEach(async () => {
      await keyManager.initialize();
    });

    it("should return metadata by ID", async () => {
      const id = await keyManager.addKey(
        "test",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata(id);
      expect(meta?.name).toBe("test");
      expect(meta?.id).toBe(id);
    });

    it("should return metadata by name", async () => {
      await keyManager.addKey(
        "test",
        "a".repeat(32),
        "https://api.iterable.com"
      );

      const meta = await keyManager.getKeyMetadata("test");
      expect(meta?.name).toBe("test");
    });

    it("should return null for nonexistent key", async () => {
      const meta = await keyManager.getKeyMetadata("ghost");
      expect(meta).toBeNull();
    });
  });
});
