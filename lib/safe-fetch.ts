/**
 * SSRF guard for user-supplied URLs.
 *
 * Blocks loopback, private, link-local, and cloud-metadata hosts before
 * fetch() so a malicious import/rescue URL cannot reach internal services
 * (e.g. http://intranet.corp/, http://169.254.169.254/ cloud metadata).
 *
 * Use safeFetch() anywhere the URL originates from user input or from
 * remote-fetched content (RSS/Sitemap/llms.txt link discovery).
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal', // GCP metadata server
  'metadata',                 // common alias
  'metadata.aws.internal',
]);

const CLOUD_METADATA_IP = '169.254.169.254';

export class BlockedUrlError extends Error {
  constructor(public readonly url: string, reason: string) {
    super(`Refused to fetch blocked URL (${reason}): ${url}`);
    this.name = 'BlockedUrlError';
  }
}

/**
 * Throw BlockedUrlError if `rawUrl` targets a non-public host.
 * No-op (= safe to call) for already-validated public URLs.
 */
export function assertPublicUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError(rawUrl, 'invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BlockedUrlError(rawUrl, `disallowed protocol ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new BlockedUrlError(rawUrl, 'credentials in URL');
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(host) || host === CLOUD_METADATA_IP) {
    throw new BlockedUrlError(rawUrl, 'metadata/loopback host');
  }
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new BlockedUrlError(rawUrl, 'intranet suffix');
  }

  // IPv4 literal
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    const isLoopback = a === 127;
    const isPrivate = a === 10
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
    const isLinkLocal = a === 169 && b === 254;
    const isCurrentNet = a === 0;
    const isBroadcast = a === 255;
    if (isLoopback || isPrivate || isLinkLocal || isCurrentNet || isBroadcast) {
      throw new BlockedUrlError(rawUrl, 'private/loopback/link-local IP');
    }
  }

  // IPv6 literal — loopback, unique-local (fc00::/7), link-local (fe80::/10)
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') {
    throw new BlockedUrlError(rawUrl, 'IPv6 loopback');
  }
  if (/^f[cd][0-9a-f]{2}:/.test(host)) {
    throw new BlockedUrlError(rawUrl, 'IPv6 unique-local');
  }
  if (/^fe[89ab][0-9a-f]:/.test(host)) {
    throw new BlockedUrlError(rawUrl, 'IPv6 link-local');
  }
}

/**
 * fetch() wrapper that first rejects non-public targets.
 * Signature mirrors global fetch so it is a drop-in replacement.
 */
export async function safeFetch(
  input: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<Response> {
  assertPublicUrl(input);
  return fetch(input, init);
}
