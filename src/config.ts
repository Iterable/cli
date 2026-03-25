import { IterableClient, logger } from "@iterable/api";

import { CliError } from "./errors.js";
import { getKeyManager } from "./key-manager.js";
import { isTestEnv } from "./utils/cli-env.js";
import { COMMAND_NAME, PACKAGE_VERSION } from "./utils/command-info.js";
import { sanitizeString } from "./utils/sanitize.js";

export interface CliConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
}

export function createClient(config: CliConfig): IterableClient {
  const debug =
    process.env.ITERABLE_DEBUG === "true" ||
    process.env.ITERABLE_DEBUG_VERBOSE === "true";
  return new IterableClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    debug,
    debugVerbose: process.env.ITERABLE_DEBUG_VERBOSE === "true",
    customHeaders: { "User-Agent": `iterable-cli/${PACKAGE_VERSION}` },
  });
}

/**
 * Load configuration.
 *
 * Resolution order:
 * 1. --key flag (specific stored key by name or ID)
 * 2. ITERABLE_API_KEY env var (enables CI/scripting override)
 * 3. Key manager active key
 */
const DEFAULT_BASE_URL = "https://api.iterable.com";

export async function loadCliConfig(keyNameOrId?: string): Promise<CliConfig> {
  if (keyNameOrId && !isTestEnv()) {
    const keyManager = getKeyManager();
    const keys = await keyManager.listKeys();
    const keyMeta = keys.find(
      (k) => k.name === keyNameOrId || k.id === keyNameOrId
    );
    if (!keyMeta) {
      throw new CliError(
        `Key not found: "${keyNameOrId}". Run "${COMMAND_NAME} keys list" to see available keys.`,
        2
      );
    }
    const apiKey = await keyManager.getKey(keyMeta.id);
    if (!apiKey) {
      throw new CliError(
        `Failed to retrieve key "${keyNameOrId}". Try "${COMMAND_NAME} keys update ${keyNameOrId}".`,
        1
      );
    }
    return { apiKey, baseUrl: keyMeta.baseUrl };
  }

  if (process.env.ITERABLE_API_KEY) {
    return {
      apiKey: process.env.ITERABLE_API_KEY,
      baseUrl: process.env.ITERABLE_BASE_URL ?? DEFAULT_BASE_URL,
    };
  }

  if (!isTestEnv()) {
    try {
      const keyManager = getKeyManager();

      if (await keyManager.hasKeys()) {
        if (!(await keyManager.hasActiveKey())) {
          throw new CliError(
            `No active API key. Run "${COMMAND_NAME} keys activate <name>", use --key <name>, or set ITERABLE_API_KEY.`,
            2
          );
        }
        const apiKey = await keyManager.getActiveKey();
        const meta = await keyManager.getActiveKeyMetadata();
        if (apiKey && meta) {
          return { apiKey, baseUrl: meta.baseUrl };
        }
      }
    } catch (error: unknown) {
      if (error instanceof CliError) throw error;

      const sanitizedMessage = sanitizeString(
        error instanceof Error ? error.message : String(error)
      );
      logger.error("Failed to load from key manager", {
        error: sanitizedMessage,
      });
      console.error(
        // eslint-disable-line no-console
        "Warning: Failed to load API key from key storage:",
        sanitizedMessage
      );
    }
  }

  throw new CliError(
    `No API key found. Run "${COMMAND_NAME} keys add" to add one, or set ITERABLE_API_KEY.`,
    2
  );
}
