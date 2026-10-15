import { StringArray } from "@shared/proto/cline/common"
import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import type { AxiosRequestConfig } from "axios"
import axios from "axios"
import { parseProviderId } from "@/sdk/model-catalog/provider-id"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Fetches available models from the OpenAI API
 * @param controller The controller instance
 * @param request Request containing the base URL and API key
 * @returns Array of model names
 */
export async function refreshOpenAiModels(controller: Controller, request: OpenAiModelsRequest): Promise<StringArray> {
	try {
		const providerConfig = controller.getProviderConfigStore().read(parseProviderId(request.providerId || "openai"))
		// Trailing slashes would produce "<baseUrl>//models", which many
		// servers reject even though chat completions still work (the AI SDK
		// normalizes the base URL for those).
		const baseUrl = (
			request.baseUrl?.trim() ||
			providerConfig.baseUrl?.trim() ||
			(request.providerId === "hooshyar" ? "https://wqai.morvism.ir/v1" : "")
		).replace(/\/+$/, "")
		const apiKey = request.apiKey || providerConfig.apiKey

		if (!baseUrl) {
			return StringArray.create({ values: [] })
		}

		if (!URL.canParse(baseUrl)) {
			return StringArray.create({ values: [] })
		}

		const config: AxiosRequestConfig = {
			headers: {
				"User-Agent": "claude-code/hooshyar",
				...(providerConfig.headers ?? {}),
				...(apiKey ? { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {}),
			},
		}

		const response = await axios.get(`${baseUrl}/models`, { ...config, ...getAxiosSettings() })
		let rawModels: any[] = []
		if (Array.isArray(response.data)) {
			rawModels = response.data
		} else if (Array.isArray(response.data?.data)) {
			rawModels = response.data.data
		} else if (Array.isArray(response.data?.models)) {
			rawModels = response.data.models
		}
		const modelsArray = rawModels
			.map((model: any) => (typeof model === "string" ? model : model?.id || model?.name))
			.filter(Boolean)
		const models = [...new Set<string>(modelsArray)]

		return StringArray.create({ values: models })
	} catch (error) {
		Logger.error("Error fetching OpenAI models:", error)
		return StringArray.create({ values: [] })
	}
}
