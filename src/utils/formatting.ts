/** Platform-specific storage description for tips/help text. */
export function getKeyStorageMessage(): string {
  return "Keys are encrypted at rest using platform-specific security (Keychain on macOS, DPAPI on Windows)";
}
