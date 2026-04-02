import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { webSkillVitePlugin } from "web-skill/vite";

import { webSkills } from "./src/web-skills.ts";

export default defineConfig({
  plugins: [
    react(),
    webSkillVitePlugin({
      generator: webSkills,
    }),
  ],
});
