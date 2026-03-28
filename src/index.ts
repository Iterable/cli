#!/usr/bin/env node

import chalk from "chalk";
import { readFileSync } from "fs";
import { z } from "zod";

import { createClient, loadCliConfig } from "./config.js";
import { CliError, UsageError } from "./errors.js";
import { formatOutput, getDefaultFormat } from "./output.js";
import { parseCommand } from "./parser.js";
import {
  findCommand,
  parseArgs,
  showCategoryHelp,
  showCommandHelp,
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
      await showGlobalHelp(parsed.globalFlags.key);
    }
    return;
  }

  if (parsed.category === "keys") {
    const { handleKeysCommand } = await import("./keys-cli.js");
    await handleKeysCommand(
      parsed.action ? [parsed.action, ...parsed.rest] : [],
      parsed.globalFlags.key
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
      `Unknown command: ${parsed.category} ${parsed.action}`
    );
  }

  if (parsed.globalFlags.help) {
    showCommandHelp(parsed.category, command);
    return;
  }

  const config = await loadCliConfig(parsed.globalFlags.key);
  const client = createClient(config);

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

  const err = (msg: string) => console.error(chalk.red(`✖ ${msg}`)); // eslint-disable-line no-console
  const hint = (msg: string) => console.error(chalk.dim(`  ${msg}`)); // eslint-disable-line no-console

  const helpHint = (): void => {
    try {
      const { category, action } = parseArgs(process.argv.slice(2));
      if (category && action && findCommand(category, action)) {
        hint(
          `Run '${COMMAND_NAME} ${category} ${action} --help' for usage details.`
        );
        return;
      }
    } catch {
      // Fall through to generic hint
    }
    hint(`Run '${COMMAND_NAME} --help' for usage details.`);
  };

  if (error instanceof CliError) {
    err(error.message);
    helpHint();
    process.exit(error.exitCode);
  }

  if (error instanceof z.ZodError) {
    err("Validation error");
    for (const issue of error.issues) {
      hint(`${issue.path.join(".")}: ${issue.message}`);
    }
    helpHint();
    process.exit(2);
  }

  if (
    error instanceof IterableApiError ||
    error instanceof IterableRawError ||
    error instanceof IterableResponseValidationError
  ) {
    err(`${error.message} (${error.statusCode})`);
    if (error.endpoint) hint(`Endpoint: ${error.endpoint}`);
    if (error instanceof IterableApiError && error.statusCode === 401) {
      hint(`Run '${COMMAND_NAME} keys add' to configure your API key`);
    }
    process.exit(1);
  }

  if (error instanceof IterableNetworkError) {
    err(error.message);
    process.exit(1);
  }

  const msg = error instanceof Error ? error.message : String(error);
  err(msg);
  process.exit(1);
});
