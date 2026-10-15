import { OpenAiModelsRequest } from "@shared/proto/cline/models"
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCw, Send } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ModelsServiceClient } from "@/services/grpc-client"

interface BillingData {
	mode?: string
	credits_limit?: number
	usage_percent?: number
	credits_usage_percent?: number
	remaining_percent?: number
	soft_limit_state?: string
	five_hour_credits_used?: number
	five_hour_credits_reserved?: number
	five_hour_credits_limit?: number
	user_token_balance?: number
}

interface UsageData {
	status?: string | number
	plan?: string
	billing_mode?: string
	expires_at?: string | null
	billing?: BillingData
	limits?: { max_context_tokens?: number; max_output_tokens?: number }
	error?: string
	_cachedAt?: string
}

const CACHE_KEY = "hooshyar:last-successful-usage"

const percent = (value: unknown) => {
	const number = Number(value)
	return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0
}

const formatNumber = (value?: number) =>
	typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("fa-IR") : "—"

const formatDate = (value?: string | null) => {
	if (!value) return "—"
	const date = new Date(value)
	return Number.isNaN(date.getTime())
		? "—"
		: new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

const formatPlan = (value?: string) =>
	value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "نامشخص"

function readCache(): UsageData | null {
	try {
		const value = localStorage.getItem(CACHE_KEY)
		return value ? (JSON.parse(value) as UsageData) : null
	} catch {
		return null
	}
}

function cacheUsage(value: UsageData): UsageData {
	const cached = { ...value, _cachedAt: new Date().toISOString() }
	try {
		localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
	} catch {
		// Some restricted webviews disable local storage.
	}
	return cached
}

function Progress({ value, state = "normal" }: { value: number; state?: string }) {
	const color =
		state === "critical" || state === "exhausted"
			? "var(--vscode-errorForeground,#f14c4c)"
			: state === "warning"
				? "var(--vscode-charts-yellow,#cca700)"
				: "var(--vscode-charts-blue,#0CAAF0)"
	return (
		<div className="h-1.5 overflow-hidden rounded-full bg-[rgba(127,127,127,.25)]">
			<div className="h-full rounded-full" style={{ backgroundColor: color, width: `${value}%` }} />
		</div>
	)
}

export const HooshyarUsageCard = ({ className = "" }: { className?: string }) => {
	const [usage, setUsage] = useState<UsageData | null>(() => readCache())
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const refresh = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await ModelsServiceClient.getHooshyarUsage(OpenAiModelsRequest.create({ providerId: "hooshyar" }))
			const parsed = JSON.parse(response.value || "{}") as UsageData
			if (parsed.error) {
				setError(parsed.error)
				if (!usage) setUsage(parsed)
			} else {
				setUsage(cacheUsage(parsed))
			}
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : "ارتباط با سرور هوشیار برقرار نشد."
			setError(message)
			if (!usage) setUsage({ error: message })
		} finally {
			setLoading(false)
		}
	}, [usage])

	useEffect(() => {
		void refresh()
		// Fetch once on mount; manual refresh uses the latest callback.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const billing = usage?.billing
	const limit = Number(billing?.credits_limit || 0)
	const available = limit > 0
	const usedPercent = percent(billing?.usage_percent ?? billing?.credits_usage_percent)
	const remainingPercent = Number.isFinite(Number(billing?.remaining_percent))
		? percent(billing?.remaining_percent)
		: Math.max(0, 100 - usedPercent)
	const state = billing?.soft_limit_state || "normal"
	const expired = usage?.status === "expired"
	const payg = usage?.billing_mode === "wallet" || billing?.mode === "wallet"

	return (
		<div
			className={`flex flex-col gap-2.5 rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)] p-3 ${className}`}
			dir="rtl">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Activity className="size-4 text-[var(--vscode-charts-blue,#0CAAF0)]" />
					<strong className="text-xs">وضعیت پلن و مصرف</strong>
				</div>
				<button
					className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs text-[var(--vscode-textLink-foreground)]"
					disabled={loading}
					onClick={() => void refresh()}
					type="button">
					<RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> به‌روزرسانی
				</button>
			</div>

			{loading && !usage && <div className="py-2 text-center text-xs">در حال دریافت اطلاعات مصرف…</div>}
			{error && (
				<div className="flex gap-2 rounded border border-[var(--vscode-inputValidation-warningBorder)] p-2 text-xs">
					<AlertCircle className="size-4 shrink-0" />
					<span>
						{usage?._cachedAt ? "دریافت اطلاعات تازه ناموفق بود؛ آخرین اطلاعات ذخیره‌شده نمایش داده می‌شود." : error}
					</span>
				</div>
			)}

			{usage && !usage.error && (
				<>
					<div className="grid grid-cols-2 gap-1.5 text-xs">
						<div className="rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2">
							<span className="block text-[10px] text-[var(--vscode-descriptionForeground)]">پلن</span>
							<strong className="text-[var(--vscode-charts-blue,#0CAAF0)]">{formatPlan(usage.plan)}</strong>
						</div>
						<div className="rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2">
							<span className="block text-[10px] text-[var(--vscode-descriptionForeground)]">وضعیت</span>
							<strong
								className={`flex items-center gap-1 ${expired ? "text-[var(--vscode-errorForeground)]" : "text-[var(--vscode-charts-green,#4CAF50)]"}`}>
								{expired ? <AlertCircle className="size-3" /> : <CheckCircle2 className="size-3" />}
								{expired ? "منقضی‌شده" : "فعال"}
							</strong>
						</div>
					</div>

					{payg ? (
						<div className="flex justify-between rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2 text-xs">
							<span>موجودی کیف پول</span>
							<strong>{formatNumber(billing?.user_token_balance)}</strong>
						</div>
					) : available ? (
						<div className="flex flex-col gap-1.5 rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2 text-xs">
							<div className="flex justify-between">
								<span>مصرف دوره</span>
								<strong>{usedPercent.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪</strong>
							</div>
							<Progress state={state} value={usedPercent} />
							<span className="text-[10px] text-[var(--vscode-descriptionForeground)]">
								حدود {remainingPercent.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪ از بودجه پردازشی
								باقی مانده است.
							</span>
						</div>
					) : (
						<div className="rounded border border-[var(--vscode-panel-border)] p-2 text-xs text-[var(--vscode-descriptionForeground)]">
							اطلاعات مصرف این پلن در دسترس نیست.
						</div>
					)}

					{state !== "normal" && available && (
						<div className="flex gap-2 rounded border border-[var(--vscode-inputValidation-warningBorder)] p-2 text-xs">
							<AlertCircle className="size-4 shrink-0" />
							<span>
								{state === "exhausted"
									? "بودجه این دوره تمام شده است؛ برای ادامه پلن را تمدید یا ارتقا دهید."
									: "بودجه پردازشی این دوره رو به پایان است."}
							</span>
						</div>
					)}

					<div className="grid grid-cols-2 gap-1.5 text-xs">
						<div className="rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2">
							<span className="block text-[10px] text-[var(--vscode-descriptionForeground)]">نوع دسترسی</span>
							<strong className="text-[var(--vscode-charts-green,#4CAF50)]">Fair-Use</strong>
						</div>
						<div className="rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-2">
							<span className="block text-[10px] text-[var(--vscode-descriptionForeground)]">پشتیبانی مدل‌ها</span>
							<strong>Claude & Sonnet</strong>
						</div>
					</div>
					{usage.expires_at && (
						<div className="flex items-center gap-1.5 text-[10px] text-[var(--vscode-descriptionForeground)]">
							<Clock3 className="size-3" /> تمدید/انقضا: {formatDate(usage.expires_at)}
						</div>
					)}
					{usage._cachedAt && error && (
						<span className="text-[10px] text-[var(--vscode-descriptionForeground)]">
							آخرین به‌روزرسانی موفق: {formatDate(usage._cachedAt)}
						</span>
					)}
				</>
			)}

			<div className="flex items-center justify-between gap-2 rounded border border-[var(--vscode-panel-border)] p-2">
				<strong className="text-[11px]">خرید، تمدید یا ارتقای پلن</strong>
				<a
					className="flex items-center gap-1 rounded bg-[#0CAAF0] px-2 py-0.5 text-[11px] font-bold text-white no-underline"
					dir="ltr"
					href="https://t.me/lILDEVELOP"
					rel="noreferrer"
					target="_blank">
					<Send className="size-2.5" />
					@lILDEVELOP
				</a>
			</div>
		</div>
	)
}

export default HooshyarUsageCard
