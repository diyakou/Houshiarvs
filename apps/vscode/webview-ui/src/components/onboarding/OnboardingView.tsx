import { BooleanRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import HooshyarLogo from "@/assets/HooshyarLogo"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { validateApiConfiguration } from "@/utils/validate"
import ApiConfigurationSection from "../settings/sections/ApiConfigurationSection"

const OnboardingView = () => {
	const { apiConfiguration, mode, setShowWelcome } = useExtensionState()
	const [apiError, setApiError] = useState<string | undefined>()
	const [isCompleting, setIsCompleting] = useState(false)

	useEffect(() => {
		setApiError(validateApiConfiguration(mode, apiConfiguration))
	}, [apiConfiguration, mode])

	const completeOnboarding = async () => {
		setIsCompleting(true)
		try {
			await StateServiceClient.setWelcomeViewCompleted(BooleanRequest.create({ value: true }))
			setShowWelcome(false)
		} catch (error) {
			console.error("Failed to complete onboarding:", error)
		} finally {
			setIsCompleting(false)
		}
	}

	return (
		<div className="fixed inset-0 flex flex-col overflow-auto p-5">
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 py-8">
				<HooshyarLogo className="size-20 text-[#0CAAF0]" />
				<div className="text-center">
					<h2 className="m-0 text-xl font-semibold">Welcome to Hooshyar</h2>
					<p className="mb-0 text-sm text-(--vscode-descriptionForeground)">
						Configure your Hooshyar API key and model to start coding with your AI assistant.
					</p>
				</div>
				<div
					className="w-full rounded-lg border border-[var(--vscode-charts-blue,#0CAAF0)]/30 bg-[var(--vscode-charts-blue,#0CAAF0)]/10 p-3.5 flex items-center justify-between gap-3 text-right"
					dir="rtl">
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold text-sm text-[var(--vscode-foreground)]">خرید اشتراک هوشیار</span>
						<span className="text-xs text-[var(--vscode-descriptionForeground)]">
							جهت خرید اشتراک به تلگرام پیام بدید:
						</span>
					</div>
					<a
						className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0CAAF0] hover:bg-[#098ec9] text-white font-bold text-xs no-underline shrink-0 transition-colors"
						dir="ltr"
						href="https://t.me/lILDEVELOP"
						rel="noreferrer"
						target="_blank">
						<svg className="size-3.5 fill-current" viewBox="0 0 24 24">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
						</svg>
						<span>@lILDEVELOP</span>
					</a>
				</div>
				<div className="w-full rounded border border-(--vscode-panel-border)">
					<ApiConfigurationSection />
				</div>
				{apiError && <p className="m-0 text-sm text-(--vscode-errorForeground)">{apiError}</p>}
				<VSCodeButton appearance="primary" disabled={Boolean(apiError) || isCompleting} onClick={completeOnboarding}>
					{isCompleting ? "Saving..." : "Start with Hooshyar"}
				</VSCodeButton>
			</div>
		</div>
	)
}

export default OnboardingView
