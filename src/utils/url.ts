/**
 * URL-related helpers
 */

/**
 * Return true if the hostname is a localhost variant.
 * Accepts IPv4/IPv6 loopback and "localhost".
 */
export function isLocalhostHost(hostname: string): boolean {
  if (!hostname) return false;
  const lower = hostname.toLowerCase();
  return lower === "localhost" || lower === "127.0.0.1" || lower === "::1";
}

/**
 * True if URL uses https, or is localhost over http(s).
 */
export function isHttpsOrLocalhost(url: URL): boolean {
  return url.protocol === "https:" || isLocalhostHost(url.hostname);
}
