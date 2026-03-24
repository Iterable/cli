import { logger } from "@iterable/api";

import { CliError } from "./errors.js";
import { getKeyManager } from "./key-manager.js";
import { isTestEnv } from "./utils/cli-env.js";
import { COMMAND_NAME } from "./utils/command-info.js";
import { sanitizeString } from "./utils/sanitize.js";

export interface CliConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
}

/**
 * Load configuration.
 *
 * Resolution order:
 * 1. ITERABLE_API_KEY env var (if set, use directly -- enables CI/scripting override)
 * 2. Key manager active key
 * 3. Error with guidance
 */
export async function loadCliConfig(): Promise<CliConfig> {
  const baseUrlFromEnv =
    process.env.ITERABLE_BASE_URL ?? "https://api.iterable.com";

  if (process.env.ITERABLE_API_KEY) {
    return { apiKey: process.env.ITERABLE_API_KEY, baseUrl: baseUrlFromEnv };
  }

  if (!isTestEnv()) {
    try {
      const keyManager = getKeyManager();
      await keyManager.initialize();

      if (await keyManager.hasKeys()) {
        if (!(await keyManager.hasActiveKey())) {
          throw new CliError(
            `No active API key. Run "${COMMAND_NAME} keys activate <name>" to activate one, or set ITERABLE_API_KEY environment variable.`,
            2
          );
        }
        const apiKey = await keyManager.getActiveKey();
        if (apiKey) {
          let baseUrl = baseUrlFromEnv;
          const meta = await keyManager.getActiveKeyMetadata();
          if (meta?.baseUrl) {
            baseUrl = meta.baseUrl;
          }
          return { apiKey, baseUrl };
        }
      }
    } catch (error: unknown) {
      if (error instanceof CliError) throw error;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("Key store not initialized") ||
        errorMessage.includes("No API key found")
      ) {
        logger.debug("No keys in key manager, falling back to error");
      } else {
        const sanitizedMessage = sanitizeString(errorMessage);
        logger.error("Unexpected error loading from key manager", {
          error: sanitizedMessage,
        });
        console.error(
          // eslint-disable-line no-console
          "Warning: Failed to load API key from key storage:",
          sanitizedMessage
        );
      }
    }
  }

  throw new CliError(
    `No API key found. Run "${COMMAND_NAME} keys add" to add one, or set ITERABLE_API_KEY environment variable.`,
    2
  );
}
