import { IterableClient } from "@iterable/api";
import { describe, expect, it } from "@jest/globals";

import {
  COMMANDS_BY_CATEGORY,
  getAllCommands,
  getCategories,
} from "../../src/commands/registry";

const EXPECTED_COMMANDS = [
  "campaigns:abort",
  "campaigns:activate",
  "campaigns:archive",
  "campaigns:cancel",
  "campaigns:create-blast",
  "campaigns:create-triggered",
  "campaigns:deactivate",
  "campaigns:get",
  "campaigns:get-children",
  "campaigns:get-metrics",
  "campaigns:list",
  "campaigns:schedule",
  "campaigns:send",
  "campaigns:trigger",
  "catalogs:bulk-delete-items",
  "catalogs:create",
  "catalogs:delete",
  "catalogs:delete-item",
  "catalogs:get-field-mappings",
  "catalogs:get-item",
  "catalogs:get-items",
  "catalogs:list",
  "catalogs:partial-update-item",
  "catalogs:replace-item",
  "catalogs:update-field-mappings",
  "catalogs:update-items",
  "events:get-by-email",
  "events:get-by-userid",
  "events:track",
  "events:track-bulk",
  "experiments:get",
  "experiments:get-metrics",
  "experiments:get-variants",
  "experiments:list",
  "export:cancel",
  "export:get-files",
  "export:list-jobs",
  "export:start",
  "journeys:list",
  "journeys:trigger",
  "lists:create",
  "lists:delete",
  "lists:get-preview-users",
  "lists:get-size",
  "lists:get-users",
  "lists:list",
  "lists:subscribe",
  "lists:unsubscribe",
  "messaging:cancel-email",
  "messaging:cancel-in-app",
  "messaging:cancel-push",
  "messaging:cancel-sms",
  "messaging:cancel-web-push",
  "messaging:cancel-whatsapp",
  "messaging:get-channels",
  "messaging:get-embedded-messages",
  "messaging:get-in-app-messages",
  "messaging:get-message-types",
  "messaging:send-email",
  "messaging:send-in-app",
  "messaging:send-push",
  "messaging:send-sms",
  "messaging:send-web-push",
  "messaging:send-whatsapp",
  "snippets:create",
  "snippets:delete",
  "snippets:get",
  "snippets:list",
  "snippets:update",
  "subscriptions:bulk-update",
  "subscriptions:subscribe-by-email",
  "subscriptions:subscribe-by-userid",
  "subscriptions:unsubscribe-by-email",
  "subscriptions:unsubscribe-by-userid",
  "templates:delete",
  "templates:get-by-client-id",
  "templates:get-email",
  "templates:get-inapp",
  "templates:get-push",
  "templates:get-sms",
  "templates:list",
  "templates:preview-email",
  "templates:preview-inapp",
  "templates:proof-email",
  "templates:proof-inapp",
  "templates:proof-push",
  "templates:proof-sms",
  "templates:update-email",
  "templates:update-inapp",
  "templates:update-push",
  "templates:update-sms",
  "templates:upsert-email",
  "templates:upsert-inapp",
  "templates:upsert-push",
  "templates:upsert-sms",
  "users:bulk-update",
  "users:delete",
  "users:delete-by-email",
  "users:delete-by-userid",
  "users:get",
  "users:get-by-email",
  "users:get-by-userid",
  "users:get-fields",
  "users:get-sent-messages",
  "users:update",
  "users:update-email",
  "users:update-subscriptions",
  "webhooks:list",
  "webhooks:update",
];

const EXPECTED_CATEGORIES = [
  "campaigns",
  "catalogs",
  "events",
  "experiments",
  "export",
  "journeys",
  "lists",
  "messaging",
  "snippets",
  "subscriptions",
  "templates",
  "users",
  "webhooks",
];

describe("Command registry", () => {
  const allCommands = getAllCommands();

  describe("Expected command list", () => {
    it("has the expected set of commands", () => {
      const actual = allCommands
        .map((cmd) => `${cmd.category}:${cmd.name}`)
        .sort();
      expect(actual).toEqual(EXPECTED_COMMANDS);
    });
  });

  describe("API client coverage", () => {
    const CLIENT_METHODS_TO_SKIP = new Set([
      "constructor",
      "destroy",
      "validateResponse",
      "parseCsv",
      "parseNdjson",
      // deprecated or internally-delegated methods
      "deleteTemplates",
      "bulkDeleteTemplates",
    ]);

    it("every public IterableClient method has a CLI command", () => {
      const clientMethods = new Set<string>();
      let proto: object | null = IterableClient.prototype as object;

      while (proto && proto !== Object.prototype) {
        for (const name of Object.getOwnPropertyNames(proto)) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, name);
          if (
            descriptor &&
            typeof descriptor.value === "function" &&
            !CLIENT_METHODS_TO_SKIP.has(name)
          ) {
            clientMethods.add(name);
          }
        }
        proto = Object.getPrototypeOf(proto) as object | null;
      }

      const commandClientMethods = new Set(
        allCommands
          .filter((cmd) => !cmd.isAlias && cmd.clientMethod)
          .map((cmd) => cmd.clientMethod as string)
      );

      const uncoveredMethods = [...clientMethods]
        .filter((m) => !commandClientMethods.has(m))
        .sort();

      expect(uncoveredMethods).toEqual([]);
    });
  });

  describe("Registry structural integrity", () => {
    it("has no duplicate (category, name) pairs", () => {
      const keys = allCommands.map((cmd) => `${cmd.category}:${cmd.name}`);
      const uniqueKeys = new Set(keys);
      expect(keys).toHaveLength(uniqueKeys.size);
    });

    it("every non-alias command has description, schema, execute, and clientMethod", () => {
      const nonAliasCommands = allCommands.filter((cmd) => !cmd.isAlias);
      for (const cmd of nonAliasCommands) {
        expect(cmd.description.length).toBeGreaterThan(0);
        expect(cmd.schema).toBeDefined();
        expect(cmd.execute).toBeInstanceOf(Function);
        expect(typeof cmd.clientMethod).toBe("string");
        expect((cmd.clientMethod ?? "").length).toBeGreaterThan(0);
      }
    });

    it("every alias has isAlias=true, no clientMethod, and an execute function", () => {
      const aliases = allCommands.filter((cmd) => cmd.isAlias);
      expect(aliases.length).toBeGreaterThan(0);
      for (const cmd of aliases) {
        expect(cmd.isAlias).toBe(true);
        expect(cmd.clientMethod).toBeUndefined();
        expect(cmd.execute).toBeInstanceOf(Function);
      }
    });

    it("every category has at least one command", () => {
      for (const { category, commands } of COMMANDS_BY_CATEGORY) {
        expect(commands.length).toBeGreaterThan(0);
        for (const cmd of commands) {
          expect(cmd.category).toBe(category);
        }
      }
    });

    it("all 13 categories are present", () => {
      const categories = getCategories().sort();
      expect(categories).toHaveLength(13);
      expect(categories).toEqual(EXPECTED_CATEGORIES);
    });
  });
});
