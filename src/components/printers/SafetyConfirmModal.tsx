import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Power, Clock, Disc, Layers } from 'lucide-react';

interface SafetyConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: 'stop' | 'start';
  printerName: string;
  details?: {
    jobName?: string;
    productName?: string;
    material?: string;
    colors?: string[];
    estimatedPrintTimeMinutes?: number;
    estimatedFilamentGrams?: number;
    printFileName?: string;
  };
}

export const SafetyConfirmModal: React.FC<SafetyConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  printerName,
  details,
}) => {
  if (!isOpen) return null;

  if (type === 'stop') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Emergency Stop Print Confirmation"
        subtitle={`Target Hardware: ${printerName}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-rose-100 text-sm">
                Are you sure you want to stop this print?
              </span>
              <p className="text-rose-200/90 leading-relaxed">
                This will send command <code className="font-mono bg-rose-900/50 px-1 py-0.5 rounded text-rose-200">~M26</code> to terminate the active physical print job immediately on {printerName}. The nozzle heaters will shut off and unrecoverable print progress will be lost.
              </p>
            </div>
          </div>

          {details?.jobName && (
            <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400">Current Job:</span>
              <span className="font-mono text-white font-medium block">{details.jobName}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Power className="w-3.5 h-3.5" />}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              Stop Print
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Type === 'start'
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start print on ${printerName}?`}
      subtitle="Physical Hardware Safety Confirmation"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-lg bg-sky-950/40 border border-sky-800 text-sky-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-sky-100 text-sm">
              Confirm Physical Build Plate Readiness
            </span>
            <p className="text-sky-200/90 leading-relaxed">
              Verify that the build plate is clear, clean, and properly leveled before confirming. Once initiated, nozzle and bed heaters will energize automatically.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 block text-[11px]">Product:</span>
              <span className="font-medium text-white">{details?.productName || 'Custom Print Job'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Print File:</span>
              <span className="font-mono text-sky-300 truncate block">
                {details?.printFileName || details?.jobName || 'Flashforge_Build.gcode'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
            <div>
              <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                <Disc className="w-3 h-3 text-slate-500" /> Material
              </span>
              <span className="font-medium text-slate-200">{details?.material || 'PLA'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Duration
              </span>
              <span className="font-medium text-slate-200">
                {details?.estimatedPrintTimeMinutes ? `${details.estimatedPrintTimeMinutes} min` : 'Est. 1h 45m'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" /> Filament
              </span>
              <span className="font-medium text-slate-200">
                {details?.estimatedFilamentGrams ? `${details.estimatedFilamentGrams}g` : '42g'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirm & Send Print
          </Button>
        </div>
      </div>
    </Modal>
  );
};
