/* eslint-disable no-console */
import {
  findCommand,
  getCategories,
  getCommandsByCategory,
} from "./commands/registry.js";
import { UsageError } from "./errors.js";
import { OUTPUT_FORMATS, type OutputFormat } from "./output.js";
import { isTestEnv } from "./utils/cli-env.js";
import {
  COMMAND_NAME,
  KEYS_COMMAND_TABLE,
  PACKAGE_VERSION,
} from "./utils/command-info.js";
import { theme } from "./utils/theme.js";

export interface GlobalFlags {
  help: boolean;
  version: boolean;
  force: boolean;
  output?: OutputFormat;
  columns?: string[];
  file?: string;
}

export interface ParsedArgs {
  category: string | null;
  action: string | null;
  rest: string[];
  globalFlags: GlobalFlags;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const globalFlags: GlobalFlags = {
    help: false,
    version: false,
    force: false,
  };
  const remaining: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") {
      globalFlags.help = true;
    } else if (arg === "--version" || arg === "-V") {
      globalFlags.version = true;
    } else if (arg === "--output" && i + 1 < argv.length) {
      i++;
      const value = argv[i] ?? "";
      if (value.startsWith("-")) {
        console.error("--output requires a value (json, pretty, or table)");
        process.exit(2);
      }
      if (!(OUTPUT_FORMATS as readonly string[]).includes(value)) {
        console.error(
          `Invalid output format: ${value}. Use: ${OUTPUT_FORMATS.join(", ")}`
        );
        process.exit(2);
      }
      globalFlags.output = value as OutputFormat;
    } else if (arg === "--force" || arg === "-f") {
      globalFlags.force = true;
    } else if (arg === "--file" && i + 1 < argv.length) {
      i++;
      const value = argv[i] ?? "";
      if (value.startsWith("-")) {
        console.error("--file requires a file path");
        process.exit(2);
      }
      globalFlags.file = value;
    } else if (arg === "--columns" && i + 1 < argv.length) {
      i++;
      const value = argv[i] ?? "";
      if (value.startsWith("-")) {
        console.error(
          "--columns requires a value (comma-separated column names)"
        );
        process.exit(2);
      }
      globalFlags.columns = value.split(",").map((s) => s.trim());
    } else {
      remaining.push(arg);
    }
  }

  const category = remaining[0] ?? null;
  const action = remaining[1] ?? null;
  const rest = remaining.slice(2);

  return { category, action, rest, globalFlags };
}

function getVersion(): string {
  return PACKAGE_VERSION;
}

export function showVersion(): void {
  console.log(`${COMMAND_NAME} ${getVersion()}`);
}

interface KeyInfo {
  status: "env" | "keymanager" | "inactive" | "none";
  name?: string | undefined;
  endpoint?: string | undefined;
}

async function getKeyInfo(): Promise<KeyInfo> {
  if (process.env.ITERABLE_API_KEY) return { status: "env" };
  if (isTestEnv()) return { status: "none" };
  try {
    const { getKeyManager } = await import("./key-manager.js");
    const km = getKeyManager();
    await km.initialize();
    if (!(await km.hasKeys())) return { status: "none" };
    if (!(await km.hasActiveKey())) return { status: "inactive" };
    const meta = await km.getActiveKeyMetadata();
    return {
      status: "keymanager",
      name: meta?.name,
      endpoint: meta?.baseUrl.replace("https://", ""),
    };
  } catch {
    return { status: "none" };
  }
}

export async function showGlobalHelp(): Promise<void> {
  const version = getVersion();
  const categories = getCategories();
  const keyInfo = await getKeyInfo();

  const lines = [
    "",
    theme.bold(`${COMMAND_NAME} v${version}`) +
      " - Command-line interface for the Iterable API",
  ];

  switch (keyInfo.status) {
    case "env":
      lines.push(
        theme.muted(
          "  Using API key from ITERABLE_API_KEY environment variable"
        )
      );
      break;
    case "keymanager":
      lines.push(
        theme.muted(
          `  Using key "${keyInfo.name}"` +
            (keyInfo.endpoint ? ` (${keyInfo.endpoint})` : "")
        )
      );
      break;
    case "inactive":
      lines.push(
        theme.key("  No active API key.") +
          theme.muted(
            ` Run ${theme.accent(`${COMMAND_NAME} keys activate <name>`)} to activate one.`
          )
      );
      break;
    case "none":
      lines.push(
        theme.key("  No API key configured.") +
          theme.muted(
            ` Run ${theme.accent(`${COMMAND_NAME} keys add`)} to add one.`
          )
      );
      break;
  }

  lines.push(
    "",
    theme.bold("USAGE"),
    `  ${COMMAND_NAME} <category> <command> [options]`,
    "",
    theme.muted(
      `Run '${COMMAND_NAME} <category> --help' to see commands in a category.`
    ),
    "",
    theme.bold("CATEGORIES")
  );

  for (const cat of categories) {
    const cmds = getCommandsByCategory(cat);
    lines.push(
      `  ${theme.accent(cat.padEnd(16))} ${theme.muted(`${cmds.length} commands`)}`
    );
  }

  lines.push(
    "",
    theme.bold("GLOBAL OPTIONS"),
    `  ${theme.accent("--help, -h")}        Show help`,
    `  ${theme.accent("--version, -V")}     Show version`,
    `  ${theme.accent("--output")} <fmt>    Output format: ${OUTPUT_FORMATS.join(", ")} (default: pretty)`,
    `  ${theme.accent("--columns")} <cols>  Columns to show in table output (comma-separated)`,
    `  ${theme.accent("--json")} <data>     Pass raw JSON — bypasses all other flags (use '-' for stdin)`,
    `  ${theme.accent("--file")} <path>    Read JSON input from a file`,
    `  ${theme.accent("--force, -f")}      Skip confirmation prompts for destructive commands`,
    "",
    theme.bold("KEY MANAGEMENT")
  );

  for (const [cmd, desc] of KEYS_COMMAND_TABLE) {
    lines.push(`  ${theme.accent(cmd.padEnd(45))} ${theme.muted(desc)}`);
  }

  lines.push("");

  console.log(lines.join("\n"));
}

export function showCategoryHelp(category: string): void {
  const commands = getCommandsByCategory(category);
  if (commands.length === 0) {
    throw new UsageError(`Unknown category: ${category}`);
  }

  const lines = [
    "",
    theme.bold(`${COMMAND_NAME} ${category}`) + " - Available commands",
    "",
  ];

  const maxNameLen = Math.max(...commands.map((c) => c.name.length));
  for (const cmd of commands) {
    const alias = cmd.isAlias ? theme.muted(" (alias)") : "";
    lines.push(
      `  ${theme.accent(cmd.name.padEnd(maxNameLen + 2))} ${cmd.description}${alias}`
    );
  }

  lines.push(
    "",
    theme.muted(
      `Run '${COMMAND_NAME} ${category} <command> --help' for command details.`
    ),
    ""
  );

  console.log(lines.join("\n"));
}

export { findCommand };
