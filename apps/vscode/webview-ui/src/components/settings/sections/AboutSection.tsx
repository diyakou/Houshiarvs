import Section from "../Section"

interface AboutSectionProps {
	version: string
	extensionVariant?: "legacy" | "next"
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const VARIANT_LABELS: Record<"legacy" | "next", string> = {
	legacy: "Legacy",
	next: "Next",
}

const AboutSection = ({ version, extensionVariant, renderSectionHeader }: AboutSectionProps) => (
	<div>
		{renderSectionHeader("about")}
		<Section>
			<div className="flex px-4 flex-col gap-2">
				<h2 className="text-lg font-semibold">
					Hooshyar v{version}
					{extensionVariant && (
						<span className="ml-2 text-sm font-normal text-description">({VARIANT_LABELS[extensionVariant]})</span>
					)}
				</h2>
				<p>
					An AI assistant that can use your CLI and editor to handle software development tasks step-by-step, with your
					approval for every action.
				</p>
				<p className="text-sm text-(--vscode-descriptionForeground)">Distributed under the Apache-2.0 license.</p>
			</div>
		</Section>
	</div>
)

export default AboutSection
