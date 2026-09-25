import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATABASE_FILE = path.join(DATA_DIR, 'pokecraft_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseMasterStore {
  updatedAt: string;
  collections: {
    orders?: any[];
    products?: any[];
    customers?: any[];
    production_jobs?: any[];
    printers?: any[];
    filaments?: any[];
    settings?: any;
    shipping_records?: any[];
    status_history?: any[];
    audit_logs?: any[];
    [key: string]: any;
  };
}

function loadMasterDatabase(): DatabaseMasterStore {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      const content = fs.readFileSync(DATABASE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Server DB] Error reading database file:', err);
  }

  // Initial default store
  return {
    updatedAt: new Date().toISOString(),
    collections: {},
  };
}

function saveMasterDatabase(store: DatabaseMasterStore): void {
  try {
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[Server DB] Error writing database file:', err);
  }
}

// Active Server-Sent Event (SSE) clients for real-time live synchronization
interface ConnectedClient {
  id: string;
  res: Response;
  deviceInfo?: string;
}

let connectedClients: ConnectedClient[] = [];

function broadcastToClients(eventData: any, senderClientId?: string): void {
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  connectedClients = connectedClients.filter((client) => {
    // Optionally don't send echo back to sender if desired, but sending to all ensures state consensus
    try {
      client.res.write(message);
      return true;
    } catch (e) {
      return false;
    }
  });
}

// Keep-alive heartbeat every 20 seconds to prevent proxy / cloud timeout
setInterval(() => {
  broadcastToClients({ type: 'heartbeat', timestamp: new Date().toISOString() });
}, 20000);

/**
 * GET /api/database/state
 * Returns full current master database state
 */
router.get('/state', (req: Request, res: Response) => {
  const store = loadMasterDatabase();
  res.json({
    success: true,
    updatedAt: store.updatedAt,
    connectedDevices: connectedClients.length,
    collections: store.collections,
  });
});

/**
 * POST /api/database/sync
 * Syncs one or multiple collections from any device
 */
router.post('/sync', (req: Request, res: Response) => {
  const { collections, clientId, origin } = req.body;

  if (!collections || typeof collections !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid collections payload' });
  }

  const store = loadMasterDatabase();
  const updatedKeys: string[] = [];

  for (const [key, val] of Object.entries(collections)) {
    store.collections[key] = val;
    updatedKeys.push(key);
  }

  saveMasterDatabase(store);

  // Broadcast to all connected devices in real time!
  broadcastToClients(
    {
      type: 'db_update',
      updatedKeys,
      timestamp: store.updatedAt,
      senderClientId: clientId,
      origin: origin || 'client_update',
      collections,
    },
    clientId
  );

  res.json({
    success: true,
    updatedKeys,
    updatedAt: store.updatedAt,
    connectedDevices: connectedClients.length,
  });
});

/**
 * GET /api/database/stream
 * Server-Sent Events (SSE) stream for instant real-time live updates
 */
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  const clientId = (req.query.clientId as string) || 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  const client: ConnectedClient = {
    id: clientId,
    res,
    deviceInfo: req.headers['user-agent'] || 'unknown',
  };

  connectedClients.push(client);

  // Send initial handshake
  const store = loadMasterDatabase();
  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      clientId,
      updatedAt: store.updatedAt,
      totalConnectedDevices: connectedClients.length,
    })}\n\n`
  );

  req.on('close', () => {
    connectedClients = connectedClients.filter((c) => c.id !== clientId);
  });
});

/**
 * GET /api/database/status
 * Health & stats on live sync
 */
router.get('/status', (req: Request, res: Response) => {
  const store = loadMasterDatabase();
  res.json({
    status: 'online',
    mode: 'live_cloud_central',
    totalConnectedDevices: connectedClients.length,
    lastUpdatedAt: store.updatedAt,
    collectionKeys: Object.keys(store.collections),
  });
});

export default router;
