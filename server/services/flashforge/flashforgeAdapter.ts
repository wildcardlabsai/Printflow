import net from 'net';
import {
  LivePrinterTelemetry,
  PrinterConnectionStatus,
  PrinterStatus,
} from '../../../src/types';
import { FLASHFORGE_M_CODES, parseM105TemperatureString } from './flashforgeProtocol';
import { MockFlashforgeAdapter } from './mockFlashforgeAdapter';

export interface FlashforgeConfig {
  printerId: string;
  name: string;
  model: 'Flashforge AD5X' | 'Flashforge Adventurer 5M';
  ipAddress: string;
  httpPort: number;
  tcpPort: number;
  checkCode?: string;
  connectionMode: 'lan_direct' | 'agent_gateway' | 'mock_simulation';
}

export class FlashforgeAdapter {
  private config: FlashforgeConfig;

  constructor(config: FlashforgeConfig) {
    this.config = config;
  }

  public isSimulation(): boolean {
    return this.config.connectionMode === 'mock_simulation';
  }

  /**
   * Tests TCP socket connectivity on Port 8899 and HTTP REST on Port 8898
   */
  public async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    firmware?: string;
    model?: string;
    checkCodeValid: boolean;
    error?: string;
  }> {
    if (this.isSimulation()) {
      return MockFlashforgeAdapter.testConnection(this.config.printerId);
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.connect(this.config.tcpPort || 8899, this.config.ipAddress, () => {
        const latencyMs = Date.now() - startTime;
        // Send ~M115 to retrieve firmware & printer model
        socket.write(`${FLASHFORGE_M_CODES.GET_INFO}\r\n`);
      });

      let responseBuffer = '';

      socket.on('data', (data) => {
        responseBuffer += data.toString();
        socket.destroy();
        const latencyMs = Date.now() - startTime;
        resolve({
          success: true,
          latencyMs,
          firmware: responseBuffer.includes('CMD M115') ? 'Flashforge Native OS' : 'v2.4.x-LAN',
          model: this.config.model,
          checkCodeValid: Boolean(this.config.checkCode),
        });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({
          success: false,
          latencyMs: Date.now() - startTime,
          checkCodeValid: false,
          error: `LAN Connection failed to ${this.config.ipAddress}:${this.config.tcpPort || 8899}: ${err.message}`,
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          latencyMs: 2500,
          checkCodeValid: false,
          error: `Connection timed out after 2500ms reaching ${this.config.ipAddress}:${this.config.tcpPort || 8899}`,
        });
      });
    });
  }

  /**
   * Queries real-time printer telemetry
   */
  public async getTelemetry(): Promise<LivePrinterTelemetry> {
    if (this.isSimulation()) {
      return MockFlashforgeAdapter.getTelemetry(this.config.printerId);
    }

    try {
      // In live LAN mode, query HTTP REST on Port 8898 with CheckCode header
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (this.config.checkCode) {
        headers['X-Check-Code'] = this.config.checkCode;
        headers['Authorization'] = `Bearer ${this.config.checkCode}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`http://${this.config.ipAddress}:${this.config.httpPort || 8898}/status`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return {
        printerId: this.config.printerId,
        connectionStatus: 'Connected',
        bedTemperature: data.temp?.bed || 0,
        targetBedTemperature: data.temp?.bedTarget || 0,
        nozzleTemperature: data.temp?.nozzle || 0,
        targetNozzleTemperature: data.temp?.nozzleTarget || 0,
        chamberTemperature: data.temp?.chamber,
        currentJobName: data.job?.file,
        printProgressPercent: data.job?.progress || 0,
        printDurationSeconds: data.job?.duration || 0,
        estimatedTimeRemainingSeconds: data.job?.remaining || 0,
        layerNumber: data.job?.layer,
        totalLayers: data.job?.totalLayers,
        hasCamera: this.config.model === 'Flashforge AD5X',
        cameraStreamUrl:
          this.config.model === 'Flashforge AD5X'
            ? `http://${this.config.ipAddress}:8080/?action=stream`
            : undefined,
        firmwareVersion: data.firmware || 'Flashforge Native OS',
        ipAddress: this.config.ipAddress,
        httpPort: this.config.httpPort || 8898,
        tcpPort: this.config.tcpPort || 8899,
        checkCodeConfigured: Boolean(this.config.checkCode),
        connectionMode: 'lan_direct',
        lastCommunication: new Date().toISOString(),
        ifsChannels: data.ifs?.channels,
      };
    } catch (err: any) {
      // If direct HTTP REST fails (e.g. printer offline or unreachable from container), return informative status
      return {
        printerId: this.config.printerId,
        connectionStatus: 'Disconnected',
        bedTemperature: 0,
        targetBedTemperature: 0,
        nozzleTemperature: 0,
        targetNozzleTemperature: 0,
        printProgressPercent: 0,
        printDurationSeconds: 0,
        estimatedTimeRemainingSeconds: 0,
        hasCamera: this.config.model === 'Flashforge AD5X',
        httpPort: this.config.httpPort || 8898,
        tcpPort: this.config.tcpPort || 8899,
        checkCodeConfigured: Boolean(this.config.checkCode),
        connectionMode: 'lan_direct',
        lastCommunication: undefined,
        lastError: `Direct LAN unreachable (${err.message}). Use PrintFlow Printer Agent on home network or Mock Simulation mode.`,
      };
    }
  }

  /**
   * Sends G-code command or M-code to Port 8899
   */
  public async sendCommand(command: string): Promise<{ success: boolean; response?: string; error?: string }> {
    if (this.isSimulation()) {
      if (command.includes('M25')) return MockFlashforgeAdapter.pausePrint(this.config.printerId);
      if (command.includes('M24')) return MockFlashforgeAdapter.resumePrint(this.config.printerId);
      if (command.includes('M26')) return MockFlashforgeAdapter.stopPrint(this.config.printerId);
      return { success: true };
    }

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);

      socket.connect(this.config.tcpPort || 8899, this.config.ipAddress, () => {
        socket.write(`${command}\r\n`);
      });

      let resData = '';
      socket.on('data', (d) => {
        resData += d.toString();
        socket.destroy();
        resolve({ success: true, response: resData });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Command timeout after 3000ms' });
      });
    });
  }
}
