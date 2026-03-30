import { execFile, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import boxen from "boxen";
import chalk from "chalk";
import semverGt from "semver/functions/gt.js";
import semverValid from "semver/functions/valid.js";
import { z } from "zod";

import { CliError } from "./errors.js";
import { getSpinner } from "./utils/cli-env.js";
import {
  COMMAND_NAME,
  IS_NPX,
  PACKAGE_NAME,
  PACKAGE_VERSION,
} from "./utils/command-info.js";

const execFileAsync = promisify(execFile);

const envMs = Number(process.env.ITERABLE_UPDATE_INTERVAL_MS);
const UPDATE_CHECK_INTERVAL_MS = Number.isFinite(envMs) ? envMs : 86_400_000; // default: 1 day

const REGISTRY_TIMEOUT_MS = 5_000;

export const DEFAULT_CACHE_PATH = join(
  homedir(),
  ".iterable",
  "update-cache.json"
);

const UpdateCacheSchema = z.object({
  latest: z.string().refine((v) => semverValid(v) !== null),
  checkedAt: z.number(),
});

export type UpdateCache = z.infer<typeof UpdateCacheSchema>;

export function readCache(
  cachePath: string = DEFAULT_CACHE_PATH
): UpdateCache | undefined {
  try {
    const raw: unknown = JSON.parse(readFileSync(cachePath, "utf-8"));
    return UpdateCacheSchema.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeCache(
  cache: UpdateCache,
  cachePath: string = DEFAULT_CACHE_PATH
): void {
  try {
    mkdirSync(dirname(cachePath), { recursive: true, mode: 0o700 });
    writeFileSync(cachePath, JSON.stringify(cache), { mode: 0o600 });
  } catch {
    // Best-effort: a failed cache write just delays the next notification
  }
}

const RegistryResponseSchema = z.object({ version: z.string() });

export async function fetchLatestVersion(
  pkgName: string = PACKAGE_NAME
): Promise<string | undefined> {
  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}/latest`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
    });
    if (!resp.ok) return undefined;
    const data = RegistryResponseSchema.parse(await resp.json());
    return data.version;
  } catch {
    return undefined;
  }
}

function spawnBackgroundCheck(): void {
  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`;
  const workerPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "update-check-worker.js"
  );
  spawn(
    process.execPath,
    [workerPath, registryUrl, DEFAULT_CACHE_PATH, String(REGISTRY_TIMEOUT_MS)],
    { detached: true, stdio: "ignore" }
  ).unref();
}

let updateCheckDone = false;

/**
 * Show a cached update notification (if available) and fire-and-forget a
 * background refresh of the cache.
 *
 * - Errors never affect normal CLI operation.
 * - Notification goes to stderr so piped stdout stays clean.
 * - Suppressed for npx, non-TTY stderr, CI, and NO_UPDATE_NOTIFIER.
 * - The first notification appears after the check interval (default: 1 day)
 *   because the cache must be populated by a previous invocation.
 */
export function checkForUpdate(): void {
  if (updateCheckDone) return;
  updateCheckDone = true;

  try {
    if (IS_NPX) return;
    if (process.env.CI || process.env.NO_UPDATE_NOTIFIER) return;

    const cache = readCache();

    if (
      cache &&
      process.stderr.isTTY &&
      semverGt(cache.latest, PACKAGE_VERSION)
    ) {
      const message =
        `Update available: ${chalk.dim(PACKAGE_VERSION)} ${chalk.reset("→")} ${chalk.green(cache.latest)}\n` +
        `Run ${chalk.cyan(`${COMMAND_NAME} update`)} to update`;

      const box = boxen(message, {
        padding: 1,
        margin: { top: 1, bottom: 0 },
        borderStyle: "round",
        borderColor: "yellow",
        textAlignment: "center",
      });

      process.on("exit", (code) => {
        if (code !== 0) return;
        try {
          process.stderr.write(`${box}\n`);
        } catch {
          // Swallow EPIPE / write errors at exit
        }
      });
    }

    // Refresh cache in a detached child process so the CLI can exit immediately.
    // Uses only Node built-ins (fetch + fs) to avoid module resolution issues.
    if (!cache || Date.now() - cache.checkedAt >= UPDATE_CHECK_INTERVAL_MS) {
      spawnBackgroundCheck();
    }
  } catch {
    // Never let the update check interfere with normal operation
  }
}

/**
 * Self-upgrade: detect the package manager and run a global install of the
 * latest version.
 */
export async function handleUpdateCommand(): Promise<void> {
  if (IS_NPX) {
    // eslint-disable-next-line no-console
    console.error(
      chalk.yellow(
        "You're running via npx, which always fetches the latest version.\n" +
          `Run ${chalk.cyan(`npm install -g ${PACKAGE_NAME}`)} to install permanently.`
      )
    );
    return;
  }

  const { getUserAgent } = await import("package-manager-detector/detect");
  const { resolveCommand } = await import("package-manager-detector/commands");

  // npm_config_user_agent is only set when invoked through a package manager.
  // When the user runs the globally-installed binary directly, this falls back
  // to npm.  If they installed via pnpm/yarn, the upgrade may go to npm's
  // global prefix instead — the spinner shows the exact command being run so
  // the user can verify.
  const agent = getUserAgent() ?? "npm";

  const spinner = await getSpinner();
  spinner.start("Checking for latest version...");

  const latest = await fetchLatestVersion();
  if (!latest) {
    spinner.fail("Could not reach the npm registry");
    throw new CliError(
      "Failed to fetch latest version. Check your network connection."
    );
  }

  if (!semverGt(latest, PACKAGE_VERSION)) {
    spinner.succeed(`Already up to date (${PACKAGE_NAME}@${PACKAGE_VERSION})`);
    return;
  }

  const resolved = resolveCommand(agent, "global", [
    `${PACKAGE_NAME}@${latest}`,
  ]);
  if (!resolved) {
    throw new CliError(
      `Could not determine install command for package manager "${agent}".`
    );
  }

  const cmdStr = `${resolved.command} ${resolved.args.join(" ")}`;
  spinner.start(`Upgrading ${PACKAGE_NAME} to ${latest} (${cmdStr})...`);

  try {
    await execFileAsync(resolved.command, resolved.args);
    spinner.succeed(`Upgraded to ${PACKAGE_NAME}@${latest}`);
  } catch (error: unknown) {
    spinner.fail("Upgrade failed");

    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "EACCES"
    ) {
      throw new CliError(
        "Permission denied. Try running with sudo or fix your global npm prefix permissions."
      );
    }
    throw new CliError(error instanceof Error ? error.message : String(error));
  }
}
