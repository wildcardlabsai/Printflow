import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ProductionJob, JobStatus, JobPriority } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { formatPrintTime } from '../../lib/calculations';
import { Play, CheckCircle2, Pause, XCircle, AlertTriangle, Disc } from 'lucide-react';

interface JobActionModalProps {
  job: ProductionJob | null;
  actionType: 'start' | 'complete' | 'assign' | 'fail' | 'cancel' | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobActionModal: React.FC<JobActionModalProps> = ({
  job,
  actionType,
  isOpen,
  onClose,
}) => {
  const { printers, filaments, updateJobStatus, assignPrinterToJob, settings } = useDatabase();
  const { showToast } = useNotification();

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(job?.printerId || printers[0]?.id || '');
  const [selectedSpoolId, setSelectedSpoolId] = useState<string>(job?.spoolId || filaments[0]?.id || '');
  const [priority, setPriority] = useState<JobPriority>(job?.priority || 'NORMAL');
  const [actualFilamentGrams, setActualFilamentGrams] = useState<number>(job?.estimatedFilamentGrams || 50);
  const [actualPrintTimeMinutes, setActualPrintTimeMinutes] = useState<number>(job?.estimatedPrintTimeMinutes || 120);
  const [notes, setNotes] = useState<string>(job?.notes || '');

  if (!job || !actionType || !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (actionType === 'start') {
        const printer = printers.find((p) => p.id === selectedPrinterId);
        updateJobStatus(job.id, 'printing', {
          printerId: selectedPrinterId,
          printerName: printer?.name,
          spoolId: selectedSpoolId,
          notes,
        });
        showToast({
          type: 'success',
          title: 'Print Started',
          message: `Job #${job.id.substring(0, 8)} started on ${printer?.name || 'printer'}`,
        });
      } else if (actionType === 'complete') {
        updateJobStatus(job.id, 'printed', {
          actualFilamentGrams: Number(actualFilamentGrams) || 0,
          actualPrintTimeMinutes: Number(actualPrintTimeMinutes) || 0,
          spoolId: selectedSpoolId,
          notes,
        });
        showToast({
          type: 'success',
          title: 'Job Completed',
          message: `Job marked as printed. ${actualFilamentGrams}g deducted from spool.`,
        });
      } else if (actionType === 'assign') {
        assignPrinterToJob(job.id, selectedPrinterId, priority);
        showToast({
          type: 'success',
          title: 'Printer Assigned',
          message: `Job assigned to ${printers.find((p) => p.id === selectedPrinterId)?.name}`,
        });
      } else if (actionType === 'fail') {
        updateJobStatus(job.id, 'failed', { notes: notes || 'Print failed' });
        showToast({
          type: 'warning',
          title: 'Job Marked as Failed',
          message: 'Printer released and job flagged for review',
        });
      } else if (actionType === 'cancel') {
        updateJobStatus(job.id, 'cancelled', { notes: notes || 'Job cancelled' });
        showToast({
          type: 'info',
          title: 'Job Cancelled',
          message: 'Job cancelled and printer released',
        });
      }

      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const titles: Record<string, string> = {
    start: 'Start Print Job',
    complete: 'Complete Print Job & Log Filament',
    assign: 'Assign Printer & Priority',
    fail: 'Mark Print Job as Failed',
    cancel: 'Cancel Print Job',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[actionType] || 'Job Action'}
      subtitle={`${job.productName} (Qty: ${job.quantity}) for Order ${job.orderInternalId}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {actionType === 'start' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select 3D Printer
              </label>
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                required
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - Status: {p.status} ({p.model})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Loaded Filament Spool
              </label>
              <select
                value={selectedSpoolId}
                onChange={(e) => setSelectedSpoolId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              >
                {filaments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.brand} {f.material} - {f.color} ({f.remainingWeightG}g remaining)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {actionType === 'complete' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs flex items-start gap-2.5">
              <Disc className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-emerald-100">Filament Inventory Deduction</span>
                Entering actual filament consumed will deduct the grams directly from the active spool inventory.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Filament (grams)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={actualFilamentGrams}
                  onChange={(e) => setActualFilamentGrams(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Est: {job.estimatedFilamentGrams}g
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  step="5"
                  value={actualPrintTimeMinutes}
                  onChange={(e) => setActualPrintTimeMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Est: {formatPrintTime(job.estimatedPrintTimeMinutes)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deduct from Filament Spool
              </label>
              <select
                value={selectedSpoolId}
                onChange={(e) => setSelectedSpoolId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                required
              >
                {filaments.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.brand} {f.material} - {f.color} ({f.remainingWeightG}g remaining)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {actionType === 'assign' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Printer
              </label>
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                required
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status}) - {p.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Queue Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              >
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>
        )}

        {(actionType === 'fail' || actionType === 'cancel') && (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              {actionType === 'fail'
                ? 'Flag this print as failed (e.g. bed adhesion failure, nozzle clog, layer shift). The printer will be freed.'
                : 'Cancel this print job from the schedule.'}
            </p>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Failure / Cancellation Reason</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for failure..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={actionType === 'complete' ? 'success' : actionType === 'fail' || actionType === 'cancel' ? 'danger' : 'primary'}
            size="sm"
          >
            Confirm
          </Button>
        </div>
      </form>
    </Modal>
  );
};
