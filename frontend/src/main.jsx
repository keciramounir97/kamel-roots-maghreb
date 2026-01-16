import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./admin/components/AuthContext";
import { TranslationProvider } from "./context/TranslationContext.jsx";

// Find root element
const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <TranslationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TranslationProvider>
      </BrowserRouter>
    </StrictMode>
  );
} else {
  console.error("Failed to find root element");
}
