import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
const base = process.env.PUBLIC_BASE_PATH || '/av-lore';
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://avpegnu.github.io',
  base,
  trailingSlash: 'always',
  output: 'static',
  integrations: [react()],
  vite: { build: { chunkSizeWarningLimit: 550 } },
});
