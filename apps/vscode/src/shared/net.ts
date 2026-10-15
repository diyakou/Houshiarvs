/**
 * # Network Support for Cline
 *
 * ## Development Guidelines
 *
 * **Do** use `import { fetch } from '@/shared/net'` instead of global `fetch`.
 *
 * Global `fetch` will appear to work in VSCode, but proxy support will be
 * broken in JetBrains or CLI.
 *
 * If you use Axios, **do** call `getAxiosSettings()` and spread into
 * your Axios configuration:
 *
 * ```typescript
 * import { getAxiosSettings } from '@/shared/net'
 * await axios.get(url, {
 *   headers: { 'X-FOO': 'BAR' },
 *   ...getAxiosSettings()
 * })
 * ```
 *
 * **Do** remember to pass our `fetch` into your API clients:
 *
 * ```typescript
 * import OpenAI from "openai"
 * import { fetch } from "@/shared/net"
 * this.client = new OpenAI({
 *   apiKey: '...',
 *   fetch, // Use configured fetch with proxy support
 * })
 * ```
 *
 * If you neglect this step, inference won't work in JetBrains and CLI
 * through proxies.
 *
 * ## Proxy Support
 *
 * Cline uses platform-specific fetch implementations to handle proxy
 * configuration:
 * - **VSCode**: Uses global fetch (VSCode provides proxy configuration)
 * - **JetBrains, CLI**: Uses undici fetch with explicit ProxyAgent
 *
 * Proxy configuration via standard environment variables:
 * - `http_proxy` / `HTTP_PROXY` - Proxy for HTTP requests
 * - `https_proxy` / `HTTPS_PROXY` - Proxy for HTTPS requests
 * - `no_proxy` / `NO_PROXY` - Comma-separated list of hosts to bypass proxy
 *
 * Note, `http_proxy` etc. MUST specify the protocol to use for the proxy,
 * for example, `https_proxy=http://proxy.corp.example:3128`. Simply specifying
 * the proxy hostname will result in errors.
 *
 * ## Certificate Trust
 *
 * Proxies often machine-in-the-middle HTTPS connections. To make this work,
 * they generate self-signed certificates for a host, and the client is
 * configured to trust the proxy as a certificate authority.
 *
 * VSCode transparently pulls trusted certificates from the operating system
 * and configures node trust.
 *
 * JetBrains exports trusted certificates from the OS and writes them to a
 * temporary file, then configures node TLS by setting NODE_EXTRA_CA_CERTS.
 *
 * The CLI's npm wrapper (bin/cline) does the same automatically: it harvests
 * the OS trust store and points the child's NODE_EXTRA_CA_CERTS at a managed
 * bundle, because the Bun runtime does not read the OS store on its own. A
 * user-set NODE_EXTRA_CA_CERTS is merged in rather than replaced.
 *
 * ## Limitations in JetBrains & CLI
 *
 * - Proxy settings are static at startup--restart required for changes
 * - SOCKS proxies, PAC files not supported
 * - Proxy authentication via env vars only
 *
 * These are not fundamental limitations, they just need integration work.
 *
 * ## Troubleshooting
 *
 * 1. Verify proxy env vars: `echo $http_proxy $https_proxy`
 * 2. Check certificates: `echo $NODE_EXTRA_CA_CERTS` (should point to PEM file)
 * 3. View logs: Check ~/.cline/cline-core-service.log for network-related
 *    failures.
 * 4. Test connection: Use `curl -x host:port` etc. to isolate proxy
 *    configuration versus client issues.
 *
 * @example
 * ```typescript
 * // Good - uses configured fetch
 * import { fetch } from '@/shared/net'
 * const response = await fetch(url)
 *
 * // Good - configures axios to use configured fetch
 * import { getAxiosSettings } from '@/shared/net'
 * await axios.get(url, { ...getAxiosSettings() })
 * ```
 */

import { Agent, ProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from "undici"
import { normalizeProxyUrl } from "./proxy"

type FetchFunction = (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>

let mockFetch: FetchFunction | undefined

function getEffectiveProxySettings(): { url: string; allowInsecure: boolean } | null {
	let vsProxy: unknown
	let hooshyarProxy: unknown
	let vsStrictSSL: boolean | undefined
	try {
		const vscodeModule = typeof require !== "undefined" ? require("vscode") : undefined
		if (vscodeModule?.workspace?.getConfiguration) {
			const httpConfig = vscodeModule.workspace.getConfiguration("http")
			vsProxy = httpConfig.get("proxy")
			vsStrictSSL = httpConfig.get("proxyStrictSSL") === true
			const hooshyarConfig = vscodeModule.workspace.getConfiguration("hooshyar")
			hooshyarProxy = hooshyarConfig?.get("proxy")
		}
	} catch {
		// Ignore
	}

	const candidates = [
		vsProxy,
		hooshyarProxy,
		process.env.HTTPS_PROXY,
		process.env.HTTP_PROXY,
		process.env.ALL_PROXY,
		process.env.https_proxy,
		process.env.http_proxy,
		process.env.all_proxy,
	]
	for (const candidate of candidates) {
		const url = normalizeProxyUrl(candidate)
		if (url) {
			return { url, allowInsecure: vsStrictSSL === false }
		}
	}
	return null
}

export function configureGlobalProxyDispatcher(): void {
	try {
		const proxyInfo = getEffectiveProxySettings()
		if (proxyInfo) {
			const agent = new ProxyAgent({
				uri: proxyInfo.url,
				requestTls: {
					rejectUnauthorized: !proxyInfo.allowInsecure,
				},
			})
			setGlobalDispatcher(agent)
		} else {
			setGlobalDispatcher(new Agent())
		}
	} catch (_error) {
		try {
			setGlobalDispatcher(new Agent())
		} catch {
			// Ignore
		}
	}
}

// Initialize proxy dispatcher at load time
configureGlobalProxyDispatcher()

// Listen for dynamic proxy configuration changes in VS Code
try {
	const vscodeModule = typeof require !== "undefined" ? require("vscode") : undefined
	vscodeModule?.workspace?.onDidChangeConfiguration?.((e: any) => {
		if (
			e.affectsConfiguration?.("http.proxy") ||
			e.affectsConfiguration?.("http.proxyStrictSSL") ||
			e.affectsConfiguration?.("hooshyar.proxy")
		) {
			configureGlobalProxyDispatcher()
		}
	})
} catch {
	// Ignore
}

/**
 * Platform-configured fetch that respects proxy settings.
 * Use this instead of global fetch to ensure proper proxy configuration.
 *
 * @example
 * ```typescript
 * import { fetch } from '@/shared/net'
 * const response = await fetch('https://api.example.com')
 * ```
 */
export const fetch: typeof globalThis.fetch = (() => {
	// Use undiciFetch which is tied to the configured undici global dispatcher (ProxyAgent)
	const baseFetch = undiciFetch as any as typeof globalThis.fetch

	let lastDegradedNoticeTime = 0

	function notifyDegradedSwitchIfNeeded(headers: Headers) {
		try {
			const isDegraded = headers.get("X-Degraded-Mode") === "true" || headers.get("X-Claude-Hourly-Degraded") === "true"
			if (!isDegraded) {
				return
			}
			const now = Date.now()
			if (now - lastDegradedNoticeTime > 300_000) {
				lastDegradedNoticeTime = now
				const reason = headers.get("X-Degraded-Reason")
				const upstream = headers.get("X-Upstream-Model") || "DeepSeek"
				const msg =
					reason === "claude_hourly_limit"
						? `هشیار: سقف ساعتی کلاد به پایان رسید؛ جهت جلوگیری از توقف کار شما، درخواست جاری به صورت خودکار با مدل اقتصادی ${upstream} پردازش شد.`
						: `هشیار: جهت بهینه‌سازی مصرف و تداوم کار، پاسخ جاری با ${upstream} پردازش شد.`
				const vscodeModule = typeof require !== "undefined" ? require("vscode") : undefined
				vscodeModule?.window?.showInformationMessage(msg)
			}
		} catch {
			// Ignore in test/standalone environments
		}
	}

	return (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const res = await (mockFetch || baseFetch)(input, init)
		try {
			if (res && res.headers) {
				notifyDegradedSwitchIfNeeded(res.headers)
			}
		} catch {
			// No-op
		}
		return res
	}) as typeof globalThis.fetch
})()

/**
 * Mocks `fetch` for testing and calls `callback`. Then restores `fetch`. If the
 * specified callback returns a Promise, the fetch is restored when that Promise
 * is settled.
 * @param theFetch the replacement function to call to implement `fetch`.
 * @param callback `fetch` will be mocked for the duration of `callback()`.
 * @returns the result of `callback()`.
 */
export function mockFetchForTesting<T>(theFetch: FetchFunction, callback: () => T): T {
	const originalMockFetch = mockFetch
	mockFetch = theFetch
	let willResetSync = true
	try {
		const result = callback()
		if (result instanceof Promise) {
			willResetSync = false
			return result.finally(() => {
				mockFetch = originalMockFetch
			}) as typeof result
		}
		return result
	} finally {
		if (willResetSync) {
			mockFetch = originalMockFetch
		}
	}
}

/**
 * Returns axios configuration for fetch adapter mode with our configured fetch.
 * This ensures axios uses our platform-specific fetch implementation with
 * proper proxy configuration.
 *
 * @returns Configuration object with fetch adapter and configured fetch
 *
 * @example
 * ```typescript
 * const response = await axios.get(url, {
 *   headers: { Authorization: 'Bearer token' },
 *   timeout: 5000,
 *   ...getAxiosSettings()
 * })
 * ```
 */
export function getAxiosSettings(): {
	adapter?: any
	fetch?: typeof globalThis.fetch
	maxBodyLength?: number
	maxContentLength?: number
} {
	return {
		adapter: "fetch" as any,
		fetch, // Use our configured fetch
		maxBodyLength: Number.POSITIVE_INFINITY,
		maxContentLength: Number.POSITIVE_INFINITY,
	}
}
