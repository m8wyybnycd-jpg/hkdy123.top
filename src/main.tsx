import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./sentry"; // Initialize Sentry before anything else
import App from "./App";
import "./index.css";

const container = document.getElementById("root")!;

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

// Use hydrateRoot if pre-rendered HTML exists (from react-snap),
// otherwise use createRoot for normal client-side rendering.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
