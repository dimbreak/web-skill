import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import "./index.css";
import { webSkills } from "./web-skills.ts";

if (typeof window !== "undefined") {
  webSkills.install(window);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
