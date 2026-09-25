/**
 * Flashforge LAN Mode Communication Protocol Definitions
 * Based on official Flashforge documentation for AD5X & Adventurer 5M:
 * - Flash Studio Desktop / Orca-Flashforge LAN Only Mode
 * - Port 8898: HTTP REST monitoring endpoint (JSON, authenticated with CheckCode)
 * - Port 8899: TCP Control Socket (accepts G/M-codes: ~M115, ~M119, ~M105, ~M27, ~M25, ~M24, ~M26)
 * - Port 19000: UDP LAN Discovery Broadcast
 * - Port 8080: Built-in MJPEG Camera Stream (AD5X built-in, Adventurer 5M optional accessory)
 */

export const FLASHFORGE_PORTS = {
  HTTP_MONITOR: 8898,
  TCP_CONTROL: 8899,
  UDP_DISCOVERY: 19000,
  CAMERA_STREAM: 8080,
} as const;

export const FLASHFORGE_M_CODES = {
  GET_INFO: '~M115', // Printer info, machine name, firmware version, serial number
  GET_STATUS: '~M119', // Machine status and endstops
  GET_TEMP: '~M105', // Extruder and bed temperatures (e.g. T0:210.0 /215.0 B:60.0 /60.0)
  GET_PROGRESS: '~M27', // Current file print progress percentage and byte offsets
  PAUSE_PRINT: '~M25', // Pause current print execution
  RESUME_PRINT: '~M24', // Resume paused print execution
  STOP_PRINT: '~M26', // Abort and terminate print execution immediately
} as const;

export interface FlashforgeHttpStatusResponse {
  name?: string;
  type?: string;
  status: 'idle' | 'printing' | 'paused' | 'completed' | 'error' | 'ready';
  firmware?: string;
  checkCodeValid?: boolean;
  temp?: {
    nozzle: number;
    nozzleTarget: number;
    bed: number;
    bedTarget: number;
    chamber?: number;
  };
  job?: {
    file: string;
    progress: number; // 0 - 100
    duration: number; // seconds elapsed
    remaining: number; // seconds remaining
    layer?: number;
    totalLayers?: number;
  };
  ifs?: {
    supported: boolean;
    channels: Array<{
      channel: number;
      material: string;
      color: string;
      hex: string;
      inUse: boolean;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export function parseM105TemperatureString(raw: string): {
  nozzle: number;
  targetNozzle: number;
  bed: number;
  targetBed: number;
} {
  // Typical Flashforge response: "T0:210.4 /215.0 B:59.8 /60.0"
  let nozzle = 0;
  let targetNozzle = 0;
  let bed = 0;
  let targetBed = 0;

  const nozzleMatch = raw.match(/T0?:\s*([0-9.]+)\s*\/\s*([0-9.]+)/i);
  if (nozzleMatch) {
    nozzle = parseFloat(nozzleMatch[1]);
    targetNozzle = parseFloat(nozzleMatch[2]);
  }

  const bedMatch = raw.match(/B:\s*([0-9.]+)\s*\/\s*([0-9.]+)/i);
  if (bedMatch) {
    bed = parseFloat(bedMatch[1]);
    targetBed = parseFloat(bedMatch[2]);
  }

  return { nozzle, targetNozzle, bed, targetBed };
}
