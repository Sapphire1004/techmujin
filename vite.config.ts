import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { seedDesignPlugin } from "@seed-design/vite-plugin";

export default defineConfig({
  plugins: [react(), seedDesignPlugin({ colorMode: "light-only" })],
  optimizeDeps: {
    // 遅延読み込みのスキャナー用依存関係も起動時に準備します。
    include: ["@zxing/browser"],
  },
});
