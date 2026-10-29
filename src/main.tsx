import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { BriefProvider } from "./state/BriefContext";
import { ShortlistProvider } from "./state/ShortlistContext";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <BriefProvider>
        <ShortlistProvider>
          <App />
        </ShortlistProvider>
      </BriefProvider>
    </BrowserRouter>
  </StrictMode>,
);
