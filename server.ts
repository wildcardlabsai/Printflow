import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import integrationsRouter from './server/routes/integrations';
import mappingsRouter from './server/routes/mappings';
import shippingRouter from './server/routes/shipping';
import webhooksRouter from './server/routes/webhooks';
import printersRouter from './server/routes/printers';
import printerAgentRouter from './server/routes/printerAgent';
import printFilesRouter from './server/routes/printFiles';
import { serverStore } from './server/storage';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers and cookie middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Server-side API routes
app.use('/api/integrations', integrationsRouter);
app.use('/api/mappings', mappingsRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/printers', printersRouter);
app.use('/api/printer-agent', printerAgentRouter);
app.use('/api/print-files', printFilesRouter);
app.use('/api/sync/logs', (req, res) => {
  res.json(serverStore.getSyncLogs());
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    phase: 2,
    service: 'PrintFlow Multichannel Sync Engine',
    timestamp: new Date().toISOString(),
  });
});

// Server-side scheduled periodic sync job (runs every 15 minutes if credentials exist)
const SYNC_INTERVAL_MS = 15 * 60 * 1000;
setInterval(async () => {
  const creds = serverStore.getCredentials();
  if (creds.etsy || creds.ebay) {
    console.log('[Server Background Sync] Checking scheduled marketplace sync...');
  }
}, SYNC_INTERVAL_MS);

// Vite / Static integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PrintFlow Phase 2 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PrintFlow server:', err);
  process.exit(1);
});
