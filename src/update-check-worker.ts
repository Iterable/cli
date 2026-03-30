#!/usr/bin/env node

/**
 * Detached background worker that fetches the latest package version from the
 * npm registry and writes it to the update cache.  Spawned by checkForUpdate()
 * so the main CLI process can exit immediately.
 *
 * Uses only Node built-ins (fetch + fs) — no node_modules imports.
 *
 * Arguments: <registryUrl> <cachePath> <timeoutMs>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [registryUrl, cachePath, timeoutStr] = process.argv.slice(2);
if (!registryUrl || !cachePath) process.exit(1);

try {
  const resp = await fetch(registryUrl, {
    signal: AbortSignal.timeout(Number(timeoutStr) || 5_000),
  });
  if (!resp.ok) process.exit();

  const data = (await resp.json()) as Record<string, unknown>;
  const version = data.version;
  if (typeof version !== "string") process.exit();

  mkdirSync(dirname(cachePath), { recursive: true, mode: 0o700 });
  writeFileSync(
    cachePath,
    JSON.stringify({ latest: version, checkedAt: Date.now() }),
    { mode: 0o600 }
  );
} catch {
  // Silent failure — a missed cache write just delays the notification
}
