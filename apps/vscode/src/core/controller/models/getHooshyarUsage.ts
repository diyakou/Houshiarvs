import { String } from "@shared/proto/cline/common"
import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import type { AxiosRequestConfig } from "axios"
import axios from "axios"
import { parseProviderId } from "@/sdk/model-catalog/provider-id"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from ".."

/**
 * Fetches Hooshyar account usage status from /v1/usage endpoint
 * per SERVER_CONNECTION.md
 */
export async function getHooshyarUsage(controller: Controller, request: OpenAiModelsRequest): Promise<String> {
	try {
		const providerConfig = controller.getProviderConfigStore().read(parseProviderId(request.providerId || "hooshyar"))
		const rawBaseUrl = request.baseUrl || providerConfig.baseUrl || "https://wqai.morvism.ir/v1"
		const baseUrl = rawBaseUrl.trim().replace(/\/+$/, "")
		const apiKey = request.apiKey || providerConfig.apiKey

		if (!apiKey) {
			return String.create({
				value: JSON.stringify({
					error: "کلید API یافت نشد. لطفاً ابتدا کلید API خود را وارد کنید.",
				}),
			})
		}

		let usageUrl = `${baseUrl}/usage`
		if (baseUrl.endsWith("/usage") || baseUrl.endsWith("/messages/usage") || baseUrl.endsWith("/token/usage")) {
			usageUrl = baseUrl
		}

		const config: AxiosRequestConfig = {
			headers: {
				"User-Agent": "claude-code/hooshyar",
				Accept: "application/json",
				...(providerConfig.headers ?? {}),
				Authorization: `Bearer ${apiKey}`,
				"x-api-key": apiKey,
			},
			timeout: 15000,
		}

		const response = await axios.get(usageUrl, { ...config, ...getAxiosSettings() })
		return String.create({ value: JSON.stringify(response.data) })
	} catch (error: any) {
		Logger.error("Error fetching Hooshyar usage:", error)
		const errorDetail =
			error?.response?.data?.detail ||
			error?.response?.data?.message ||
			(error?.response?.status === 401 ? "کلید API نامعتبر است یا منقضی شده است." : undefined) ||
			error?.message ||
			"خطا در برقراری ارتباط با سرور هوشیار"

		return String.create({
			value: JSON.stringify({
				error: errorDetail,
				status: error?.response?.status,
			}),
		})
	}
}
