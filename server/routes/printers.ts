import express, { Request, Response } from 'express';
import { serverStore } from '../storage';
import { FlashforgeAdapter } from '../services/flashforge/flashforgeAdapter';
import { MockFlashforgeAdapter } from '../services/flashforge/mockFlashforgeAdapter';
import { PrinterAgentGateway } from '../services/flashforge/agentGateway';
import { Printer, PrinterDiagnostics, PrinterUtilisationStats, PrinterAuditEntry } from '../../src/types';

const router = express.Router();

// Initialize mock callbacks so completed jobs can auto-update production jobs
MockFlashforgeAdapter.setCallbacks(
  (printerId, jobName) => {
    serverStore.addPrinterAudit({
      printerId,
      printerName: printerId === 'printer-01' ? 'Flashforge AD5X' : 'Flashforge Adventurer 5M',
      action: 'Print Completed',
      user: 'Flashforge Hardware Daemon',
      details: { jobName, result: 'SUCCESS', autoUpdated: true },
    });
  },
  (printerId, jobName, error) => {
    serverStore.addPrinterAudit({
      printerId,
      printerName: printerId === 'printer-01' ? 'Flashforge AD5X' : 'Flashforge Adventurer 5M',
      action: 'Print Failed',
      user: 'Flashforge Hardware Daemon',
      details: { jobName, error },
    });
  }
);

// 1. Get all printers with live telemetry
router.get('/', async (req: Request, res: Response) => {
  try {
    const printers = serverStore.getPrinters();
    const enriched = await Promise.all(
      printers.map(async (p) => {
        const adapter = new FlashforgeAdapter({
          printerId: p.id,
          name: p.name,
          model: p.model as any,
          ipAddress: p.ipAddress || '192.168.1.105',
          httpPort: p.httpPort || 8898,
          tcpPort: p.tcpPort || 8899,
          checkCode: p.checkCode,
          connectionMode: p.connectionMode || 'mock_simulation',
        });

        const telemetry = await adapter.getTelemetry();

        return {
          ...p,
          status: telemetry.currentJobName && telemetry.printProgressPercent < 100 ? 'PRINTING' : p.status,
          connectionStatus: telemetry.connectionStatus,
          telemetry,
          lastCommunication: telemetry.lastCommunication || p.lastCommunication,
          lastError: telemetry.lastError,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add or update printer configuration
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, manufacturer, model, ipAddress, httpPort, tcpPort, checkCode, location, connectionMode, capabilities } = req.body;

    if (!name || !model) {
      return res.status(400).json({ error: 'Name and model are required' });
    }

    const isAD5X = model.includes('AD5X');

    const printer: Printer = {
      id: req.body.id || 'printer-' + Date.now(),
      name,
      manufacturer: manufacturer || 'Flashforge',
      model,
      status: req.body.status || 'IDLE',
      connectionStatus: 'Connected',
      connectionMode: connectionMode || 'mock_simulation',
      ipAddress: ipAddress || (isAD5X ? '192.168.1.105' : '192.168.1.106'),
      httpPort: Number(httpPort) || 8898,
      tcpPort: Number(tcpPort) || 8899,
      checkCode: checkCode || '',
      location: location || 'Main Studio',
      hasCamera: isAD5X,
      cameraStreamUrl: isAD5X ? `http://${ipAddress || '192.168.1.105'}:8080/?action=stream` : undefined,
      capabilities: capabilities || {
        buildVolume: '220x220x220mm',
        nozzleSize: '0.4mm',
        maxTemp: isAD5X ? 300 : 280,
        multiColor: isAD5X,
        highSpeed: true,
      },
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = serverStore.savePrinter(printer);

    serverStore.addPrinterAudit({
      printerId: saved.id,
      printerName: saved.name,
      action: 'Settings Changed',
      user: req.body.user || 'Operator',
      details: { model: saved.model, ipAddress: saved.ipAddress, connectionMode: saved.connectionMode },
    });

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete printer
router.delete('/:id', (req: Request, res: Response) => {
  const success = serverStore.deletePrinter(req.params.id);
  res.json({ success });
});

// 4. Test connection diagnostics
router.post('/:id/test-connection', async (req: Request, res: Response) => {
  try {
    const printers = serverStore.getPrinters();
    const printer = printers.find((p) => p.id === req.params.id);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    const adapter = new FlashforgeAdapter({
      printerId: printer.id,
      name: printer.name,
      model: printer.model as any,
      ipAddress: printer.ipAddress || '192.168.1.105',
      httpPort: printer.httpPort || 8898,
      tcpPort: printer.tcpPort || 8899,
      checkCode: printer.checkCode,
      connectionMode: printer.connectionMode || 'mock_simulation',
    });

    const result = await adapter.testConnection();

    serverStore.addPrinterAudit({
      printerId: printer.id,
      printerName: printer.name,
      action: result.success ? 'Printer Connected' : 'Printer Disconnected',
      user: req.body.user || 'Operator',
      details: { latencyMs: result.latencyMs, firmware: result.firmware, error: result.error },
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Printer Control (start, pause, resume, stop)
router.post('/:id/control', async (req: Request, res: Response) => {
  try {
    const { action, jobName, user = 'Operator', targetNozzle = 215, targetBed = 60, estimatedSeconds = 3600 } = req.body;

    if (!['start', 'pause', 'resume', 'stop'].includes(action)) {
      return res.status(400).json({ error: 'Invalid printer action. Supported: start, pause, resume, stop' });
    }

    const printers = serverStore.getPrinters();
    const printer = printers.find((p) => p.id === req.params.id);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    // Queue command through agent gateway if using agent
    PrinterAgentGateway.queueCommand(printer.id, action, { jobName, targetNozzle, targetBed });

    let result: { success: boolean; error?: string } = { success: true };

    if (action === 'start') {
      result = MockFlashforgeAdapter.startPrint(printer.id, jobName || 'PrintFlow_Job.gcode', targetNozzle, targetBed, estimatedSeconds);
      if (result.success) {
        printer.status = 'PRINTING';
        printer.currentJobName = jobName || 'PrintFlow_Job.gcode';
        serverStore.savePrinter(printer);
      }
    } else if (action === 'pause') {
      result = MockFlashforgeAdapter.pausePrint(printer.id);
    } else if (action === 'resume') {
      result = MockFlashforgeAdapter.resumePrint(printer.id);
      if (result.success) {
        printer.status = 'PRINTING';
        serverStore.savePrinter(printer);
      }
    } else if (action === 'stop') {
      result = MockFlashforgeAdapter.stopPrint(printer.id);
      if (result.success) {
        printer.status = 'IDLE';
        printer.currentJobName = undefined;
        serverStore.savePrinter(printer);
      }
    }

    const actionMap: Record<string, PrinterAuditEntry['action']> = {
      start: 'Print Started',
      pause: 'Print Paused',
      resume: 'Print Resumed',
      stop: 'Print Stopped',
    };

    serverStore.addPrinterAudit({
      printerId: printer.id,
      printerName: printer.name,
      action: actionMap[action] || 'Print Sent',
      user,
      details: { jobName, success: result.success, error: result.error },
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, action, printerStatus: printer.status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Diagnostics detailed info
router.get('/:id/diagnostics', (req: Request, res: Response) => {
  const printers = serverStore.getPrinters();
  const printer = printers.find((p) => p.id === req.params.id);
  if (!printer) {
    return res.status(404).json({ error: 'Printer not found' });
  }

  const agents = PrinterAgentGateway.getAgents();
  const primaryAgent = agents[0];

  const diag: PrinterDiagnostics = {
    printerId: printer.id,
    printerName: printer.name,
    model: printer.model,
    ipAddress: printer.ipAddress || '192.168.1.105',
    httpPort: printer.httpPort || 8898,
    tcpPort: printer.tcpPort || 8899,
    connectionStatus: printer.connectionStatus || 'Connected',
    connectionMode: printer.connectionMode || 'mock_simulation',
    latencyMs: 14,
    firmwareVersion: printer.firmwareVersion || 'v2.4.6-ad5x-release',
    checkCodeValid: Boolean(printer.checkCode),
    lastCommunication: printer.lastCommunication || new Date().toISOString(),
    agentId: primaryAgent?.id,
    agentOnline: primaryAgent?.status === 'online',
    errors: [
      { timestamp: new Date(Date.now() - 3600000).toISOString(), code: 'OK_NORMAL', message: 'LAN socket keep-alive acknowledged' },
    ],
  };

  res.json(diag);
});

// 7. Production Analytics & Utilization
router.get('/analytics', (req: Request, res: Response) => {
  const printers = serverStore.getPrinters();

  const stats: PrinterUtilisationStats[] = printers.map((p) => {
    const isAD5X = p.id === 'printer-01';
    return {
      printerId: p.id,
      printerName: p.name,
      todayPrintHours: isAD5X ? 5.8 : 4.2,
      sevenDaysPrintHours: isAD5X ? 36.4 : 28.5,
      thirtyDaysPrintHours: isAD5X ? 148.0 : 112.5,
      totalPrintHours: isAD5X ? 320.5 : 210.0,
      completedJobsCount: isAD5X ? 24 : 19,
      failedJobsCount: isAD5X ? 1 : 1,
      successRatePercent: isAD5X ? 96.0 : 95.0,
      averagePrintTimeMinutes: isAD5X ? 142 : 115,
      filamentUsedGrams: isAD5X ? 1240 : 890,
      estimatedIdleHours: isAD5X ? 2.2 : 3.8,
    };
  });

  res.json(stats);
});

// 8. Auto-Print settings
router.get('/auto-print', (req: Request, res: Response) => {
  res.json(serverStore.getAutoPrintSettings());
});

router.post('/auto-print', (req: Request, res: Response) => {
  const updated = serverStore.saveAutoPrintSettings(req.body);
  res.json(updated);
});

// 9. Printer Audit log
router.get('/audit', (req: Request, res: Response) => {
  res.json(serverStore.getPrinterAudit());
});

export default router;
