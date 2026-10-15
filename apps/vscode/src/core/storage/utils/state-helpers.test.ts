import { afterEach, describe, expect, it, mock } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { ClineFileStorage } from "@shared/storage/ClineFileStorage"

mock.module("../StateManager", () => ({ StateManager: {} }))

describe("readGlobalStateFromStorage terminal execution mode", () => {
	const temporaryDirectories: string[] = []

	afterEach(() => {
		for (const temporaryDirectory of temporaryDirectories.splice(0)) {
			fs.rmSync(temporaryDirectory, { force: true, recursive: true })
		}
	})

	async function readTerminalExecutionMode(storedValue?: "vscodeTerminal" | "backgroundExec") {
		const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cline-terminal-mode-"))
		temporaryDirectories.push(temporaryDirectory)
		const storage = new ClineFileStorage(path.join(temporaryDirectory, "globalState.json"))
		if (storedValue !== undefined) {
			await storage.update("vscodeTerminalExecutionMode", storedValue)
		}

		const { readGlobalStateFromStorage } = await import("./state-helpers")
		const state = await readGlobalStateFromStorage(storage)
		return state.vscodeTerminalExecutionMode
	}

	it("uses the VS Code terminal when no preference is stored", async () => {
		expect(await readTerminalExecutionMode()).toBe("vscodeTerminal")
	})

	it.each(["vscodeTerminal", "backgroundExec"] as const)("preserves a stored %s preference", async (storedValue) => {
		expect(await readTerminalExecutionMode(storedValue)).toBe(storedValue)
	})
})

describe("readGlobalStateFromStorage API provider defaults", () => {
	const temporaryDirectories: string[] = []

	afterEach(() => {
		for (const temporaryDirectory of temporaryDirectories.splice(0)) {
			fs.rmSync(temporaryDirectory, { force: true, recursive: true })
		}
	})

	it("uses Hooshyar for new installations", async () => {
		const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "hooshyar-provider-default-"))
		temporaryDirectories.push(temporaryDirectory)
		const storage = new ClineFileStorage(path.join(temporaryDirectory, "globalState.json"))

		const { readGlobalStateFromStorage } = await import("./state-helpers")
		const state = await readGlobalStateFromStorage(storage)

		expect(state.planModeApiProvider).toBe("hooshyar")
		expect(state.actModeApiProvider).toBe("hooshyar")
	})

	it("migrates legacy provider selections to Hooshyar", async () => {
		const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "hooshyar-provider-migration-"))
		temporaryDirectories.push(temporaryDirectory)
		const storage = new ClineFileStorage(path.join(temporaryDirectory, "globalState.json"))
		await storage.update("planModeApiProvider", "anthropic")
		await storage.update("actModeApiProvider", "openrouter")

		const { readGlobalStateFromStorage } = await import("./state-helpers")
		const state = await readGlobalStateFromStorage(storage)

		expect(state.planModeApiProvider).toBe("hooshyar")
		expect(state.actModeApiProvider).toBe("hooshyar")
	})
})
