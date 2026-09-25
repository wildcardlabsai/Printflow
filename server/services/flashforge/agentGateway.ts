import crypto from 'crypto';
import { PrinterAgentInfo } from '../../../src/types';

interface PendingCommand {
  id: string;
  printerId: string;
  action: 'start' | 'pause' | 'resume' | 'stop';
  payload?: any;
  createdAt: number;
}

export class PrinterAgentGateway {
  private static agents: Map<string, PrinterAgentInfo> = new Map();
  private static pairingCodes: Map<string, { code: string; createdAt: number }> = new Map();
  private static commandQueues: Map<string, PendingCommand[]> = new Map(); // agentId -> commands[]

  public static initializeDefaults() {
    if (this.agents.size > 0) return;

    // Default registered agent for local workstation
    this.agents.set('agent-local-01', {
      id: 'agent-local-01',
      name: 'Workshop LAN Gateway (Raspberry Pi / PC)',
      pairingCode: 'PF-5M-AD5X',
      token: 'tok-pflow-lan-agent-2026',
      status: 'online',
      version: '1.2.0',
      ipAddress: '192.168.1.50',
      lastHeartbeat: new Date().toISOString(),
      connectedPrintersCount: 2,
      recentLogs: [
        { timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', message: 'Agent connected to Flashforge AD5X on 192.168.1.105:8898' },
        { timestamp: new Date(Date.now() - 45000).toISOString(), level: 'info', message: 'Agent connected to Flashforge Adventurer 5M on 192.168.1.106:8898' },
        { timestamp: new Date().toISOString(), level: 'info', message: 'Heartbeat stream active. Zero latency.' },
      ],
    });
  }

  public static getAgents(): PrinterAgentInfo[] {
    this.initializeDefaults();
    const now = Date.now();
    // Heartbeat check: if last seen > 45 seconds ago, mark offline
    return Array.from(this.agents.values()).map((agent) => {
      const diff = now - new Date(agent.lastHeartbeat).getTime();
      return {
        ...agent,
        status: diff > 45000 ? 'offline' : 'online',
      };
    });
  }

  public static generatePairingCode(): string {
    const code = 'PF-' + Math.floor(100000 + Math.random() * 900000);
    this.pairingCodes.set(code, { code, createdAt: Date.now() });
    return code;
  }

  public static registerAgent(
    pairingCode: string,
    agentName: string,
    ipAddress: string,
    version: string = '1.0.0'
  ): { success: boolean; token?: string; agentId?: string; error?: string } {
    this.initializeDefaults();

    // Check if pairing code exists or if it's the master default
    const valid = this.pairingCodes.has(pairingCode) || pairingCode === 'PF-5M-AD5X';
    if (!valid) {
      return { success: false, error: 'Invalid or expired pairing code. Please generate a new code in PrintFlow Settings.' };
    }

    this.pairingCodes.delete(pairingCode);

    const agentId = 'agent-' + Date.now();
    const token = 'pflow_agt_' + crypto.randomBytes(24).toString('hex');

    const agent: PrinterAgentInfo = {
      id: agentId,
      name: agentName || 'Local Printer Agent',
      pairingCode,
      token,
      status: 'online',
      version,
      ipAddress: ipAddress || '127.0.0.1',
      lastHeartbeat: new Date().toISOString(),
      connectedPrintersCount: 2,
      recentLogs: [
        { timestamp: new Date().toISOString(), level: 'info', message: `Agent paired successfully with PrintFlow Cloud.` },
      ],
    };

    this.agents.set(agentId, agent);
    return { success: true, token, agentId };
  }

  public static processHeartbeat(
    token: string,
    telemetryReports: any[],
    logs: string[] = []
  ): { success: boolean; commands: PendingCommand[]; error?: string } {
    this.initializeDefaults();

    let targetAgent: PrinterAgentInfo | undefined;
    for (const a of this.agents.values()) {
      if (a.token === token) {
        targetAgent = a;
        break;
      }
    }

    if (!targetAgent) {
      return { success: false, commands: [], error: 'Unauthorized agent token' };
    }

    targetAgent.lastHeartbeat = new Date().toISOString();
    targetAgent.status = 'online';

    if (logs.length > 0) {
      logs.forEach((log) => {
        targetAgent!.recentLogs.unshift({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: log,
        });
      });
      targetAgent.recentLogs = targetAgent.recentLogs.slice(0, 30);
    }

    // Retrieve pending commands for this agent
    const queue = this.commandQueues.get(targetAgent.id) || [];
    this.commandQueues.set(targetAgent.id, []);

    return { success: true, commands: queue };
  }

  public static queueCommand(
    printerId: string,
    action: 'start' | 'pause' | 'resume' | 'stop',
    payload?: any
  ): { success: boolean; commandId: string } {
    this.initializeDefaults();

    const commandId = 'cmd-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const cmd: PendingCommand = {
      id: commandId,
      printerId,
      action,
      payload,
      createdAt: Date.now(),
    };

    // Queue for the primary active agent
    const agent = Array.from(this.agents.values())[0];
    if (agent) {
      const q = this.commandQueues.get(agent.id) || [];
      q.push(cmd);
      this.commandQueues.set(agent.id, q);
    }

    return { success: true, commandId };
  }
}
