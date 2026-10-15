import { describe, expect, it } from "vitest"
import { normalizeProxyUrl } from "@/shared/proxy"

describe("normalizeProxyUrl", () => {
	it("adds the HTTP scheme to a proxy host", () => {
		expect(normalizeProxyUrl("127.0.0.1:7890")).toBe("http://127.0.0.1:7890/")
	})

	it("preserves a valid proxy URL", () => {
		expect(normalizeProxyUrl("https://proxy.example.com:8443")).toBe("https://proxy.example.com:8443/")
	})

	it.each([
		"sk-example-secret",
		"sk_example_secret",
		"Bearer secret",
		"",
		"not a host name",
		"socks5://localhost:1080",
	])("rejects a value that must not be used as an HTTP proxy: %s", (value) => {
		expect(normalizeProxyUrl(value)).toBeUndefined()
	})
})
