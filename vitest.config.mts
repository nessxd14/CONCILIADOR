import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "**/*.local/**"],
    // Las pruebas nunca deben alcanzar el Supabase de producción.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
    setupFiles: ["./test/sinProduccion.ts"],
  },
});
