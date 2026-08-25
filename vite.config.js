import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (['ECONNRESET', 'EPIPE', 'ECONNREFUSED'].includes(err.code)) {
              return;
            }
            console.error('[proxy error]', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            socket.on('error', (err) => {
              if (['ECONNRESET', 'EPIPE', 'ECONNREFUSED'].includes(err.code)) {
                return;
              }
              console.error('[ws error]', err);
            });
          });
        },
      },
    },
  },
});
