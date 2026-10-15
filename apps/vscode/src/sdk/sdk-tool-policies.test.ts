import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { describe, expect, it } from "vitest"
import { buildToolPolicies, isToolAutoApproved } from "./sdk-tool-policies"

describe("isToolAutoApproved", () => {
	it("does not auto-approve command tools by default", () => {
		expect(isToolAutoApproved("run_commands", DEFAULT_AUTO_APPROVAL_SETTINGS)).toBe(false)
	})

	it("uses executeSafeCommands as the single command approval flag", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: {
				...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
				executeSafeCommands: false,
				executeAllCommands: true,
			},
		}

		expect(isToolAutoApproved("run_commands", settings)).toBe(false)
	})

	it("auto-approves all MCP tools when the Use MCP servers toggle is on", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: { ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions, useMcp: true },
		}

		expect(isToolAutoApproved("firecrawl__scrape", settings)).toBe(true)
	})

	it("prompts for MCP tools when the Use MCP servers toggle is off", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: { ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions, useMcp: false },
		}

		expect(isToolAutoApproved("firecrawl__scrape", settings)).toBe(false)
	})

	it("keeps coding tools and removes optional context-heavy tools for Hooshyar", () => {
		const policies = buildToolPolicies(DEFAULT_AUTO_APPROVAL_SETTINGS, undefined, "hooshyar")

		expect(policies.read_files?.enabled).not.toBe(false)
		expect(policies.search_codebase?.enabled).not.toBe(false)
		expect(policies.run_commands?.enabled).not.toBe(false)
		expect(policies.editor?.enabled).not.toBe(false)
		expect(policies.fetch_web_content).toEqual({ enabled: false })
		expect(policies.web_search).toEqual({ enabled: false })
		expect(policies.ask_question).toEqual({ enabled: false })
	})
})
