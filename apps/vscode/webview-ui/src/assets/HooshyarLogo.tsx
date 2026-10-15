import { type SVGProps } from "react"

const HooshyarLogo = (props: SVGProps<SVGSVGElement>) => (
	<svg fill="none" height="50" role="img" viewBox="0 0 128 128" width="50" xmlns="http://www.w3.org/2000/svg" {...props}>
		<title>Hooshyar</title>
		<path
			d="M20 24C20 15.163 27.163 8 36 8H92C100.837 8 108 15.163 108 24V76C108 84.837 100.837 92 92 92H59L36 112V92C27.163 92 20 84.837 20 76V24Z"
			fill="currentColor"
		/>
		<path
			d="M42 36V64M42 50H70M70 36V64M88 36L104 50L88 64"
			stroke="var(--vscode-editor-background)"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="9"
		/>
	</svg>
)

export default HooshyarLogo
