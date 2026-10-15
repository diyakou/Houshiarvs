import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { Send, Settings } from "lucide-react"
import HooshyarLogo from "@/assets/HooshyarLogo"
import { HooshyarUsageCard } from "@/components/settings/providers/HooshyarUsageCard"
import { useExtensionState } from "@/context/ExtensionStateContext"

export const AccountWelcomeView = () => {
	const { navigateToSettings } = useExtensionState()

	return (
		<div className="flex flex-col items-center gap-4 py-4 w-full max-w-lg mx-auto">
			<HooshyarLogo className="size-16 text-[#0CAAF0]" />

			<div className="text-center">
				<h2 className="m-0 text-lg font-bold">حساب کاربری هوشیار</h2>
				<p className="m-0 text-xs text-[var(--vscode-descriptionForeground)] mt-1">
					مشاهده وضعیت اشتراک و اتصال به سرور هوشیار
				</p>
			</div>

			{/* Telegram Box */}
			<div
				className="w-full rounded-lg border border-[var(--vscode-charts-blue,#0CAAF0)]/30 bg-[var(--vscode-charts-blue,#0CAAF0)]/10 p-3.5 flex items-center justify-between gap-3 text-right"
				dir="rtl">
				<div className="flex flex-col gap-0.5">
					<span className="font-semibold text-sm text-[var(--vscode-foreground)]">خرید و تمدید اشتراک</span>
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
					<Send className="size-3.5" />
					<span>@lILDEVELOP</span>
				</a>
			</div>

			{/* Live Usage Card */}
			<div className="w-full">
				<HooshyarUsageCard />
			</div>

			<div className="w-full pt-2">
				<VSCodeButton appearance="secondary" className="w-full" onClick={() => navigateToSettings("api-config")}>
					<span className="flex items-center gap-2">
						<Settings className="size-4" />
						<span>ویرایش کلید API در تنظیمات</span>
					</span>
				</VSCodeButton>
			</div>
		</div>
	)
}

export default AccountWelcomeView
