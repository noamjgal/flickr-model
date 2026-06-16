import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/flickr-model/" : "/",
  server: { port: 5173 },
}))
