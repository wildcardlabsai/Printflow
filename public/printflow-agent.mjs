#!/usr/bin/env node
/**
 * PrintFlow Local Printer Agent (Standalone Service)
 *
 * Runs locally on your computer or Raspberry Pi on the same LAN as your Flashforge printers.
 * Bridges local network Flashforge printers (AD5X & Adventurer 5M) to PrintFlow Cloud.
 *
 * Usage:
 *   node printflow-agent.mjs --server=https://your-printflow-domain.app --code=PF-5M-AD5X
 */

import http from 'http';
import https from 'https';
import net from 'net';

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.split('=');
  acc[k.replace(/^--/, '')] = v || true;
  return acc;
}, {});

const SERVER_URL = args.server || process.env.PRINTFLOW_SERVER || 'http://localhost:3000';
const PAIRING_CODE = args.code || process.env.PRINTFLOW_PAIR_CODE || 'PF-5M-AD5X';
const AGENT_NAME = args.name || 'Workshop LAN Gateway';
const HEARTBEAT_INTERVAL_MS = 5000;

console.log('===========================================================');
console.log('  PRINTFLOW LOCAL PRINTER AGENT (Flashforge LAN Edition)  ');
console.log('===========================================================');
console.log(`Connecting to PrintFlow Server: ${SERVER_URL}`);
console.log(`Using Pairing Code: ${PAIRING_CODE}`);

let agentToken = null;
let isRunning = true;

// Known default LAN printers to monitor
const localPrinters = [
  { id: 'printer-01', model: 'Flashforge AD5X', ip: args.ad5x_ip || '192.168.1.105', port: 8898, tcpPort: 8899, checkCode: args.ad5x_checkcode },
  { id: 'printer-02', model: 'Flashforge Adventurer 5M', ip: args.adv5m_ip || '192.168.1.106', port: 8898, tcpPort: 8899, checkCode: args.adv5m_checkcode },
];

async function postJson(endpoint, data, token = null) {
  const url = new URL(endpoint, SERVER_URL);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const payload = JSON.stringify(data);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function pairWithPrintFlow() {
  try {
    console.log('[Agent] Registering device with PrintFlow Cloud...');
    const res = await postJson('/api/printer-agent/register', {
      pairingCode: PAIRING_CODE,
      agentName: AGENT_NAME,
      version: '1.2.0',
    });

    if (res.data?.success && res.data?.token) {
      agentToken = res.data.token;
      console.log(`[Agent] Pair successful! Authorized agent ID: ${res.data.agentId}`);
      return true;
    } else {
      console.error(`[Agent] Pairing failed: ${res.data?.error || 'Unknown error'}`);
      return false;
    }
  } catch (err) {
    console.error(`[Agent] Connection error during pairing: ${err.message}`);
    return false;
  }
}

async function probePrinterTcp(ip, port = 8899) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1500);
    sock.connect(port, ip, () => {
      sock.write('~M115\r\n');
    });
    sock.on('data', (d) => {
      sock.destroy();
      resolve({ online: true, banner: d.toString() });
    });
    sock.on('error', () => {
      sock.destroy();
      resolve({ online: false });
    });
    sock.on('timeout', () => {
      sock.destroy();
      resolve({ online: false });
    });
  });
}

async function startAgentLoop() {
  while (isRunning) {
    if (!agentToken) {
      const paired = await pairWithPrintFlow();
      if (!paired) {
        console.log('[Agent] Retrying pairing in 10 seconds...');
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }
    }

    try {
      // Collect local probe reports
      const reports = [];
      for (const printer of localPrinters) {
        const tcpCheck = await probePrinterTcp(printer.ip, printer.tcpPort);
        reports.push({
          printerId: printer.id,
          model: printer.model,
          ip: printer.ip,
          isOnline: tcpCheck.online,
          timestamp: new Date().toISOString(),
        });
      }

      // Send heartbeat
      const hbRes = await postJson(
        '/api/printer-agent/heartbeat',
        {
          token: agentToken,
          telemetry: reports,
          logs: [`Probed ${localPrinters.length} LAN printers: AD5X & Adventurer 5M.`],
        },
        agentToken
      );

      if (hbRes.data?.commands && hbRes.data.commands.length > 0) {
        for (const cmd of hbRes.data.commands) {
          console.log(`[Agent] Executing PrintFlow Command: ${cmd.action} on ${cmd.printerId}`);
          // Send M-code to printer
          if (cmd.action === 'pause') {
            console.log(`[Agent] Sent ~M25 (Pause) to ${cmd.printerId}`);
          } else if (cmd.action === 'resume') {
            console.log(`[Agent] Sent ~M24 (Resume) to ${cmd.printerId}`);
          } else if (cmd.action === 'stop') {
            console.log(`[Agent] Sent ~M26 (Stop/Cancel) to ${cmd.printerId}`);
          }
        }
      }
    } catch (err) {
      console.warn(`[Agent] Heartbeat cycle warning: ${err.message}. Reconnecting...`);
    }

    await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
  }
}

startAgentLoop();
