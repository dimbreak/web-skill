import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { webSkillVitePlugin } from 'web-skill/vite'
import { webSkills } from './src/web-skills.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    webSkillVitePlugin({
      generator: webSkills,
    }),
  ],
})
