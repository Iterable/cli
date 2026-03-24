#!/usr/bin/env node

import { IterableClient } from "@iterable/api";
import { z } from "zod";

import { loadCliConfig } from "./config.js";
import { CliError, UsageError } from "./errors.js";
import { formatOutput, getDefaultFormat } from "./output.js";
import { buildParser, parseCommand } from "./parser.js";
import {
  findCommand,
  parseArgs,
  showCategoryHelp,
  showGlobalHelp,
  showVersion,
} from "./router.js";
import { COMMAND_NAME } from "./utils/command-info.js";

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.globalFlags.version) {
    showVersion();
    return;
  }

  if (!parsed.category || (parsed.globalFlags.help && !parsed.action)) {
    if (parsed.category) {
      showCategoryHelp(parsed.category);
    } else {
      await showGlobalHelp();
    }
    return;
  }

  if (parsed.category === "keys") {
    const { handleKeysCommand } = await import("./keys-cli.js");
    await handleKeysCommand(
      parsed.action ? [parsed.action, ...parsed.rest] : []
    );
    return;
  }

  if (!parsed.action) {
    showCategoryHelp(parsed.category);
    return;
  }

  const command = findCommand(parsed.category, parsed.action);
  if (!command) {
    throw new UsageError(
      `Unknown command: ${parsed.category} ${parsed.action}\nRun '${COMMAND_NAME} ${parsed.category} --help' to see available commands.`
    );
  }

  if (parsed.globalFlags.help) {
    const built = buildParser(
      command.schema,
      `iterable ${parsed.category} ${parsed.action}`,
      command.positionalArgs,
      command.cliTransforms
    );
    try {
      built.showHelp();
    } catch {
      // zod-opts calls process.exit on --help
    }
    return;
  }

  const config = await loadCliConfig();
  const client = new IterableClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  try {
    const params = await parseCommand(
      command.schema,
      `iterable ${parsed.category} ${parsed.action}`,
      parsed.rest,
      command.positionalArgs,
      command.cliTransforms
    );

    const result = await command.execute(client, params);

    const format = parsed.globalFlags.output ?? getDefaultFormat();
    console.log(formatOutput(result, format, parsed.globalFlags.columns)); // eslint-disable-line no-console
  } finally {
    client.destroy();
  }
}

main().catch(async (error: unknown) => {
  const {
    IterableApiError,
    IterableNetworkError,
    IterableRawError,
    IterableResponseValidationError,
  } = await import("@iterable/api");

  /* eslint-disable no-console */
  if (error instanceof CliError) {
    console.error(error.message);
    process.exit(error.exitCode);
  }

  if (error instanceof z.ZodError) {
    const details = error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    console.error(`Validation error: ${details}`);
    process.exit(2);
  }

  if (error instanceof IterableApiError) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
    if (error.endpoint) console.error(`  Endpoint: ${error.endpoint}`);
    if (error.statusCode === 401) {
      console.error(
        `  Run '${COMMAND_NAME} keys add' to configure your API key`
      );
    }
    process.exit(1);
  }

  if (error instanceof IterableRawError) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
    if (error.endpoint) console.error(`  Endpoint: ${error.endpoint}`);
    process.exit(1);
  }

  if (error instanceof IterableResponseValidationError) {
    console.error(
      `Response validation error (${error.statusCode}): ${error.message}`
    );
    if (error.endpoint) console.error(`  Endpoint: ${error.endpoint}`);
    process.exit(1);
  }

  if (error instanceof IterableNetworkError) {
    console.error(`Network error: ${error.message}`);
    process.exit(1);
  }
  /* eslint-enable no-console */

  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${msg}`); // eslint-disable-line no-console
  process.exit(1);
});
