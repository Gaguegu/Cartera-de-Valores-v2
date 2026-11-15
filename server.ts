import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quotesMiddleware } from './src/server/quotesMiddleware.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // API routes for real-time stock quotes, FX rates, indices, and dividends
  app.use((req, res, next) => {
    void quotesMiddleware(req, res, next);
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const isDev =
    process.env.NODE_ENV !== 'production' &&
    (process.env.VITE_DEV === '1' || !fs.existsSync(distIndex));

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('version.json')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(distIndex);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Cartera Server] Running on http://0.0.0.0:${port} (mode: ${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch(err => {
  console.error('[Cartera Server] Fatal startup error:', err);
  process.exit(1);
});
