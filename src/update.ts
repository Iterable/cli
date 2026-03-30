import { execFile } from "node:child_process";
import { promisify } from "node:util";

import boxen from "boxen";
import chalk from "chalk";
import semverGt from "semver/functions/gt.js";
// @types/update-notifier@6 targets v6 but the API surface we use is unchanged
// in v7.  No v7-aligned types exist on DefinitelyTyped as of 2026-03.
import updateNotifier from "update-notifier";

import { CliError } from "./errors.js";
import { getSpinner } from "./utils/cli-env.js";
import {
  BIN_NAME,
  COMMAND_NAME,
  IS_NPX,
  PACKAGE_NAME,
  PACKAGE_VERSION,
} from "./utils/command-info.js";

const execFileAsync = promisify(execFile);

const ONE_DAY_MS = 86_400_000;

let updateCheckDone = false;

/**
 * Check for a newer version in the background and register an on-exit
 * notification to stderr.  Fully fire-and-forget: errors are silently ignored
 * so normal CLI operation is never affected.
 *
 * The constructor creates a configstore and the background check process.
 * `check()` reads the cached result into `notifier.update` and, if the check
 * interval has elapsed, spawns a new background process for next time.
 *
 * We write to stderr (not stdout) so piped output stays clean, and we check
 * `process.stderr.isTTY` rather than stdout because notifications should
 * still appear when stdout is piped (e.g. `iterable users list | jq .`).
 *
 * CI, NO_UPDATE_NOTIFIER, and NODE_ENV=test suppression are handled
 * internally by update-notifier (notifier.config will be undefined).
 */
export function checkForUpdate(): void {
  if (updateCheckDone) return;
  updateCheckDone = true;

  try {
    if (IS_NPX) return;
    if (!process.stderr.isTTY) return;

    const notifier = updateNotifier({
      pkg: { name: PACKAGE_NAME, version: PACKAGE_VERSION },
      updateCheckInterval: ONE_DAY_MS,
    });

    notifier.check();

    if (!notifier.update) return;
    if (!semverGt(notifier.update.latest, PACKAGE_VERSION)) return;

    const message =
      `Update available: ${chalk.dim(notifier.update.current)} ${chalk.reset("→")} ${chalk.green(notifier.update.latest)}\n` +
      `Run ${chalk.cyan(`${COMMAND_NAME} update`)} to update`;

    const box = boxen(message, {
      padding: 1,
      margin: { top: 1, bottom: 0 },
      borderStyle: "round",
      borderColor: "yellow",
      textAlignment: "center",
    });

    process.on("exit", () => {
      try {
        process.stderr.write(`${box}\n`);
      } catch {
        // Best-effort; swallow write errors at exit (e.g. EPIPE)
      }
    });
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

  const resolved = resolveCommand(agent, "global", [`${PACKAGE_NAME}@latest`]);
  if (!resolved) {
    throw new CliError(
      `Could not determine install command for package manager "${agent}".`
    );
  }

  const spinner = await getSpinner();
  const cmdStr = `${resolved.command} ${resolved.args.join(" ")}`;
  spinner.start(`Upgrading ${PACKAGE_NAME} (${cmdStr})...`);

  try {
    // shell: true is required on Windows where npm/pnpm/yarn are .cmd shims
    await execFileAsync(resolved.command, resolved.args, { shell: true });

    let versionLine = "Upgrade complete";
    try {
      const { stdout } = await execFileAsync(BIN_NAME, ["--version"], {
        shell: true,
      });
      versionLine = `Upgraded to ${stdout.trim()}`;
    } catch {
      // Binary may not be on PATH yet; that's fine
    }
    spinner.succeed(versionLine);
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
