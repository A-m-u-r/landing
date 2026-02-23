// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  vite: {
    server: {
      allowedHosts: [
        "drossiest-unhailable-marianna.ngrok-free.dev",
      ],
    },
  },
  adapter: node({
    mode: 'standalone',
  }),
});
