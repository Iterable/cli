#!/usr/bin/env node

import { IterableClient } from "@iterable/api";
import { readFileSync } from "fs";
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

const CLI_PAGINATION_DEFAULTS: Record<string, number> = {
  page: 1,
  pageSize: 10,
};

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
  const debug =
    process.env.ITERABLE_DEBUG === "true" ||
    process.env.ITERABLE_DEBUG_VERBOSE === "true";
  const client = new IterableClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    debug,
    debugVerbose: process.env.ITERABLE_DEBUG_VERBOSE === "true",
  });

  try {
    let restArgs = parsed.rest;
    if (parsed.globalFlags.file) {
      const content = readFileSync(parsed.globalFlags.file, "utf-8").trim();
      restArgs = ["--json", content];
    }

    const params = await parseCommand(
      command.schema,
      `iterable ${parsed.category} ${parsed.action}`,
      restArgs,
      command.positionalArgs,
      command.cliTransforms
    );

    const schemaKeys =
      command.schema instanceof z.ZodObject
        ? new Set(Object.keys(command.schema.shape))
        : new Set<string>();
    for (const [key, defaultVal] of Object.entries(CLI_PAGINATION_DEFAULTS)) {
      if (schemaKeys.has(key)) {
        params[key] ??= defaultVal;
      }
    }

    if (
      command.destructive &&
      !parsed.globalFlags.force &&
      process.stdin.isTTY
    ) {
      const { default: inquirer } = await import("inquirer");
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `This will run a destructive operation (${parsed.category} ${parsed.action}). Continue?`,
          default: false,
        },
      ]);
      if (!confirm) {
        console.error("Aborted."); // eslint-disable-line no-console
        process.exit(0);
      }
    }

    const result = await command.execute(client, params);

    const format =
      parsed.globalFlags.output ??
      (parsed.globalFlags.columns ? "table" : getDefaultFormat());
    console.log(
      formatOutput(result, format, parsed.globalFlags.columns, params)
    ); // eslint-disable-line no-console
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
