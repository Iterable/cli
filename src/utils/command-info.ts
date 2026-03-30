import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

interface PackageJson {
  name: string;
  version: string;
  bin?: Record<string, string>;
}

function loadPackageJson(): PackageJson {
  try {
    const pkgPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../..",
      "package.json"
    );
    return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
  } catch {
    return { name: "@iterable/cli", version: "0.0.0" };
  }
}

const pkg = loadPackageJson();

/** The CLI binary name from the `bin` field in package.json */
export const BIN_NAME: string = pkg.bin
  ? (Object.keys(pkg.bin)[0] ?? pkg.name)
  : pkg.name;

/** True when running via npx (ephemeral execution, no persistent install) */
export const IS_NPX: boolean = Boolean(
  process.argv[1]?.includes("npx") || process.env.npm_execpath?.includes("npx")
);

/** The command name as the user would invoke it */
export const COMMAND_NAME: string = IS_NPX ? `npx ${pkg.name}` : BIN_NAME;

/** npm package name from package.json */
export const PACKAGE_NAME: string = pkg.name;

/** Package version from package.json */
export const PACKAGE_VERSION: string = pkg.version;

/** Keys subcommand names: single source of truth for keys-cli, completion, and help. */
export const KEYS_SUBCOMMANDS = [
  "list",
  "add",
  "update",
  "activate",
  "deactivate",
  "delete",
  "validate",
] as const;

/** Keys subcommand help rows: [command, description] */
export const KEYS_COMMAND_TABLE: ReadonlyArray<readonly [string, string]> = [
  [`${COMMAND_NAME} keys list`, "View all stored API keys"],
  [`${COMMAND_NAME} keys add`, "Add a new API key"],
  [
    `${COMMAND_NAME} keys update <name-or-id>`,
    "Update an existing key's settings",
  ],
  [`${COMMAND_NAME} keys activate <name-or-id>`, "Switch to a different key"],
  [`${COMMAND_NAME} keys deactivate`, "Deactivate the current key"],
  [`${COMMAND_NAME} keys delete <name-or-id>`, "Remove a key by ID or name"],
  [`${COMMAND_NAME} keys validate`, "Test the API connection"],
] as const;
