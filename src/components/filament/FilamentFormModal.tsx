import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FilamentSpool, FilamentMaterial, SpoolStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency } from '../../lib/calculations';

interface FilamentFormModalProps {
  spool?: FilamentSpool | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FilamentFormModal: React.FC<FilamentFormModalProps> = ({
  spool,
  isOpen,
  onClose,
}) => {
  const { saveFilament, settings } = useDatabase();
  const { showToast } = useNotification();

  const [brand, setBrand] = useState(spool?.brand || 'Sunlu');
  const [material, setMaterial] = useState<FilamentMaterial>(spool?.material || 'PLA');
  const [color, setColor] = useState(spool?.color || '');
  const [hexColor, setHexColor] = useState(spool?.hexColor || '#1f2937');
  const [weightPurchasedG, setWeightPurchasedG] = useState(spool?.weightPurchasedG || 1000);
  const [remainingWeightG, setRemainingWeightG] = useState(spool?.remainingWeightG || 1000);
  const [cost, setCost] = useState(spool?.cost || 19.99);
  const [spoolStatus, setSpoolStatus] = useState<SpoolStatus>(spool?.spoolStatus || 'In Stock');
  const [location, setLocation] = useState(spool?.location || 'Shelf 1');
  const [notes, setNotes] = useState(spool?.notes || '');

  if (!isOpen) return null;

  const costPerGram = weightPurchasedG > 0 ? cost / weightPurchasedG : 0.02;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !color.trim()) {
      showToast({ type: 'error', title: 'Error', message: 'Brand and Color are required' });
      return;
    }

    try {
      const saved = saveFilament({
        id: spool?.id || 'spool-' + Date.now(),
        brand: brand.trim(),
        material,
        color: color.trim(),
        hexColor,
        weightPurchasedG: Number(weightPurchasedG) || 1000,
        remainingWeightG: Number(remainingWeightG) || 0,
        cost: Number(cost) || 0,
        costPerGram,
        spoolStatus,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        createdAt: spool?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast({
        type: 'success',
        title: spool ? 'Spool Updated' : 'Spool Added',
        message: `${saved.brand} ${saved.color} (${saved.remainingWeightG}g remaining)`,
      });
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={spool ? `Edit Spool: ${spool.brand} ${spool.color}` : 'Add New Filament Spool'}
      subtitle="Track raw material weights, spool costs, and storage locations."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Brand *</label>
            <input
              type="text"
              required
              placeholder="Sunlu, eSUN, Polymaker, Bambu..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Material *</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as FilamentMaterial)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="PLA">PLA</option>
              <option value="PETG">PETG</option>
              <option value="Silk PLA">Silk PLA</option>
              <option value="TPU">TPU</option>
              <option value="ABS">ABS</option>
              <option value="ASA">ASA</option>
              <option value="Carbon Fiber PLA">Carbon Fiber PLA</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Color Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Matte Charcoal Black, Silk Gold"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Color Swatch</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hexColor}
                onChange={(e) => setHexColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer p-0"
              />
              <span className="text-[11px] font-mono text-slate-400">{hexColor}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3 rounded bg-slate-950 border border-slate-800">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Weight Purchased</label>
            <div className="relative">
              <input
                type="number"
                min="100"
                step="50"
                value={weightPurchasedG}
                onChange={(e) => setWeightPurchasedG(parseInt(e.target.value) || 1000)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
              />
              <span className="absolute right-1.5 top-1 text-[10px] text-slate-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Current Weight</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10"
                value={remainingWeightG}
                onChange={(e) => setRemainingWeightG(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono"
              />
              <span className="absolute right-1.5 top-1 text-[10px] text-slate-400">g</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Spool Cost</label>
            <div className="relative">
              <span className="absolute left-1.5 top-1 text-[11px] text-slate-400 font-mono">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="0.5"
                min="0"
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-5 pr-1 py-1 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
          <span>Computed Cost per Gram:</span>
          <span className="font-mono text-sky-400 font-semibold">
            {formatCurrency(costPerGram, settings.currencySymbol)}/g
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Spool Status</label>
            <select
              value={spoolStatus}
              onChange={(e) => setSpoolStatus(e.target.value as SpoolStatus)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="In Stock">In Stock</option>
              <option value="In Use">In Use (Loaded on Printer)</option>
              <option value="Reserved">Reserved</option>
              <option value="Depleted">Depleted / Empty Spool</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Storage Location
            </label>
            <input
              type="text"
              placeholder="e.g. Shelf 1 - Rack A, Drybox 2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Nozzle temp: 215°C, Bed temp: 60°C, dried for 6h..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {spool ? 'Save Spool' : 'Add Spool to Inventory'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
