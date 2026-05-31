import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { webSkillVitePlugin } from 'web-skill/vite'
import { webSkills } from './src/web-skills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    webSkillVitePlugin({
      generator: webSkills,
    }),
  ],
})
