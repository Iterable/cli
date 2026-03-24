import { execFile } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const CLI_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../dist/index.js"
);

export const TEST_ENV = {
  ...process.env,
  NODE_ENV: "test",
};

export async function runCli(
  args: string[],
  env = TEST_ENV
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("node", [CLI_PATH, ...args], { env, timeout: 15000 });
}
