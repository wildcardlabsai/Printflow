import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FilamentSpool } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Scale, MinusCircle } from 'lucide-react';

interface LogUsageModalProps {
  spool: FilamentSpool | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LogUsageModal: React.FC<LogUsageModalProps> = ({
  spool,
  isOpen,
  onClose,
}) => {
  const { deductFilament, saveFilament } = useDatabase();
  const { showToast } = useNotification();

  const [mode, setMode] = useState<'deduct' | 'weigh'>('deduct');
  const [gramsToDeduct, setGramsToDeduct] = useState<number>(50);
  const [measuredGrossWeight, setMeasuredGrossWeight] = useState<number>(
    spool ? spool.remainingWeightG + 200 : 800 // assuming ~200g empty spool tare
  );
  const [tareWeight, setTareWeight] = useState<number>(200);
  const [reason, setReason] = useState<string>('Test print / calibration cube');

  if (!spool || !isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'deduct') {
        const grams = Number(gramsToDeduct) || 0;
        if (grams <= 0) {
          showToast({ type: 'error', title: 'Error', message: 'Enter a valid amount of grams' });
          return;
        }
        deductFilament(spool.id, grams, reason);
        showToast({
          type: 'success',
          title: 'Filament Deducted',
          message: `Deducted ${grams}g from ${spool.brand} ${spool.color}`,
        });
      } else {
        // Weighed physically on scale
        const netGrams = Math.max(0, measuredGrossWeight - tareWeight);
        saveFilament({
          ...spool,
          remainingWeightG: netGrams,
          spoolStatus: netGrams === 0 ? 'Depleted' : spool.spoolStatus,
          updatedAt: new Date().toISOString(),
        });
        showToast({
          type: 'success',
          title: 'Spool Weight Calibrated',
          message: `Remaining filament calibrated to ${netGrams}g (${measuredGrossWeight}g - ${tareWeight}g tare)`,
        });
      }
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Filament Weighing & Usage: ${spool.brand} ${spool.color}`}
      subtitle={`Current inventory record: ${spool.remainingWeightG}g remaining`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector */}
        <div className="flex rounded bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('deduct')}
            className={`flex-1 py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'deduct'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            <span>Deduct Grams</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('weigh')}
            className={`flex-1 py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'weigh'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Scale Calibration</span>
          </button>
        </div>

        {mode === 'deduct' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Grams Consumed
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={spool.remainingWeightG}
                  value={gramsToDeduct}
                  onChange={(e) => setGramsToDeduct(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400">grams</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Note</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Calibration print, purge tower, prototype..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Weigh your spool on a digital kitchen scale. Enter the total weight shown; the system will subtract the empty spool plastic tare weight (~200g) to compute true net filament remaining.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gross Scale Reading
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    value={measuredGrossWeight}
                    onChange={(e) => setMeasuredGrossWeight(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Empty Spool Tare
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">g</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Calculated Net Filament:</span>
              <span className="font-mono text-sky-400 font-bold text-sm">
                {Math.max(0, measuredGrossWeight - tareWeight)} grams
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
