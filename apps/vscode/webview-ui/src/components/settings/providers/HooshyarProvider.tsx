import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import type { Mode } from "@shared/storage/types"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderConfig } from "@/hooks/useProviderConfig"
import { useProviderModelSelection } from "@/hooks/useProviderModelSelection"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ModelsServiceClient } from "@/services/grpc-client"
import { ApiKeyField } from "../common/ApiKeyField"
import { BaseUrlField } from "../common/BaseUrlField"
import { ModelInfoView } from "../common/ModelInfoView"
import { useProviderApiKeyField } from "../utils/useProviderApiKeyField"
import { HooshyarUsageCard } from "./HooshyarUsageCard"
import { type ModelPickerSelection, ModelPickerWithManualEntry } from "./ModelPickerWithManualEntry"

const PROVIDER_ID = "hooshyar"
const DEFAULT_BASE_URL = "https://wqai.morvism.ir/v1"

interface HooshyarProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

export const HooshyarProvider = ({ showModelOptions, isPopup, currentMode }: HooshyarProviderProps) => {
	const { models, defaultModelId, isLoading, isStale, error, refresh } = useProviderModels(PROVIDER_ID)
	const { config, write, commitSelection } = useProviderConfig(PROVIDER_ID)
	const [dynamicModels, setDynamicModels] = useState<string[]>([])
	const [isRefreshingModels, setIsRefreshingModels] = useState(false)

	const refreshDynamicModels = useCallback(async () => {
		setIsRefreshingModels(true)
		try {
			const res = await ModelsServiceClient.refreshOpenAiModels(
				OpenAiModelsRequest.create({
					providerId: PROVIDER_ID,
					baseUrl: config?.baseUrl || DEFAULT_BASE_URL,
				}),
			)
			if (res.values && res.values.length > 0) {
				setDynamicModels(res.values)
			}
		} catch (e) {
			console.error("Failed to fetch models from /v1/models:", e)
		} finally {
			setIsRefreshingModels(false)
		}
	}, [config?.baseUrl])

	useEffect(() => {
		void refreshDynamicModels()
	}, [refreshDynamicModels])

	const effectiveModels = useMemo(() => {
		const result: Record<string, any> = { ...(models ?? {}) }
		if (!result["claude-sonnet-5"]) {
			result["claude-sonnet-5"] = {
				id: "claude-sonnet-5",
				name: "Claude Sonnet 5",
				contextWindow: 200_000,
				maxTokens: 8192,
				supportsImages: true,
				supportsPromptCache: true,
				supportsReasoning: true,
			}
		}
		for (const modelId of dynamicModels) {
			if (!result[modelId]) {
				result[modelId] = {
					id: modelId,
					name: modelId,
					contextWindow: 200_000,
					maxTokens: 8192,
					supportsImages: true,
					supportsPromptCache: true,
					supportsReasoning: true,
				}
			}
		}
		return result
	}, [models, dynamicModels])

	const { selectedModel, commitModelSelection } = useProviderModelSelection(PROVIDER_ID, currentMode, {
		models: effectiveModels,
		defaultModelId: defaultModelId || "claude-sonnet-5",
		config,
		commitSelection,
	})

	const { navigateToMcp } = useExtensionState()
	const [showAdvanced, setShowAdvanced] = useState(false)

	const handleModelSelect = (selection: ModelPickerSelection) => {
		void commitModelSelection(selection).catch((err) => console.error("Failed to commit Hooshyar model selection:", err))
	}

	const { savedApiKeyMask, handleApiKeyChange } = useProviderApiKeyField({
		apiKeyLength: config?.apiKeyLength,
		providerName: "Hooshyar",
		write,
	})

	const handleBaseUrlChange = (baseUrl: string) => {
		void write({ baseUrl }).catch((err) => console.error("Failed to update Hooshyar base URL:", err))
	}

	return (
		<div className="flex flex-col gap-3">
			<ApiKeyField
				helpText="کلید API خود را وارد کنید. تمام درخواست‌ها به صورت مستقیم به سرور هوشیار (https://wqai.morvism.ir/v1) ارسال می‌شود."
				initialValue={savedApiKeyMask}
				label="Hooshyar API Key"
				onChange={handleApiKeyChange}
				placeholder="Enter your Hooshyar API Key..."
				providerName="Hooshyar"
			/>

			{showModelOptions && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-[var(--vscode-foreground)]">مدل (Model)</span>
						<button
							className="text-xs text-[var(--vscode-textLink-foreground)] hover:underline bg-transparent border-0 p-0 cursor-pointer flex items-center gap-1"
							disabled={isLoading || isRefreshingModels}
							onClick={() => {
								void refresh()
								void refreshDynamicModels()
							}}
							type="button">
							<span
								className={
									isLoading || isRefreshingModels ? "codicon codicon-sync animate-spin" : "codicon codicon-sync"
								}
							/>
							<span>{isLoading || isRefreshingModels ? "در حال دریافت..." : "بروزرسانی مدل‌ها (از سرور)"}</span>
						</button>
					</div>
					<ModelPickerWithManualEntry
						allowsCustomIds={true}
						error={error}
						isLoading={isLoading || isRefreshingModels}
						isStale={isStale}
						models={effectiveModels}
						onSelect={handleModelSelect}
						selectedModel={selectedModel}
					/>
				</div>
			)}

			{selectedModel.modelInfo && (
				<ModelInfoView modelInfo={selectedModel.modelInfo} selectedModelId={selectedModel.modelId} />
			)}

			<HooshyarUsageCard className="mt-1" />

			<div className="p-2.5 rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)] flex items-center justify-between gap-2 mt-1">
				<div className="flex flex-col gap-0.5">
					<span className="font-semibold text-xs">اتصال ابزارها و سرورهای MCP</span>
					<span className="text-[11px] text-[var(--vscode-descriptionForeground)]">
						اتصال سرورها و ابزارهای سفارشی MCP به هوشیار
					</span>
				</div>
				<button
					className="px-2.5 py-1 rounded bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] text-[var(--vscode-button-secondaryForeground)] text-xs font-medium cursor-pointer shrink-0 border border-[var(--vscode-button-border,transparent)]"
					onClick={() => navigateToMcp("configure")}
					type="button">
					مدیریت MCP
				</button>
			</div>

			<div className="mt-1">
				<button
					className="text-xs text-[var(--vscode-textLink-foreground)] hover:underline bg-transparent border-0 p-0 cursor-pointer flex items-center gap-1"
					onClick={() => setShowAdvanced(!showAdvanced)}
					type="button">
					<span>{showAdvanced ? "▼" : "▶"}</span>
					<span>تنظیمات پیشرفته (Advanced Settings)</span>
				</button>

				{showAdvanced && (
					<div className="mt-2 pl-2 border-l border-[var(--vscode-panel-border)] flex flex-col gap-2">
						<BaseUrlField
							initialValue={config?.baseUrl || DEFAULT_BASE_URL}
							label="Base URL"
							onChange={handleBaseUrlChange}
							placeholder={DEFAULT_BASE_URL}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

export default HooshyarProvider
