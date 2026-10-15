import type {
	GatewayProviderContext,
	GatewayResolvedProviderConfig,
} from "@cline/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnthropicProviderModule } from "./anthropic";

const createAnthropicMock = vi.hoisted(() => vi.fn());
const anthropicModelMock = vi.hoisted(() =>
	vi.fn((modelId: string) => ({ provider: "anthropic", modelId })),
);

vi.mock("@ai-sdk/anthropic", () => ({
	createAnthropic: createAnthropicMock,
}));

describe("createAnthropicProviderModule", () => {
	beforeEach(() => {
		createAnthropicMock.mockReset();
		createAnthropicMock.mockReturnValue(anthropicModelMock);
		anthropicModelMock.mockClear();
	});

	it("passes custom base URLs to Anthropic-compatible providers", async () => {
		const provider = await createAnthropicProviderModule(
			config({
				apiKey: "minimax-api-key",
				baseUrl: "https://api.minimax.io/anthropic",
			}),
			context("minimax"),
		);

		provider.operations.language("MiniMax-M2.5");

		expect(createAnthropicMock).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: "minimax-api-key",
				baseURL: "https://api.minimax.io/anthropic",
				name: "minimax",
			}),
		);
		expect(anthropicModelMock).toHaveBeenCalledWith("MiniMax-M2.5");
	});

	it("does not wrap fetch for non-MiniMax Anthropic-compatible providers", async () => {
		const customFetch = vi.fn<typeof fetch>();

		await createAnthropicProviderModule(
			config({
				providerId: "anthropic",
				apiKey: "anthropic-api-key",
				fetch: customFetch,
			}),
			context("anthropic"),
		);

		expect(createAnthropicMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "anthropic",
				fetch: customFetch,
			}),
		);
	});

	it("sends Hooshyar requests through Anthropic with its required headers", async () => {
		const customFetch = vi.fn<typeof fetch>();

		await createAnthropicProviderModule(
			config({
				providerId: "hooshyar",
				apiKey: "hooshyar-api-key",
				baseUrl: "https://wqai.morvism.ir/v1",
				fetch: customFetch,
			}),
			context("hooshyar"),
		);

		expect(createAnthropicMock).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: "hooshyar-api-key",
				baseURL: "https://wqai.morvism.ir/v1",
				name: "hooshyar",
				fetch: customFetch,
				headers: expect.objectContaining({
					Authorization: "Bearer hooshyar-api-key",
					"x-api-key": "hooshyar-api-key",
					"User-Agent": "claude-code/hooshyar",
				}),
			}),
		);
	});
});

function config(
	overrides: Partial<GatewayResolvedProviderConfig>,
): GatewayResolvedProviderConfig {
	return {
		providerId: "minimax",
		...overrides,
	};
}

function context(providerId: string): GatewayProviderContext {
	return {
		provider: {
			id: providerId,
			name: "MiniMax",
			defaultModelId: "MiniMax-M2.5",
			models: [],
		},
		model: {
			providerId,
			id: "MiniMax-M2.5",
			name: "MiniMax-M2.5",
		},
		config: config({ providerId }),
	};
}
