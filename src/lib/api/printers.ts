import {
  Printer,
  LivePrinterTelemetry,
  PrintFile,
  PrinterAgentInfo,
  AutoPrintSettings,
  PrinterDiagnostics,
  PrinterUtilisationStats,
  PrinterAuditEntry,
} from '../../types';
import { db } from '../db';

export const printersApi = {
  /**
   * Fetch all printers with live telemetry from LAN / Agent / Simulation
   */
  async getPrinters(): Promise<Printer[]> {
    try {
      const res = await fetch('/api/printers');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      // Vercel / client fallback
    }
    return db.getPrinters();
  },

  /**
   * Add or update a printer configuration
   */
  async savePrinter(printer: Partial<Printer>): Promise<Printer> {
    try {
      const res = await fetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printer),
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      // Vercel / client fallback
    }
    return db.savePrinter(printer as Printer);
  },

  /**
   * Delete printer
   */
  async deletePrinter(id: string): Promise<boolean> {
    const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({ success: false }));
    return Boolean(data.success);
  },

  /**
   * Test connection diagnostics to Flashforge Port 8899 / 8898
   */
  async testConnection(printerId: string): Promise<{
    success: boolean;
    latencyMs: number;
    firmware?: string;
    model?: string;
    checkCodeValid: boolean;
    error?: string;
  }> {
    const res = await fetch(`/api/printers/${printerId}/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'Operator' }),
    });
    return res.json();
  },

  /**
   * Control printer: start, pause (~M25), resume (~M24), stop (~M26)
   */
  async controlPrinter(
    printerId: string,
    action: 'start' | 'pause' | 'resume' | 'stop',
    options?: {
      jobName?: string;
      targetNozzle?: number;
      targetBed?: number;
      estimatedSeconds?: number;
      user?: string;
    }
  ): Promise<{ success: boolean; action: string; error?: string }> {
    const res = await fetch(`/api/printers/${printerId}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        jobName: options?.jobName,
        targetNozzle: options?.targetNozzle,
        targetBed: options?.targetBed,
        estimatedSeconds: options?.estimatedSeconds,
        user: options?.user || 'Operator',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Failed to execute ${action} on printer`);
    }
    return data;
  },

  /**
   * Detailed diagnostics report
   */
  async getDiagnostics(printerId: string): Promise<PrinterDiagnostics> {
    const res = await fetch(`/api/printers/${printerId}/diagnostics`);
    if (!res.ok) throw new Error('Failed to fetch diagnostics');
    return res.json();
  },

  /**
   * Production Analytics & Utilization
   */
  async getAnalytics(): Promise<PrinterUtilisationStats[]> {
    const res = await fetch('/api/printers/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  /**
   * Auto-Print settings
   */
  async getAutoPrintSettings(): Promise<AutoPrintSettings> {
    const res = await fetch('/api/printers/auto-print');
    if (!res.ok) throw new Error('Failed to fetch auto-print settings');
    return res.json();
  },

  async saveAutoPrintSettings(settings: AutoPrintSettings): Promise<AutoPrintSettings> {
    const res = await fetch('/api/printers/auto-print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to save auto-print settings');
    return res.json();
  },

  /**
   * Printer Audit log
   */
  async getPrinterAudit(): Promise<PrinterAuditEntry[]> {
    const res = await fetch('/api/printers/audit');
    if (!res.ok) throw new Error('Failed to fetch printer audit log');
    return res.json();
  },

  /**
   * Print Files Library
   */
  async getPrintFiles(): Promise<PrintFile[]> {
    const res = await fetch('/api/print-files');
    if (!res.ok) throw new Error('Failed to fetch print files');
    return res.json();
  },

  async uploadPrintFile(fileData: Partial<PrintFile>): Promise<PrintFile> {
    const res = await fetch('/api/print-files/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Failed to upload print file');
    }
    return res.json();
  },

  async deletePrintFile(id: string): Promise<boolean> {
    const res = await fetch(`/api/print-files/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({ success: false }));
    return Boolean(data.success);
  },

  /**
   * Local Printer Agent Gateway
   */
  async getAgentStatus(): Promise<{ agents: PrinterAgentInfo[]; totalAgents: number; onlineAgents: number }> {
    const res = await fetch('/api/printer-agent/status');
    if (!res.ok) throw new Error('Failed to fetch agent status');
    return res.json();
  },

  async getPairingCode(): Promise<{ code: string; expiresInSeconds: number }> {
    const res = await fetch('/api/printer-agent/pairing-code');
    if (!res.ok) throw new Error('Failed to generate pairing code');
    return res.json();
  },
};
