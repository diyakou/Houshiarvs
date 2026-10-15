import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./main.css"
import "./index.css"
import App from "./App.tsx"
import ChatErrorBoundary from "./components/chat/ChatErrorBoundary"

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ChatErrorBoundary errorTitle="Error loading Hooshyar">
			<App />
		</ChatErrorBoundary>
	</StrictMode>,
)
