import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AddRemoteServerForm from "./AddRemoteServerForm"

const mocks = vi.hoisted(() => ({
	addRemoteMcpServer: vi.fn(),
	setMcpServers: vi.fn(),
}))

vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({ setMcpServers: mocks.setMcpServers }),
}))

vi.mock("@/services/grpc-client", () => ({
	McpServiceClient: {
		addRemoteMcpServer: mocks.addRemoteMcpServer,
		openMcpSettings: vi.fn(),
	},
}))

vi.mock("@shared/proto-conversions/mcp/mcp-server-conversion", () => ({
	convertProtoMcpServersToMcpServers: () => [],
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
	VSCodeLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
	VSCodeRadio: ({ children, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { children?: React.ReactNode }) => (
		<label>
			<input type="radio" {...props} />
			{children}
		</label>
	),
	VSCodeRadioGroup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
	VSCodeTextField: ({ children, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { children?: React.ReactNode }) => (
		<label>
			{children}
			<input {...props} />
		</label>
	),
}))

describe("AddRemoteServerForm", () => {
	beforeEach(() => {
		mocks.addRemoteMcpServer.mockReset()
		mocks.addRemoteMcpServer.mockResolvedValue({ mcpServers: [] })
		mocks.setMcpServers.mockReset()
	})

	it("preconfigures the official Figma remote MCP server", async () => {
		render(<AddRemoteServerForm onServerAdded={vi.fn()} showEditConfiguration={false} />)

		expect(screen.getByLabelText("Server Name")).toHaveValue("figma")
		expect(screen.getByLabelText("Server URL")).toHaveValue("https://mcp.figma.com/mcp")

		fireEvent.click(screen.getByRole("button", { name: "Connect Figma" }))

		await waitFor(() =>
			expect(mocks.addRemoteMcpServer).toHaveBeenCalledWith(
				expect.objectContaining({
					serverName: "figma",
					serverUrl: "https://mcp.figma.com/mcp",
					transportType: "streamableHttp",
				}),
			),
		)
	})

	it("switches to the official Figma desktop endpoint", () => {
		render(<AddRemoteServerForm onServerAdded={vi.fn()} showEditConfiguration={false} />)

		fireEvent.click(screen.getByRole("button", { name: "Figma Desktop" }))

		expect(screen.getByLabelText("Server URL")).toHaveValue("http://127.0.0.1:3845/mcp")
	})
})
