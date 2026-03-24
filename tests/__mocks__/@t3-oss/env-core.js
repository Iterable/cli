export function createEnv(opts) {
  const env = { ...process.env };
  if (opts.runtimeEnv) {
    Object.assign(env, opts.runtimeEnv);
  }
  return env;
}
