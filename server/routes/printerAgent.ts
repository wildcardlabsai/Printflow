import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { PrinterAgentGateway } from '../services/flashforge/agentGateway';

const router = express.Router();

// 1. Status of registered agents
router.get('/status', (req: Request, res: Response) => {
  const agents = PrinterAgentGateway.getAgents();
  res.json({
    agents,
    totalAgents: agents.length,
    onlineAgents: agents.filter((a) => a.status === 'online').length,
  });
});

// 2. Generate a new pairing code
router.get('/pairing-code', (req: Request, res: Response) => {
  const code = PrinterAgentGateway.generatePairingCode();
  res.json({ code, expiresInSeconds: 900 });
});

// 3. Register device / agent
router.post('/register', (req: Request, res: Response) => {
  const { pairingCode, agentName, version } = req.body;

  if (!pairingCode) {
    return res.status(400).json({ error: 'Pairing code is required' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const result = PrinterAgentGateway.registerAgent(
    String(pairingCode).trim().toUpperCase(),
    agentName || 'Local Printer Gateway',
    String(clientIp),
    version || '1.2.0'
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// 4. Heartbeat & command polling
router.post('/heartbeat', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.replace('Bearer ', '') || req.body.token;

  if (!token) {
    return res.status(401).json({ error: 'Missing agent authorization token' });
  }

  const { telemetry = [], logs = [] } = req.body;
  const result = PrinterAgentGateway.processHeartbeat(token, telemetry, logs);

  if (!result.success) {
    return res.status(401).json(result);
  }

  res.json(result);
});

// 5. Download standalone script
router.get('/download-script', (req: Request, res: Response) => {
  const scriptPath = path.resolve(process.cwd(), 'public', 'printflow-agent.mjs');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="printflow-agent.mjs"');
    res.setHeader('Content-Type', 'application/javascript');
    fs.createReadStream(scriptPath).pipe(res);
  } else {
    res.status(404).send('Agent script not found');
  }
});

export default router;
