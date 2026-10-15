import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import React, { memo, useMemo, useState } from "react"
import CodeAccordian from "@/components/common/CodeAccordian"

interface McpToolCallRowProps {
	serverName: string
	toolName: string
	argumentsStr?: string
}

export const McpToolCallRow: React.FC<McpToolCallRowProps> = ({ serverName, toolName, argumentsStr }) => {
	const [isArgsExpanded, setIsArgsExpanded] = useState(false)

	// Safely parse arguments to display high-value summary parameters (e.g. nodeId, fileKey, query)
	const { parsedArgs, summaryBadges } = useMemo(() => {
		if (!argumentsStr || argumentsStr === "{}" || argumentsStr === "") {
			return { parsedArgs: null, summaryBadges: [] }
		}

		try {
			const parsed = JSON.parse(argumentsStr) as Record<string, unknown>
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				return { parsedArgs: null, summaryBadges: [] }
			}

			const badges: Array<{ key: string; value: string }> = []

			// Priority keys for Figma and general tools
			const priorityKeys = ["nodeId", "fileKey", "query", "url", "path", "command", "pattern"]
			for (const key of priorityKeys) {
				if (key in parsed && parsed[key] != null && typeof parsed[key] !== "object") {
					badges.push({ key, value: String(parsed[key]) })
				}
			}

			// If no priority keys found, take the first 2 scalar keys
			if (badges.length === 0) {
				for (const [key, val] of Object.entries(parsed)) {
					if (val != null && typeof val !== "object" && typeof val !== "function") {
						badges.push({ key, value: String(val) })
						if (badges.length >= 2) break
					}
				}
			}

			return { parsedArgs: parsed, summaryBadges: badges.slice(0, 3) }
		} catch {
			return { parsedArgs: null, summaryBadges: [] }
		}
	}, [argumentsStr])

	const argCount = parsedArgs ? Object.keys(parsedArgs).length : 0

	return (
		<div className="flex flex-col gap-1.5 py-1 text-xs">
			{/* Clean Compact Header */}
			<div className="flex items-center gap-2 flex-wrap">
				<span className="codicon codicon-symbol-method text-accent shrink-0" />
				<span className="font-semibold text-foreground break-all">{toolName}</span>
				<span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-foreground/10 text-foreground/80 border border-foreground/10">
					{serverName}
				</span>
			</div>

			{/* High-value argument summary badges (e.g. nodeId: 11:2) without clutter */}
			{summaryBadges.length > 0 && (
				<div className="flex items-center gap-1.5 flex-wrap mt-0.5">
					{summaryBadges.map(({ key, value }) => (
						<span
							className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-foreground/5 text-description border border-border/40 max-w-full truncate"
							key={key}
							title={`${key}: ${value}`}>
							<span className="opacity-70 font-mono text-[10px]">{key}:</span>
							<span className="font-medium truncate max-w-[200px]">{value}</span>
						</span>
					))}
				</div>
			)}

			{/* Collapsible Arguments Accordion (Collapsed by default to keep chat clean) */}
			{argumentsStr && argumentsStr !== "{}" && (
				<div className="mt-1">
					<button
						className="flex items-center gap-1 text-[11px] text-description hover:text-foreground py-0.5 px-1 rounded hover:bg-foreground/5 transition-colors cursor-pointer select-none"
						onClick={(e) => {
							e.stopPropagation()
							setIsArgsExpanded((prev) => !prev)
						}}
						type="button">
						{isArgsExpanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
						<span className="font-medium uppercase tracking-wider text-[10px]">Arguments</span>
						{argCount > 0 && (
							<span className="text-[10px] opacity-60">
								({argCount} {argCount === 1 ? "param" : "params"})
							</span>
						)}
					</button>

					{isArgsExpanded && (
						<div className="mt-1 max-h-[300px] overflow-auto rounded border border-border/40">
							<CodeAccordian
								code={argumentsStr}
								isExpanded={true}
								language="json"
								onToggleExpand={() => setIsArgsExpanded(false)}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default memo(McpToolCallRow)
