import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppProviders } from "./state/AppProviders";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<AppProviders>
		<App />
	</AppProviders>,
);
