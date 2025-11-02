
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  // Import design tokens and theme variables first, then utilities
  import "./styles/globals.css";
  import "./index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  