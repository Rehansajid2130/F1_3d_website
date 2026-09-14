import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    strictPort: true,
    host: true // Listen on all local IPv4/IPv6 addresses
  }
});
