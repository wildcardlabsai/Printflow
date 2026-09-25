import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AutoPrintSettings, Printer } from '../../types';
import { printersApi } from '../../lib/api/printers';
import { useNotification } from '../../context/NotificationContext';
import { ShieldCheck, AlertTriangle, Cpu, CheckCircle2, Zap } from 'lucide-react';

interface AutoPrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: Printer[];
}

export const AutoPrintSettingsModal: React.FC<AutoPrintSettingsModalProps> = ({
  isOpen,
  onClose,
  printers,
}) => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState<AutoPrintSettings>({
    enabled: false,
    allowedPrinterIds: ['printer-01', 'printer-02'],
    allowedMaterials: ['PLA', 'PETG'],
    maxQueuedJobsPerPrinter: 3,
    requireConfirmation: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      printersApi.getAutoPrintSettings().then(setSettings).catch(console.warn);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await printersApi.saveAutoPrintSettings(settings);
      showToast({
        type: 'success',
        title: 'Auto-Print Settings Updated',
        message: settings.enabled
          ? 'Auto-print queue enabled with safety guards active.'
          : 'Automatic dispatch disabled (Manual approval required).',
      });
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePrinter = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedPrinterIds: prev.allowedPrinterIds.includes(id)
        ? prev.allowedPrinterIds.filter((p) => p !== id)
        : [...prev.allowedPrinterIds, id],
    }));
  };

  const toggleMaterial = (mat: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedMaterials: prev.allowedMaterials.includes(mat)
        ? prev.allowedMaterials.filter((m) => m !== mat)
        : [...prev.allowedMaterials, mat],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Automatic Print Queue & Dispatch Safeguards"
      subtitle="Autonomous print dispatch configuration with physical safety limits"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Master Toggle */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="font-semibold text-white block text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" />
              Automatic Print Dispatch
            </span>
            <span className="text-[11px] text-slate-400">
              When an order enters AWAITING PRINT, automatically queue to an available idle printer.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* Safeguards Warning Banner */}
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-200 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            Strict Physical Safeguards Enforced:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90 pl-1">
            <li>Never sends jobs when printer is in ERROR, MAINTENANCE, or OFFLINE state.</li>
            <li>Requires pre-sliced .gcode/.3mf file matching printer build volume.</li>
            <li>Checks filament spool compatibility before starting nozzle heaters.</li>
            <li>Never retries failed prints automatically.</li>
          </ul>
        </div>

        {/* Allowed Printers */}
        <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-300">Allowed Hardware Printers</div>
          <div className="space-y-1.5">
            {printers.map((p) => (
              <label
                key={p.id}
                className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80 cursor-pointer select-none"
              >
                <div>
                  <span className="font-medium text-white block">{p.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {p.model} • {p.capabilities.multiColor ? 'IFS Multi-Color' : 'Single Extruder'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowedPrinterIds.includes(p.id)}
                  onChange={() => togglePrinter(p.id)}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Allowed Materials */}
        <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
          <div className="font-semibold text-slate-300">Allowed Materials for Auto-Dispatch</div>
          <div className="flex flex-wrap gap-2">
            {['PLA', 'PETG', 'Silk PLA', 'TPU', 'ABS'].map((mat) => {
              const active = settings.allowedMaterials.includes(mat);
              return (
                <button
                  type="button"
                  key={mat}
                  onClick={() => toggleMaterial(mat)}
                  className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                    active
                      ? 'bg-sky-950 border-sky-600 text-sky-200 font-medium'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {mat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Queue limits */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 mb-1">Max Queued Jobs Per Printer</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxQueuedJobsPerPrinter}
              onChange={(e) => setSettings({ ...settings, maxQueuedJobsPerPrinter: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            />
          </div>

          <div className="pt-5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={settings.requireConfirmation}
                onChange={(e) => setSettings({ ...settings, requireConfirmation: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
              />
              <span>Require safety prompt before bed heats</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            Save Preferences
          </Button>
        </div>
      </form>
    </Modal>
  );
};
