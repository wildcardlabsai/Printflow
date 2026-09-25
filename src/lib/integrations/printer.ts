import { PrinterStatus } from '../../types';

export interface PrinterTelemetry {
  printerId: string;
  status: PrinterStatus;
  bedTemperature: number;
  targetBedTemperature: number;
  nozzleTemperature: number;
  targetNozzleTemperature: number;
  currentLayer: number;
  totalLayers: number;
  progressPercent: number;
  remainingSeconds: number;
  filamentTypeLoaded?: string;
  filamentColorLoaded?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PrinterCommandResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PrinterIntegration {
  readonly model: string;
  readonly ipAddress: string;
  readonly phaseTarget: 3;

  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  pollTelemetry(): Promise<PrinterTelemetry>;
  uploadGcode(fileName: string, gcodeBuffer: Blob | ArrayBuffer): Promise<PrinterCommandResult>;
  startPrintJob(fileName: string): Promise<PrinterCommandResult>;
  pausePrintJob(): Promise<PrinterCommandResult>;
  resumePrintJob(): Promise<PrinterCommandResult>;
  cancelPrintJob(): Promise<PrinterCommandResult>;
}
