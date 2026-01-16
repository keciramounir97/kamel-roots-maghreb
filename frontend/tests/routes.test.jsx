import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "../src/App.jsx";
import { AuthProvider } from "../src/admin/components/AuthContext";
import { TranslationProvider } from "../src/context/TranslationContext.jsx";

const renderApp = () =>
  render(
    <BrowserRouter>
      <TranslationProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TranslationProvider>
    </BrowserRouter>
  );

describe("App routes", () => {
  test("renders app without crashing and shows layout shell", () => {
    renderApp();
    const nav = screen.getAllByRole("navigation");
    expect(nav.length).toBeGreaterThan(0);
  });
});
