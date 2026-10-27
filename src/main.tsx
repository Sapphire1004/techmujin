import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@seed-design/css/base.css";
import "./i18n";
import App from "./App";
import "./theme.css";
import "../tokens.css";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("アプリを表示する #root 要素が見つかりません。");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
