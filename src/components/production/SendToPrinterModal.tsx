import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ProductionJob, Printer, PrintFile } from '../../types';
import { printersApi } from '../../lib/api/printers';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { SafetyConfirmModal } from '../printers/SafetyConfirmModal';
import {
  Printer as PrinterIcon,
  FileCode,
  Clock,
  Disc,
  Layers,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface SendToPrinterModalProps {
  job: ProductionJob | null;
  isOpen: boolean;
  onClose: () => void;
  onJobDispatched?: () => void;
}

export const SendToPrinterModal: React.FC<SendToPrinterModalProps> = ({
  job,
  isOpen,
  onClose,
  onJobDispatched,
}) => {
  const { printers, updateJobStatus } = useDatabase();
  const { showToast } = useNotification();

  const [availableFiles, setAvailableFiles] = useState<PrintFile[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('printer-01');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      printersApi.getPrintFiles().then((files) => {
        setAvailableFiles(files);
        // Find best match file for this job's product or material
        if (job) {
          const match = files.find(
            (f) =>
              (job.productId && f.productId === job.productId) ||
              f.name.toLowerCase().includes(job.productName.toLowerCase())
          );
          if (match) {
            setSelectedFileId(match.id);
            if (match.targetPrinterModel.includes('AD5X')) setSelectedPrinterId('printer-01');
            else if (match.targetPrinterModel.includes('5M')) setSelectedPrinterId('printer-02');
          } else if (files[0]) {
            setSelectedFileId(files[0].id);
          }
        }
      }).catch(console.warn);
    }
  }, [isOpen, job?.id]);

  if (!isOpen || !job) return null;

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const selectedFile = availableFiles.find((f) => f.id === selectedFileId);

  // Check multi-color compatibility
  const isMultiColorJob = job.isMultiColor || (selectedFile && selectedFile.isMultiColor);
  const printerSupportsMultiColor = selectedPrinter?.capabilities?.multiColor;
  const compatibilityWarning =
    isMultiColorJob && !printerSupportsMultiColor
      ? 'Warning: This job requires multi-color printing (IFS). The Adventurer 5M is a single extruder machine; consider Flashforge AD5X instead.'
      : null;

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrinter) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a printer.' });
      return;
    }
    // Open safety confirmation prompt
    setShowSafetyConfirm(true);
  };

  const handleExecuteSend = async () => {
    if (!selectedPrinter) return;

    try {
      setIsSending(true);

      // Workflow transition: ASSIGNED -> READY -> SENDING -> QUEUED -> PRINTING
      updateJobStatus(job.id, 'assigned');
      await new Promise((r) => setTimeout(r, 400));
      updateJobStatus(job.id, 'sending');

      const jobFileName = selectedFile?.originalFileName || `${job.productName.replace(/\s+/g, '_')}.gcode`;

      // Call printer API control
      const res = await printersApi.controlPrinter(selectedPrinter.id, 'start', {
        jobName: jobFileName,
        targetNozzle: job.material === 'PETG' ? 240 : 215,
        targetBed: job.material === 'PETG' ? 70 : 60,
        estimatedSeconds: (selectedFile?.estimatedPrintTimeMinutes || job.estimatedPrintTimeMinutes || 60) * 60,
      });

      if (!res.success) throw new Error(res.error || 'Printer rejected start command');

      // Update production job to PRINTING
      updateJobStatus(job.id, 'printing');

      showToast({
        type: 'success',
        title: 'Print Dispatched!',
        message: `Job ${job.orderInternalId} successfully sent to ${selectedPrinter.name}. Extruder heating initiated.`,
      });

      if (onJobDispatched) onJobDispatched();
      onClose();
    } catch (err: any) {
      updateJobStatus(job.id, 'awaiting_print');
      showToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showSafetyConfirm}
        onClose={onClose}
        title={`Dispatch Job: ${job.orderInternalId}`}
        subtitle={`Product: ${job.productName} (Qty: ${job.quantity})`}
        maxWidth="lg"
      >
        <form onSubmit={handleInitiateSend} className="space-y-4 text-xs">
          {/* Compatibility Warning if any */}
          {compatibilityWarning && (
            <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{compatibilityWarning}</span>
            </div>
          )}

          {/* Select Target Printer */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
            <label className="font-semibold text-white block">
              1. Select Physical 3D Printer
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {printers.map((p) => {
                const isSelected = p.id === selectedPrinterId;
                const isBusy = p.status === 'PRINTING';

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPrinterId(p.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/40 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{p.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isBusy ? 'bg-indigo-950 text-indigo-300' : 'bg-emerald-950 text-emerald-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.model}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{p.capabilities.multiColor ? '4-Spool IFS' : 'Single Toolhead'}</span>
                      <span>•</span>
                      <span>Max {p.capabilities.maxTemp}°C</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Sliced File */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white">
                2. Select Pre-Sliced Print File (.gcode / .3mf)
              </label>
              <span className="text-[11px] text-slate-400">Flash Studio / Orca-Flashforge format</span>
            </div>

            {availableFiles.length === 0 ? (
              <div className="text-slate-400 p-3 bg-slate-900 rounded border border-slate-800">
                No sliced files in library. Default generic G-code profile will be used.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {availableFiles.map((file) => {
                  const isSelected = file.id === selectedFileId;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      className={`p-2.5 rounded border cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/30 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">.{file.fileFormat}</span>
                          {file.isMultiColor && (
                            <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 rounded">IFS</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {file.originalFileName} • {file.material} • {file.estimatedPrintTimeMinutes} min
                        </div>
                      </div>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedFileId(file.id)}
                        className="text-sky-600 bg-slate-950 border-slate-700 w-4 h-4"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Job Summary Preview */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Pre-Flight Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 block">Printer:</span>
                <span className="font-medium text-white">{selectedPrinter?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Material:</span>
                <span className="font-medium text-white">{job.material} ({job.color})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Est. Print Time:</span>
                <span className="font-medium text-white">
                  {selectedFile ? `${selectedFile.estimatedPrintTimeMinutes} min` : `${job.estimatedPrintTimeMinutes} min`}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">File:</span>
                <span className="font-mono text-sky-300 truncate block">
                  {selectedFile?.originalFileName || 'Generic.gcode'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSending}
              leftIcon={<Zap className="w-3.5 h-3.5" />}
            >
              Verify & Send to Printer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Physical Hardware Safety Confirmation Modal */}
      <SafetyConfirmModal
        isOpen={showSafetyConfirm}
        onClose={() => setShowSafetyConfirm(false)}
        onConfirm={handleExecuteSend}
        type="start"
        printerName={selectedPrinter?.name || 'Flashforge'}
        details={{
          productName: job.productName,
          material: job.material,
          colors: [job.color],
          estimatedPrintTimeMinutes: selectedFile?.estimatedPrintTimeMinutes || job.estimatedPrintTimeMinutes,
          estimatedFilamentGrams: selectedFile?.estimatedFilamentGrams || job.estimatedFilamentGrams,
          printFileName: selectedFile?.originalFileName,
        }}
      />
    </>
  );
};
