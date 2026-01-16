import "@testing-library/jest-dom";
import { vi } from "vitest";

// Minimal DOMMatrix stub for pdfjs usage in components
if (typeof global.DOMMatrix === "undefined") {
  global.DOMMatrix = class {};
}

// Mock pdfjs to avoid heavy native requirements during tests
vi.mock("pdfjs-dist/build/pdf.mjs", () => ({
  getDocument: vi.fn(() => ({ promise: Promise.resolve({ numPages: 0 }) })),
  GlobalWorkerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "",
}));
