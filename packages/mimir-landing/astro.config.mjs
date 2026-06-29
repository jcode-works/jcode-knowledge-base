import react from "@astrojs/react"
import sitemap from "@astrojs/sitemap"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

const siteUrl = process.env.PUBLIC_MIMIR_LANDING_URL ?? "https://mimir.jcode.works"

export default defineConfig({
  site: siteUrl,
  output: "static",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    envPrefix: ["PUBLIC_"],
    ssr: {
      noExternal: ["@jcode.labs/mimir-ui"],
    },
  },
})
