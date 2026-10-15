import type { ExtensionMessage } from "@shared/ExtensionMessage"
import { ResetStateRequest } from "@shared/proto/cline/state"
import { CheckCheck, FlaskConical, Info, type LucideIcon, SlidersHorizontal, SquareTerminal, Wrench } from "lucide-react"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useEvent } from "react-use"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { cn } from "@/lib/utils"
import { StateServiceClient } from "@/services/grpc-client"
import { Tab, TabContent, TabList, TabTrigger } from "../common/Tab"
import ViewHeader from "../common/ViewHeader"
import SectionHeader from "./SectionHeader"
import SettingsTargetHighlight from "./SettingsTargetHighlight"
import AboutSection from "./sections/AboutSection"
import ApiConfigurationSection from "./sections/ApiConfigurationSection"
import DebugSection from "./sections/DebugSection"
import FeatureSettingsSection from "./sections/FeatureSettingsSection"
import GeneralSettingsSection from "./sections/GeneralSettingsSection"
import TerminalSettingsSection from "./sections/TerminalSettingsSection"
import { getNextSettingsNavigationRequestId, resolveSettingsTarget, type SettingsNavigationRequest } from "./settingsTargets"

const IS_DEV = process.env.IS_DEV

type SettingsTabID = "api-config" | "features" | "terminal" | "general" | "about" | "debug"

interface SettingsTab {
	id: SettingsTabID
	name: string
	tooltipText: string
	headerText: string
	icon: LucideIcon
	hidden?: () => boolean
}

const SETTINGS_TABS: SettingsTab[] = [
	{
		id: "api-config",
		name: "API Configuration",
		tooltipText: "API Configuration",
		headerText: "API Configuration",
		icon: SlidersHorizontal,
	},
	{
		id: "features",
		name: "Features",
		tooltipText: "Feature Settings",
		headerText: "Feature Settings",
		icon: CheckCheck,
	},
	{
		id: "terminal",
		name: "Terminal",
		tooltipText: "Terminal Settings",
		headerText: "Terminal Settings",
		icon: SquareTerminal,
	},
	{
		id: "general",
		name: "General",
		tooltipText: "General Settings",
		headerText: "General Settings",
		icon: Wrench,
	},
	{
		id: "about",
		name: "About",
		tooltipText: "About Hooshyar",
		headerText: "About",
		icon: Info,
	},
	{
		id: "debug",
		name: "Debug",
		tooltipText: "Debug Tools",
		headerText: "Debug",
		icon: FlaskConical,
		hidden: () => !IS_DEV,
	},
]

type SettingsViewProps = {
	onDone: () => void
	navigationRequest?: SettingsNavigationRequest
}

const renderSectionHeader = (tabId: string) => {
	const tab = SETTINGS_TABS.find((item) => item.id === tabId)
	if (!tab) {
		return null
	}

	return (
		<SectionHeader>
			<div className="flex items-center gap-2">
				<tab.icon className="w-4" />
				<div>{tab.headerText}</div>
			</div>
		</SectionHeader>
	)
}

const SettingsView = ({ navigationRequest, onDone }: SettingsViewProps) => {
	const initialTarget = resolveSettingsTarget(navigationRequest?.target)
	const tabContent = useMemo<Record<SettingsTabID, FC<any>>>(
		() => ({
			"api-config": ApiConfigurationSection,
			general: GeneralSettingsSection,
			features: FeatureSettingsSection,
			terminal: TerminalSettingsSection,
			about: AboutSection,
			debug: DebugSection,
		}),
		[],
	)

	const { version, extensionVariant, environment, settingsInitialModelTab } = useExtensionState()
	const [activeTab, setActiveTab] = useState<string>(initialTarget?.tabId || SETTINGS_TABS[0].id)
	const [pendingTarget, setPendingTarget] = useState<{ requestId: number; target: string }>()

	const selectSettingsTarget = useCallback((target: string, requestId: number) => {
		const resolved = resolveSettingsTarget(target)
		if (!resolved) {
			return
		}
		if (resolved.tabId) {
			setActiveTab(resolved.tabId)
		}
		setPendingTarget({ requestId, target })
	}, [])

	const completeSettingsTarget = useCallback((requestId: number) => {
		setPendingTarget((current) => (current?.requestId === requestId ? undefined : current))
	}, [])

	const handleMessage = useCallback(
		(event: MessageEvent) => {
			const message: ExtensionMessage = event.data
			if (message.type !== "grpc_response") {
				return
			}
			const grpcMessage = message.grpc_response?.message
			if (grpcMessage?.key !== "scrollToSettings" || !grpcMessage.value) {
				return
			}
			selectSettingsTarget(grpcMessage.value, getNextSettingsNavigationRequestId())
		},
		[selectSettingsTarget],
	)

	useEvent("message", handleMessage)

	const handleResetState = useCallback(async (resetGlobalState?: boolean) => {
		try {
			await StateServiceClient.resetState(ResetStateRequest.create({ global: resetGlobalState }))
		} catch (error) {
			console.error("Failed to reset state:", error)
		}
	}, [])

	useEffect(() => {
		if (navigationRequest) {
			selectSettingsTarget(navigationRequest.target, navigationRequest.requestId)
		}
	}, [navigationRequest, selectSettingsTarget])

	const renderTabItem = useCallback(
		(tab: SettingsTab) => (
			<TabTrigger className="flex justify-baseline" data-testid={`tab-${tab.id}`} key={tab.id} value={tab.id}>
				<Tooltip>
					<TooltipTrigger>
						<div
							className={cn(
								"whitespace-nowrap overflow-hidden h-12 sm:py-3 box-border flex items-center border-l-2 border-transparent text-foreground opacity-70 bg-transparent hover:bg-list-hover p-4 cursor-pointer gap-2",
								{
									"opacity-100 border-l-2 border-l-foreground border-t-0 border-r-0 border-b-0 bg-selection":
										activeTab === tab.id,
								},
							)}>
							<tab.icon className="w-4 h-4" />
							<span className="hidden sm:block">{tab.name}</span>
						</div>
					</TooltipTrigger>
					<TooltipContent side="right">{tab.tooltipText}</TooltipContent>
				</Tooltip>
			</TabTrigger>
		),
		[activeTab],
	)

	const ActiveContent = useMemo(() => {
		const Component = tabContent[activeTab as SettingsTabID]
		if (!Component) {
			return null
		}
		const props: Record<string, unknown> = { renderSectionHeader }
		if (activeTab === "debug") {
			props.onResetState = handleResetState
		} else if (activeTab === "about") {
			props.version = version
			props.extensionVariant = extensionVariant
		} else if (activeTab === "api-config") {
			props.initialModelTab = settingsInitialModelTab
		}
		return <Component {...props} />
	}, [activeTab, extensionVariant, handleResetState, settingsInitialModelTab, tabContent, version])

	return (
		<Tab>
			<ViewHeader environment={environment} onDone={onDone} title="Settings" />
			<div className="flex flex-1 overflow-hidden">
				<TabList
					className="shrink-0 flex flex-col overflow-y-auto border-r border-sidebar-background"
					onValueChange={setActiveTab}
					value={activeTab}>
					{SETTINGS_TABS.filter((tab) => !tab.hidden?.()).map(renderTabItem)}
				</TabList>
				<TabContent className="flex-1 overflow-auto">
					{ActiveContent}
					{pendingTarget &&
						(() => {
							const resolved = resolveSettingsTarget(pendingTarget.target)
							return resolved?.elementId && (!resolved.tabId || resolved.tabId === activeTab) ? (
								<SettingsTargetHighlight
									key={pendingTarget.requestId}
									onComplete={completeSettingsTarget}
									requestId={pendingTarget.requestId}
									target={resolved}
								/>
							) : null
						})()}
				</TabContent>
			</div>
		</Tab>
	)
}

export default SettingsView
