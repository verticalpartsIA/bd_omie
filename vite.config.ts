import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    ...(command === "build" ? [cloudflare()] : []),
  ],
  server: {
    port: Number(process.env.PORT) || 3001,
    strictPort: false,
    host: true,
  },
}));
