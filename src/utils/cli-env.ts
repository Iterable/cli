export function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

interface Spinner {
  start: (msg?: string) => void;
  stop: () => void;
  succeed: (msg?: string) => void;
  fail: (msg?: string) => void;
}

export async function getSpinner(): Promise<Spinner> {
  const noop: Spinner = {
    start: () => {},
    stop: () => {},
    succeed: () => {},
    fail: () => {},
  };
  if (isTestEnv()) return noop;
  try {
    const ora = (await import("ora")).default;
    return ora();
  } catch {
    return noop;
  }
}
