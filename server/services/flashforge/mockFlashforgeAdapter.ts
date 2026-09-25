import {
  LivePrinterTelemetry,
  PrinterConnectionStatus,
  PrinterStatus,
  FlashforgeIfsChannel,
} from '../../../src/types';

interface SimulatedPrinterState {
  printerId: string;
  name: string;
  model: 'Flashforge AD5X' | 'Flashforge Adventurer 5M';
  ipAddress: string;
  httpPort: number;
  tcpPort: number;
  connectionStatus: PrinterConnectionStatus;
  status: PrinterStatus;
  bedTemperature: number;
  targetBedTemperature: number;
  nozzleTemperature: number;
  targetNozzleTemperature: number;
  fanSpeedPercent: number;
  currentJobName?: string;
  printProgressPercent: number;
  printDurationSeconds: number;
  estimatedTimeRemainingSeconds: number;
  layerNumber: number;
  totalLayers: number;
  filamentUsedGrams: number;
  hasCamera: boolean;
  cameraStreamUrl?: string;
  firmwareVersion: string;
  checkCode: string;
  lastCommunication: string;
  lastError?: string;
  ifsChannels?: FlashforgeIfsChannel[];
  timerId?: NodeJS.Timeout;
}

export class MockFlashforgeAdapter {
  private static printers: Map<string, SimulatedPrinterState> = new Map();
  private static onJobCompletedCallback?: (printerId: string, jobName: string) => void;
  private static onJobFailedCallback?: (printerId: string, jobName: string, error: string) => void;

  public static initializeDefaults() {
    if (this.printers.size > 0) return;

    // 1. Flashforge AD5X (Multi-color IFS + Built-in camera)
    const ad5xState: SimulatedPrinterState = {
      printerId: 'printer-01',
      name: 'Flashforge AD5X',
      model: 'Flashforge AD5X',
      ipAddress: '192.168.1.105',
      httpPort: 8898,
      tcpPort: 8899,
      connectionStatus: 'Connected',
      status: 'IDLE',
      bedTemperature: 55,
      targetBedTemperature: 0,
      nozzleTemperature: 45,
      targetNozzleTemperature: 0,
      fanSpeedPercent: 0,
      printProgressPercent: 0,
      printDurationSeconds: 0,
      estimatedTimeRemainingSeconds: 0,
      layerNumber: 0,
      totalLayers: 0,
      filamentUsedGrams: 0,
      hasCamera: true,
      cameraStreamUrl: 'http://192.168.1.105:8080/?action=stream',
      firmwareVersion: 'v2.4.6-ad5x-release',
      checkCode: '88492015',
      lastCommunication: new Date().toISOString(),
      ifsChannels: [
        { channel: 1, material: 'PLA', color: 'Black', hexColor: '#1e293b', remainingWeightG: 750, inUse: true },
        { channel: 2, material: 'PLA', color: 'White', hexColor: '#f8fafc', remainingWeightG: 820, inUse: false },
        { channel: 3, material: 'PETG', color: 'Signal Orange', hexColor: '#f97316', remainingWeightG: 600, inUse: false },
        { channel: 4, material: 'Silk PLA', color: 'Crimson Red', hexColor: '#dc2626', remainingWeightG: 490, inUse: false },
      ],
    };

    // 2. Flashforge Adventurer 5M (Single extruder, high speed, optional camera)
    const adv5mState: SimulatedPrinterState = {
      printerId: 'printer-02',
      name: 'Flashforge Adventurer 5M',
      model: 'Flashforge Adventurer 5M',
      ipAddress: '192.168.1.106',
      httpPort: 8898,
      tcpPort: 8899,
      connectionStatus: 'Connected',
      status: 'IDLE',
      bedTemperature: 50,
      targetBedTemperature: 0,
      nozzleTemperature: 40,
      targetNozzleTemperature: 0,
      fanSpeedPercent: 0,
      printProgressPercent: 0,
      printDurationSeconds: 0,
      estimatedTimeRemainingSeconds: 0,
      layerNumber: 0,
      totalLayers: 0,
      filamentUsedGrams: 0,
      hasCamera: false, // Adventurer 5M doesn't have camera built-in by default
      firmwareVersion: 'v2.3.8-adv5m-release',
      checkCode: '49201948',
      lastCommunication: new Date().toISOString(),
    };

    this.printers.set('printer-01', ad5xState);
    this.printers.set('printer-02', adv5mState);
  }

  public static setCallbacks(
    onCompleted: (printerId: string, jobName: string) => void,
    onFailed: (printerId: string, jobName: string, error: string) => void
  ) {
    this.onJobCompletedCallback = onCompleted;
    this.onJobFailedCallback = onFailed;
  }

  public static getTelemetry(printerId: string): LivePrinterTelemetry {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) {
      return {
        printerId,
        connectionStatus: 'Disconnected',
        bedTemperature: 0,
        targetBedTemperature: 0,
        nozzleTemperature: 0,
        targetNozzleTemperature: 0,
        printProgressPercent: 0,
        printDurationSeconds: 0,
        estimatedTimeRemainingSeconds: 0,
        hasCamera: false,
        httpPort: 8898,
        tcpPort: 8899,
        checkCodeConfigured: false,
        connectionMode: 'mock_simulation',
        lastError: 'Printer not registered in simulation adapter',
      };
    }

    return {
      printerId: p.printerId,
      connectionStatus: p.connectionStatus,
      bedTemperature: p.bedTemperature,
      targetBedTemperature: p.targetBedTemperature,
      nozzleTemperature: p.nozzleTemperature,
      targetNozzleTemperature: p.targetNozzleTemperature,
      fanSpeedPercent: p.fanSpeedPercent,
      currentJobName: p.currentJobName,
      printProgressPercent: p.printProgressPercent,
      printDurationSeconds: p.printDurationSeconds,
      estimatedTimeRemainingSeconds: p.estimatedTimeRemainingSeconds,
      layerNumber: p.layerNumber,
      totalLayers: p.totalLayers,
      filamentUsedGrams: p.filamentUsedGrams,
      cameraStreamUrl: p.cameraStreamUrl,
      hasCamera: p.hasCamera,
      firmwareVersion: p.firmwareVersion,
      ipAddress: p.ipAddress,
      httpPort: p.httpPort,
      tcpPort: p.tcpPort,
      checkCodeConfigured: Boolean(p.checkCode),
      connectionMode: 'mock_simulation',
      lastCommunication: p.lastCommunication,
      lastError: p.lastError,
      ifsChannels: p.ifsChannels,
    };
  }

  public static startPrint(
    printerId: string,
    jobName: string,
    targetNozzle: number = 215,
    targetBed: number = 60,
    totalDurationSeconds: number = 3600,
    totalLayers: number = 320
  ): { success: boolean; error?: string } {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) return { success: false, error: 'Printer not found' };

    if (p.status === 'PRINTING') {
      return { success: false, error: 'Printer is already executing a print job.' };
    }

    if (p.connectionStatus !== 'Connected') {
      return { success: false, error: `Printer is ${p.connectionStatus}. Cannot start physical print.` };
    }

    p.status = 'PRINTING';
    p.currentJobName = jobName;
    p.targetNozzleTemperature = targetNozzle;
    p.targetBedTemperature = targetBed;
    p.printProgressPercent = 1;
    p.printDurationSeconds = 0;
    p.estimatedTimeRemainingSeconds = totalDurationSeconds;
    p.totalLayers = totalLayers;
    p.layerNumber = 1;
    p.fanSpeedPercent = 100;
    p.lastCommunication = new Date().toISOString();

    // Start simulation ticker
    if (p.timerId) clearInterval(p.timerId);

    p.timerId = setInterval(() => {
      if (p.status !== 'PRINTING') return;

      // Realistic temperature rise
      if (p.nozzleTemperature < p.targetNozzleTemperature) {
        p.nozzleTemperature = Math.min(p.targetNozzleTemperature, p.nozzleTemperature + 15);
      }
      if (p.bedTemperature < p.targetBedTemperature) {
        p.bedTemperature = Math.min(p.targetBedTemperature, p.bedTemperature + 4);
      }

      // Once up to temperature, progress increases
      if (p.nozzleTemperature >= p.targetNozzleTemperature - 5) {
        p.printDurationSeconds += 10;
        p.estimatedTimeRemainingSeconds = Math.max(0, p.estimatedTimeRemainingSeconds - 10);
        p.printProgressPercent = Math.min(100, p.printProgressPercent + 3);
        p.layerNumber = Math.min(p.totalLayers, Math.floor((p.printProgressPercent / 100) * p.totalLayers));
        p.filamentUsedGrams = Math.round((p.printProgressPercent / 100) * 45);
        p.lastCommunication = new Date().toISOString();

        // Check if finished
        if (p.printProgressPercent >= 100) {
          clearInterval(p.timerId);
          p.timerId = undefined;
          p.status = 'IDLE';
          p.targetNozzleTemperature = 0;
          p.targetBedTemperature = 0;
          p.fanSpeedPercent = 0;
          const finishedJob = p.currentJobName || jobName;
          p.currentJobName = undefined;

          console.log(`[Mock Printer Adapter] Job '${finishedJob}' completed on ${p.name}!`);
          if (this.onJobCompletedCallback) {
            this.onJobCompletedCallback(printerId, finishedJob);
          }
        }
      }
    }, 2500);

    return { success: true };
  }

  public static pausePrint(printerId: string): { success: boolean; error?: string } {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) return { success: false, error: 'Printer not found' };
    if (p.status !== 'PRINTING') return { success: false, error: 'Printer is not currently printing' };

    p.status = 'IDLE';
    p.fanSpeedPercent = 20;
    p.lastCommunication = new Date().toISOString();
    return { success: true };
  }

  public static resumePrint(printerId: string): { success: boolean; error?: string } {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) return { success: false, error: 'Printer not found' };
    if (!p.currentJobName) return { success: false, error: 'No paused job to resume' };

    p.status = 'PRINTING';
    p.fanSpeedPercent = 100;
    p.lastCommunication = new Date().toISOString();
    return { success: true };
  }

  public static stopPrint(printerId: string): { success: boolean; error?: string } {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) return { success: false, error: 'Printer not found' };

    if (p.timerId) {
      clearInterval(p.timerId);
      p.timerId = undefined;
    }

    const cancelledJob = p.currentJobName || 'Active Job';
    p.status = 'IDLE';
    p.targetNozzleTemperature = 0;
    p.targetBedTemperature = 0;
    p.fanSpeedPercent = 0;
    p.currentJobName = undefined;
    p.printProgressPercent = 0;
    p.lastCommunication = new Date().toISOString();

    console.log(`[Mock Printer Adapter] Job '${cancelledJob}' cancelled/stopped on ${p.name}`);
    return { success: true };
  }

  public static testConnection(printerId: string): {
    success: boolean;
    latencyMs: number;
    firmware: string;
    model: string;
    checkCodeValid: boolean;
    error?: string;
  } {
    this.initializeDefaults();
    const p = this.printers.get(printerId);
    if (!p) {
      return {
        success: false,
        latencyMs: 0,
        firmware: 'Unknown',
        model: 'Unknown',
        checkCodeValid: false,
        error: 'Printer ID not found',
      };
    }

    p.lastCommunication = new Date().toISOString();
    return {
      success: true,
      latencyMs: Math.floor(12 + Math.random() * 8),
      firmware: p.firmwareVersion,
      model: p.model,
      checkCodeValid: Boolean(p.checkCode),
    };
  }
}
