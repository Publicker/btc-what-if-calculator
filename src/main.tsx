import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

import App from "./App.tsx";
import "./index.css";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<MantineProvider>
			<Analytics />
			<SpeedInsights />
			<App />
		</MantineProvider>
	</StrictMode>,
);
