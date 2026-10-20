import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeConfigDir = path.join(projectDir, 'runtime-config');
const runtimeConfigExampleDir = path.join(projectDir, 'runtime-config.example');

function runtimeConfigPlugin() {
  return {
    name: 'physics-lab-runtime-config',
    configureServer(server) {
      server.middlewares.use('/runtime-config', (request, response) => {
        const configDir = fs.existsSync(runtimeConfigDir) ? runtimeConfigDir : runtimeConfigExampleDir;
        const requestPath = new URL(request.url || '/', 'http://localhost').pathname;
        const root = path.resolve(configDir);
        const filePath = path.resolve(root, `.${requestPath}`);
        const relative = path.relative(root, filePath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          response.statusCode = 403;
          response.end('Forbidden');
          return;
        }
        fs.readFile(filePath, (error, data) => {
          if (error) {
            response.statusCode = 404;
            response.end('Runtime configuration file not found');
            return;
          }
          response.setHeader('Content-Type', path.extname(filePath) === '.json' ? 'application/json' : 'text/plain');
          response.end(data);
        });
      });
    },
  };
}

export default defineConfig({
  root: './client',
  plugins: [runtimeConfigPlugin()],
  server: {
    host: '0.0.0.0',
    hmr: true,
    allowedHosts: true,
    port: 3000,
    proxy: {
      '/message': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});

