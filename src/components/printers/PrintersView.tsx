import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Printer, ProductionJob } from '../../types';
import { PrinterStatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNotification } from '../../context/NotificationContext';
import { PrinterDiagnosticsModal } from './PrinterDiagnosticsModal';
import { PrinterFormModal } from './PrinterFormModal';
import {
  Printer as PrinterIcon,
  Plus,
  Clock,
  Play,
  Activity,
  Box,
} from 'lucide-react';

interface PrintersViewProps {
  onOpenPrinterModal: (printer?: Printer) => void;
  onNavigateToProduction: () => void;
}

export const PrintersView: React.FC<PrintersViewProps> = ({
  onOpenPrinterModal,
  onNavigateToProduction,
}) => {
  const { printers: contextPrinters, productionJobs } = useDatabase();
  const { showToast } = useNotification();

  const [selectedPrinterForDiag, setSelectedPrinterForDiag] = useState<Printer | null>(null);

  const awaitingJobs = productionJobs.filter((j) => j.status === 'awaiting_print');

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-sky-400" />
            3D Printers
          </h2>
          <p className="text-xs text-slate-400">
            Manage your printer fleet, view status, and configure settings
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenPrinterModal()}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Printer
        </Button>
      </div>

      {/* Printer Cards */}
      {contextPrinters.length === 0 ? (
        <div className="py-16 flex flex-col items-center text-center bg-slate-900 border border-slate-800 rounded-lg">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <PrinterIcon className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-300 font-medium mb-1">No printers configured</p>
          <p className="text-xs text-slate-500 mb-4 max-w-[280px]">
            Add your first 3D printer to start assigning production jobs and tracking print status.
          </p>
          <Button variant="primary" size="sm" onClick={() => onOpenPrinterModal()} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add First Printer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contextPrinters.map((printer) => {
            const isPrinting = printer.status === 'PRINTING';
            const isAD5X = printer.model.includes('AD5X');
            const progress = printer.progressPercentage ?? 0;

            return (
              <div
                key={printer.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 shrink-0">
                      <PrinterIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{printer.name}</h3>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{printer.model}</span>
                        <span>·</span>
                        <span>{printer.capabilities.buildVolume}</span>
                      </div>
                      {isAD5X && (
                        <span className="text-[10px] text-indigo-300 mt-1 inline-block">
                          IFS Multi-Material · Enclosed Core
                        </span>
                      )}
                      {!isAD5X && (
                        <span className="text-[10px] text-slate-500 mt-1 inline-block">
                          Single Extruder · Open Air Frame
                        </span>
                      )}
                    </div>
                  </div>

                  <PrinterStatusBadge status={printer.status} size="sm" />
                </div>

                {/* Active Print Progress */}
                {isPrinting && printer.currentJobName && (
                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-200 font-medium truncate max-w-[200px]">
                        {printer.currentJobName}
                      </span>
                      <span className="text-indigo-300 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, progress)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-indigo-300/80 flex items-center justify-between">
                      <span>
                        {printer.remainingMinutes ? `~${printer.remainingMinutes} min remaining` : 'Estimating...'}
                      </span>
                    </div>
                  </div>
                )}

                {!isPrinting && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Current Print:</span>
                    <span className="text-sky-300 font-medium">Idle — No active job</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
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

                  {!isPrinting && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (awaitingJobs.length > 0) {
                          onNavigateToProduction();
                        } else {
                          showToast({
                            type: 'info',
                            title: 'No Jobs Waiting',
                            message: 'Add orders to the production queue first.',
                          });
                        }
                      }}
                      leftIcon={<Play className="w-3 h-3" />}
                    >
                      Assign Next Job
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diagnostics Modal */}
      <PrinterDiagnosticsModal
        printer={selectedPrinterForDiag}
        isOpen={Boolean(selectedPrinterForDiag)}
        onClose={() => setSelectedPrinterForDiag(null)}
      />
    </div>
  );
};
