const API_KEY_HOSTNAME_PATTERN = /^sk[-_]/i
const SUPPORTED_PROXY_PROTOCOLS = new Set(["http:", "https:"])

/**
 * Normalizes a proxy setting without ever treating an API key as a hostname.
 *
 * Proxy values commonly come from VS Code settings or environment variables,
 * where a misplaced Hooshyar key would otherwise become `http://sk-...` and
 * make every request fail with `getaddrinfo ENOTFOUND sk-...`.
 */
export function normalizeProxyUrl(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined
	}

	const trimmed = value.trim()
	if (!trimmed || API_KEY_HOSTNAME_PATTERN.test(trimmed) || /^bearer\s+/i.test(trimmed)) {
		return undefined
	}

	const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`
	try {
		const parsed = new URL(candidate)
		if (!SUPPORTED_PROXY_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
			return undefined
		}
		return parsed.toString()
	} catch {
		return undefined
	}
}
