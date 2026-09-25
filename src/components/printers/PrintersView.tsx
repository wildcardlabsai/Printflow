import React, { useState, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Printer, PrinterStatus, PrinterUtilisationStats, PrinterAuditEntry, ProductionJob } from '../../types';
import { PrinterStatusBadge, PrinterConnectionBadge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNotification } from '../../context/NotificationContext';
import { printersApi } from '../../lib/api/printers';
import { PrinterDiagnosticsModal } from './PrinterDiagnosticsModal';
import { SafetyConfirmModal } from './SafetyConfirmModal';
import { PrintFilesModal } from './PrintFilesModal';
import { PrinterAgentModal } from './PrinterAgentModal';
import { AutoPrintSettingsModal } from './AutoPrintSettingsModal';
import { SendToPrinterModal } from '../production/SendToPrinterModal';
import {
  Printer as PrinterIcon,
  Plus,
  Wifi,
  Thermometer,
  Layers,
  Clock,
  Camera,
  Play,
  Pause,
  Power,
  RefreshCw,
  FileCode,
  Server,
  Zap,
  Activity,
  Shield,
  BarChart3,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Disc,
} from 'lucide-react';

interface PrintersViewProps {
  onOpenPrinterModal: (printer?: Printer) => void;
  onNavigateToProduction: () => void;
}

export const PrintersView: React.FC<PrintersViewProps> = ({
  onOpenPrinterModal,
  onNavigateToProduction,
}) => {
  const { printers: contextPrinters, productionJobs, updatePrinterStatus, updateJobStatus } = useDatabase();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'monitor' | 'analytics' | 'smart_queue' | 'audit'>('monitor');
  const [printers, setPrinters] = useState<Printer[]>(contextPrinters);
  const [analytics, setAnalytics] = useState<PrinterUtilisationStats[]>([]);
  const [auditLogs, setAuditLogs] = useState<PrinterAuditEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [selectedPrinterForDiag, setSelectedPrinterForDiag] = useState<Printer | null>(null);
  const [stoppingPrinter, setStoppingPrinter] = useState<Printer | null>(null);
  const [showPrintFilesModal, setShowPrintFilesModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showAutoPrintModal, setShowAutoPrintModal] = useState(false);
  const [dispatchingJob, setDispatchingJob] = useState<ProductionJob | null>(null);

  // Camera toggle for AD5X
  const [showCameraStream, setShowCameraStream] = useState<Record<string, boolean>>({});

  const refreshTelemetry = async () => {
    try {
      setIsRefreshing(true);
      const updated = await printersApi.getPrinters();
      setPrinters(updated);
      const audit = await printersApi.getPrinterAudit();
      setAuditLogs(audit);
    } catch (err: any) {
      console.warn('Printer telemetry refresh note:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshTelemetry();
    printersApi.getAnalytics().then(setAnalytics).catch(console.warn);

    // Heartbeat auto-poll every 6 seconds for live temperatures and progress
    const timer = setInterval(() => {
      printersApi.getPrinters().then(setPrinters).catch(() => {});
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const handlePauseResume = async (printer: Printer) => {
    const isPrinting = printer.status === 'PRINTING';
    const action = isPrinting ? 'pause' : 'resume';
    try {
      await printersApi.controlPrinter(printer.id, action);
      showToast({
        type: 'info',
        title: isPrinting ? 'Print Paused' : 'Print Resumed',
        message: `${printer.name} command ~M${isPrinting ? '25' : '24'} acknowledged.`,
      });
      refreshTelemetry();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Command Failed', message: err.message });
    }
  };

  const handleExecuteStop = async () => {
    if (!stoppingPrinter) return;
    try {
      await printersApi.controlPrinter(stoppingPrinter.id, 'stop');
      showToast({
        type: 'warning',
        title: 'Print Stopped',
        message: `Command ~M26 executed. Hardware heaters on ${stoppingPrinter.name} turned off.`,
      });
      refreshTelemetry();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Stop Failed', message: err.message });
    } finally {
      setStoppingPrinter(null);
    }
  };

  const toggleCamera = (printerId: string) => {
    setShowCameraStream((prev) => ({ ...prev, [printerId]: !prev[printerId] }));
  };

  // Smart Queue Calculations
  const awaitingJobs = productionJobs.filter((j) => j.status === 'awaiting_print');

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-sky-400" />
            Flashforge Fleet & Production Automation
          </h2>
          <p className="text-xs text-slate-400">
            Real-time LAN telemetry, Flash Studio slicing profiles, and physical extruder control
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTelemetry}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Poll Fleet
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPrintFilesModal(true)}
            leftIcon={<FileCode className="w-3.5 h-3.5" />}
          >
            Print Files Library
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAgentModal(true)}
            leftIcon={<Server className="w-3.5 h-3.5" />}
          >
            LAN Gateway
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAutoPrintModal(true)}
            leftIcon={<Zap className="w-3.5 h-3.5" />}
          >
            Auto-Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenPrinterModal()}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Printer
          </Button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'monitor'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Live Fleet Monitor
        </button>

        <button
          onClick={() => setActiveTab('smart_queue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'smart_queue'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          Smart Queue ({awaitingJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Utilisation & Metrics
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Hardware Audit Trail
        </button>
      </div>

      {/* TAB 1: LIVE FLEET MONITOR */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {printers.map((printer) => {
            const telemetry = printer.telemetry;
            const isAD5X = printer.model.includes('AD5X');
            const isPrinting = printer.status === 'PRINTING';
            const progress = telemetry?.printProgressPercent ?? printer.progressPercentage ?? 0;
            const isCamOpen = showCameraStream[printer.id];

            return (
              <div
                key={printer.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 shrink-0">
                      <PrinterIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base leading-tight">{printer.name}</h3>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                          {printer.model}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>IP: {printer.ipAddress || '192.168.1.105'}:{printer.httpPort || 8898}</span>
                        <span>•</span>
                        <span className="capitalize">{printer.connectionMode?.replace('_', ' ') || 'LAN Direct'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <PrinterConnectionBadge status={printer.connectionStatus || 'Connected'} size="sm" />
                      <PrinterStatusBadge status={printer.status} size="sm" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Last seen: {printer.lastCommunication ? new Date(printer.lastCommunication).toLocaleTimeString() : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Live Temperature & Heater Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-rose-400" /> Extruder
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {telemetry ? `${telemetry.nozzleTemperature}°C` : '--'}
                      <span className="text-slate-500 font-normal text-[11px]">
                        {' '}/ {telemetry ? `${telemetry.targetNozzleTemperature}°C` : '0°C'}
                      </span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-400" /> Heated Bed
                    </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {telemetry ? `${telemetry.bedTemperature}°C` : '--'}
                      <span className="text-slate-500 font-normal text-[11px]">
                        {' '}/ {telemetry ? `${telemetry.targetBedTemperature}°C` : '0°C'}
                      </span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Print Speed</span>
                    <span className="font-mono text-sky-300 font-semibold">
                      {printer.capabilities?.highSpeed ? '600 mm/s' : '300 mm/s'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Build Chamber</span>
                    <span className="font-mono text-slate-300 font-semibold">
                      {isAD5X ? 'Enclosed Core' : 'Open Air Frame'}
                    </span>
                  </div>
                </div>

                {/* AD5X Multi-Color IFS Channels */}
                {isAD5X && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        Flashforge IFS (Integrated Filament System)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">4-Channel Multi-Material</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((ch) => (
                        <div
                          key={ch}
                          className="p-2 rounded border text-center text-[10px] border-slate-800/80 bg-slate-900/60 text-slate-400"
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-600 inline-block bg-slate-700" />
                            <span>Ch {ch}</span>
                          </div>
                          <div className="truncate font-mono">--</div>
                          <div className="text-[9px] text-slate-400 truncate">Empty</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adventurer 5M Note: Camera is optional add-on */}
                {!isAD5X && (
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Hardware Profile: Single extruder high-speed core. Build: 220×220×220mm.</span>
                    <span className="text-slate-500 italic">Optional USB Camera accessory</span>
                  </div>
                )}

                {/* Live Camera Feed Panel (AD5X built-in Port 8080) */}
                {isAD5X && printer.hasCamera && (
                  <div>
                    <button
                      onClick={() => toggleCamera(printer.id)}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 font-medium transition-colors mb-2"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      {isCamOpen ? 'Hide Live Camera Feed' : 'View Live Camera Stream (Port 8080)'}
                    </button>

                    {isCamOpen && (
                      <div className="rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video relative flex items-center justify-center">
                        {/* Stream / Simulated View */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
                        <div className="text-center space-y-1 z-10">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-pulse">
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="font-mono text-xs text-emerald-400 block font-semibold">
                            LIVE MJPEG STREAM — {printer.ipAddress}:8080
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Bed Leveling Matrix: Optimal • Build Chamber View
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Job & Progress */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current Print:</span>
                    <span className="font-mono text-sky-300 font-semibold truncate max-w-[220px]">
                      {telemetry?.currentJobName || printer.currentJobName || 'Idle — No active job'}
                    </span>
                  </div>

                  {isPrinting && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Progress: {progress}%</span>
                        <span>
                          {telemetry?.layerNumber
                            ? `Layer ${telemetry.layerNumber} / ${telemetry.totalLayers}`
                            : '--'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, progress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                        <span>Duration: {telemetry?.printDurationSeconds ? `${Math.floor(telemetry.printDurationSeconds / 60)} min` : '--'}</span>
                        <span>
                          Est. Remaining:{' '}
                          {telemetry?.estimatedTimeRemainingSeconds ? `${Math.floor(telemetry.estimatedTimeRemainingSeconds / 60)} min` : '--'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Control Actions Row */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPrinterForDiag(printer)}
                      leftIcon={<Activity className="w-3 h-3" />}
                    >
                      Diagnostics
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenPrinterModal(printer)}
                    >
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPrinting ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePauseResume(printer)}
                          leftIcon={<Pause className="w-3 h-3" />}
                        >
                          Pause
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setStoppingPrinter(printer)}
                          leftIcon={<Power className="w-3 h-3" />}
                        >
                          Stop Print
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          if (awaitingJobs[0]) {
                            setDispatchingJob(awaitingJobs[0]);
                          } else {
                            onNavigateToProduction();
                          }
                        }}
                        leftIcon={<Play className="w-3 h-3" />}
                      >
                        Assign Next Job
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SMART QUEUE */}
      {activeTab === 'smart_queue' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-sky-950/40 border border-sky-800 text-sky-200 text-xs flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-sky-100 text-sm">Smart Queue Optimizer</span>
              <p className="mt-0.5 text-sky-200/90 leading-relaxed">
                Smart Queue matches production jobs to the best printer based on multi-color requirements (AD5X IFS), build volume, urgency, and printer idle availability.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {awaitingJobs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                All production jobs are currently printed or in-progress! No pending jobs waiting in queue.
              </div>
            ) : (
              awaitingJobs.map((job) => {
                const suggestedPrinter = job.isMultiColor
                  ? printers.find((p) => p.model.includes('AD5X')) || printers[0]
                  : printers.find((p) => p.status === 'IDLE') || printers[1] || printers[0];

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sky-400 font-semibold">{job.orderInternalId}</span>
                        <span className="font-medium text-white text-sm">{job.productName}</span>
                        <PriorityBadge priority={job.priority} size="sm" />
                        {job.isMultiColor && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Multi-Color (AD5X IFS)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>Qty: {job.quantity}</span>
                        <span>•</span>
                        <span>Material: {job.material} ({job.color})</span>
                        <span>•</span>
                        <span>Est: {job.estimatedPrintTimeMinutes} min</span>
                      </div>

                      <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Recommended Dispatch: <strong>{suggestedPrinter.name}</strong> ({suggestedPrinter.status})</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setDispatchingJob(job)}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Dispatch to {suggestedPrinter.name}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UTILISATION & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analytics.map((stat) => (
              <div key={stat.printerId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm">{stat.printerName}</h3>
                  <span className="text-emerald-400 font-semibold font-mono">{stat.successRatePercent}% Success</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Print Hours Today</span>
                    <span className="text-white font-mono font-bold text-sm">{stat.todayPrintHours} hrs</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Past 7 Days</span>
                    <span className="text-white font-mono font-bold text-sm">{stat.sevenDaysPrintHours} hrs</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Past 30 Days</span>
                    <span className="text-white font-mono font-bold text-sm">{stat.thirtyDaysPrintHours} hrs</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Jobs Done</span>
                    <span className="font-semibold">{stat.completedJobsCount} prints</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Avg Print Time</span>
                    <span className="font-semibold">{Math.floor(stat.averagePrintTimeMinutes / 60)}h {stat.averagePrintTimeMinutes % 60}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Filament Used</span>
                    <span className="font-semibold font-mono">{stat.filamentUsedGrams}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Hardware Execution & Network Audit Trail</span>
            <Button variant="ghost" size="sm" onClick={refreshTelemetry} leftIcon={<RefreshCw className="w-3 h-3" />}>
              Refresh Logs
            </Button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 max-h-[460px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-slate-900 border border-slate-800/80 flex items-start justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="font-mono text-sky-300 text-[11px]">• {log.printerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Operator: <span className="text-slate-300">{log.user}</span>
                      {log.details && (
                        <span className="ml-2 font-mono text-[10px] text-slate-500">
                          {JSON.stringify(log.details)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <PrinterDiagnosticsModal
        printer={selectedPrinterForDiag}
        isOpen={Boolean(selectedPrinterForDiag)}
        onClose={() => setSelectedPrinterForDiag(null)}
      />

      <SafetyConfirmModal
        isOpen={Boolean(stoppingPrinter)}
        onClose={() => setStoppingPrinter(null)}
        onConfirm={handleExecuteStop}
        type="stop"
        printerName={stoppingPrinter?.name || 'Flashforge'}
        details={{ jobName: stoppingPrinter?.currentJobName || 'Active Print' }}
      />

      <PrintFilesModal
        isOpen={showPrintFilesModal}
        onClose={() => setShowPrintFilesModal(false)}
      />

      <PrinterAgentModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
      />

      <AutoPrintSettingsModal
        isOpen={showAutoPrintModal}
        onClose={() => setShowAutoPrintModal(false)}
        printers={printers}
      />

      <SendToPrinterModal
        job={dispatchingJob}
        isOpen={Boolean(dispatchingJob)}
        onClose={() => setDispatchingJob(null)}
        onJobDispatched={refreshTelemetry}
      />
    </div>
  );
};
