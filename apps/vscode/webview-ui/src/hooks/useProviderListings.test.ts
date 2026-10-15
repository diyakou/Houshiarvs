import type { ProviderListing } from "@shared/proto/cline/models"
import { describe, expect, it } from "vitest"
import { onlyHooshyarProviders } from "./useProviderListings"

describe("onlyHooshyarProviders", () => {
	it("hides every provider except Hooshyar", () => {
		const providers = [
			{ id: "anthropic", name: "Anthropic" },
			{ id: "hooshyar", name: "Hooshyar" },
			{ id: "openrouter", name: "OpenRouter" },
		] as ProviderListing[]

		expect(onlyHooshyarProviders(providers)).toEqual([{ id: "hooshyar", name: "Hooshyar" }])
	})
})
