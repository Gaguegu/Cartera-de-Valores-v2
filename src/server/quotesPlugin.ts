import type { Plugin } from 'vite';
import { quotesMiddleware } from './quotesMiddleware.ts';

export function quotesApiPlugin(): Plugin {
  return {
    name: 'quotes-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void quotesMiddleware(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void quotesMiddleware(req, res, next);
      });
    },
  };
}
