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
          const ignoreError = (err) => {
            if (!err) return true;
            return ['ECONNRESET', 'EPIPE', 'ECONNREFUSED', 'ETIMEDOUT'].includes(err.code);
          };

          proxy.on('error', (err, _req, _res) => {
            if (ignoreError(err)) return;
            console.error('[proxy error]', err);
          });

          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            proxyReq.on('error', (err) => {
              if (!ignoreError(err)) console.error('[ws req error]', err);
            });
            socket.on('error', (err) => {
              if (!ignoreError(err)) console.error('[ws socket error]', err);
            });
          });

          proxy.on('open', (proxySocket) => {
            proxySocket.on('error', (err) => {
              if (!ignoreError(err)) console.error('[ws proxySocket error]', err);
            });
          });

          proxy.on('proxySocket', (proxySocket) => {
            proxySocket.on('error', (err) => {
              if (!ignoreError(err)) console.error('[ws proxySocket error]', err);
            });
          });
        },
      },
    },
  },
});
