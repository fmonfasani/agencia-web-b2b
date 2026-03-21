import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "node_modules",
      "e2e/**/*",
      "dist/**/*",
      ".next/**/*",
      "mcp-servers/**/*",
      "agent-service/**/*",
      "auditor/**/*",
      "lead-system/**/*",
      "intelligence_engine/**/*",
      "**/*.d.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "mcp-servers/**",
        "agent-service/**",
        "**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
