import { EmptyRequest } from "@shared/proto/cline/common"
import { AddRemoteMcpServerRequest, McpServers } from "@shared/proto/cline/mcp"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import { VSCodeButton, VSCodeLink, VSCodeRadio, VSCodeRadioGroup, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { LINKS } from "@/constants"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { McpServiceClient } from "@/services/grpc-client"

type TransportType = "streamableHttp" | "sse"

const FIGMA_REMOTE_URL = "https://mcp.figma.com/mcp"
const FIGMA_DESKTOP_URL = "http://127.0.0.1:3845/mcp"

type AddRemoteServerFormProps = {
	onServerAdded: () => void
	onCancel?: () => void
	showEditConfiguration?: boolean
}

const AddRemoteServerForm = ({ onCancel, onServerAdded, showEditConfiguration = true }: AddRemoteServerFormProps) => {
	const [serverName, setServerName] = useState("figma")
	const [serverUrl, setServerUrl] = useState(FIGMA_REMOTE_URL)
	const [transportType, setTransportType] = useState<TransportType>("streamableHttp")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState("")
	const { setMcpServers } = useExtensionState()

	const applyFigmaPreset = (url: string) => {
		setServerName("figma")
		setServerUrl(url)
		setTransportType("streamableHttp")
		setError("")
	}

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!serverName.trim()) {
			setError("Server name is required")
			return
		}

		if (!serverUrl.trim()) {
			setError("Server URL is required")
			return
		}

		try {
			new URL(serverUrl)
		} catch (_err) {
			setError("Invalid URL format")
			return
		}

		setError("")
		setIsSubmitting(true)

		try {
			const servers: McpServers = await McpServiceClient.addRemoteMcpServer(
				AddRemoteMcpServerRequest.create({
					serverName: serverName.trim(),
					serverUrl: serverUrl.trim(),
					transportType: transportType,
				}),
			)

			setIsSubmitting(false)

			const mcpServers = convertProtoMcpServersToMcpServers(servers.mcpServers)
			setMcpServers(mcpServers)

			setServerName("")
			setServerUrl("")
			onServerAdded()
		} catch (error) {
			setIsSubmitting(false)
			setError(error instanceof Error ? error.message : "Failed to add server")
		}
	}

	return (
		<div className="p-4 px-5">
			<div
				className="mb-4 overflow-hidden rounded border border-(--vscode-widget-border)"
				style={{ background: "color-mix(in srgb, var(--vscode-editor-background) 82%, var(--vscode-focusBorder))" }}>
				<div className="flex items-start gap-3 p-3">
					<div
						aria-hidden="true"
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-base font-semibold"
						style={{ background: "var(--vscode-button-background)", color: "var(--vscode-button-foreground)" }}>
						F
					</div>
					<div className="min-w-0 flex-1">
						<div className="font-medium">Figma MCP (سرور فیگما)</div>
						<div className="mt-0.5 text-xs text-(--vscode-descriptionForeground)">
							سرویس رسمی فیگما یا نسخه محلی دسکتاپ. در صورت روشن بودن وی‌پی‌ان یا پروکسی، درخواست‌ها به طور خودکار از
							آن عبور می‌کنند.
						</div>
					</div>
				</div>
				<div className="flex gap-2 border-t border-(--vscode-widget-border) p-2">
					<VSCodeButton
						appearance={serverUrl === FIGMA_REMOTE_URL ? "primary" : "secondary"}
						disabled={isSubmitting}
						onClick={() => applyFigmaPreset(FIGMA_REMOTE_URL)}
						type="button">
						Figma Remote
					</VSCodeButton>
					<VSCodeButton
						appearance={serverUrl === FIGMA_DESKTOP_URL ? "primary" : "secondary"}
						disabled={isSubmitting}
						onClick={() => applyFigmaPreset(FIGMA_DESKTOP_URL)}
						type="button">
						Figma Desktop (بدون فیلتر)
					</VSCodeButton>
				</div>
				{serverUrl === FIGMA_REMOTE_URL ? (
					<div className="px-3 pb-2 text-[11px] text-(--vscode-descriptionForeground)">
						💡 برای اتصال ریموت، در صورت محدودیت شبکه از وی‌پی‌ان/پروکسی استفاده کنید. اگر با خطای ۴۰۳ مواجه شدید،
						نرم‌افزار فیگما را باز کرده و <strong>Figma Desktop</strong> را انتخاب کنید.
					</div>
				) : (
					<div className="px-3 pb-2 text-[11px] text-(--vscode-descriptionForeground)">
						💡 نسخه دسکتاپ به صورت لوکال از روی برنامه فعال فیگما اجرا می‌شود و نیازی به اینترنت بین‌الملل یا احراز هویت
						ریموت ندارد.
					</div>
				)}
			</div>

			<div className="text-(--vscode-foreground) mb-2">
				Add a remote MCP server by providing a name and its URL endpoint. Learn more{" "}
				<VSCodeLink href={LINKS.DOCUMENTATION.REMOTE_MCP_SERVER_DOCS} style={{ display: "inline" }}>
					here.
				</VSCodeLink>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="mb-2">
					<VSCodeTextField
						className="w-full"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerName((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="mcp-server"
						value={serverName}>
						Server Name
					</VSCodeTextField>
				</div>

				<div className="mb-2">
					<VSCodeTextField
						className="w-full mr-4"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerUrl((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="https://example.com/mcp-server"
						value={serverUrl}>
						Server URL
					</VSCodeTextField>
				</div>

				<div className="mb-3">
					<label className={`block text-sm font-medium mb-2 ${isSubmitting ? "opacity-50" : ""}`}>Transport Type</label>
					<VSCodeRadioGroup
						disabled={isSubmitting}
						onChange={(e) => {
							const value = (e.target as HTMLInputElement).value as TransportType
							setTransportType(value)
						}}
						value={transportType}>
						<VSCodeRadio checked={transportType === "streamableHttp"} value="streamableHttp">
							Streamable HTTP
						</VSCodeRadio>
						<VSCodeRadio checked={transportType === "sse"} value="sse">
							SSE (Legacy)
						</VSCodeRadio>
					</VSCodeRadioGroup>
				</div>

				{error && <div className="mb-3 text-(--vscode-errorForeground)">{error}</div>}

				<VSCodeButton className="w-full" disabled={isSubmitting} type="submit">
					{isSubmitting ? "Connecting..." : serverName === "figma" ? "Connect Figma" : "Add Server"}
				</VSCodeButton>

				{onCancel && (
					<VSCodeButton
						appearance="secondary"
						className="w-full"
						disabled={isSubmitting}
						onClick={onCancel}
						style={{ marginTop: "8px" }}
						type="button">
						Cancel
					</VSCodeButton>
				)}

				{showEditConfiguration && (
					<VSCodeButton
						appearance="secondary"
						onClick={() => {
							McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch((error) => {
								console.error("Error opening MCP settings:", error)
							})
						}}
						style={{ width: "100%", marginBottom: "5px", marginTop: 15 }}>
						Edit Configuration
					</VSCodeButton>
				)}
			</form>
		</div>
	)
}

export default AddRemoteServerForm
