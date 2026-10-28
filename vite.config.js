import { defineConfig } from 'vite';

export default defineConfig({
  // root: 'C:/wamp64/www/Clepces/projects/batt-studio',
  server: {
    port: 3001,
    open: true,
    strictPort: true,
    host: 'batt-studio.clepces.local',
    cors: true

  },
  base: '/', // para que funcione con el subdominio
});
