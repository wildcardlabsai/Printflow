import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { FilamentSpool } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { Button } from '../ui/Button';
import {
  Scroll,
  Plus,
  Scale,
  AlertTriangle,
  Search,
  Edit,
  Disc,
  MinusCircle,
} from 'lucide-react';

interface FilamentViewProps {
  onOpenFilamentModal: (spool?: FilamentSpool) => void;
  onOpenLogUsageModal: (spool: FilamentSpool) => void;
}

export const FilamentView: React.FC<FilamentViewProps> = ({
  onOpenFilamentModal,
  onOpenLogUsageModal,
}) => {
  const { filaments, settings } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');

  const lowFilamentSpools = filaments.filter(
    (f) => f.remainingWeightG <= settings.lowFilamentThresholdG && f.spoolStatus !== 'Depleted'
  );

  const filteredFilaments = filaments.filter((spool) => {
    if (materialFilter !== 'ALL' && spool.material !== materialFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBrand = spool.brand.toLowerCase().includes(q);
      const matchColor = spool.color.toLowerCase().includes(q);
      const matchMat = spool.material.toLowerCase().includes(q);
      const matchLoc = spool.location?.toLowerCase().includes(q) ?? false;
      if (!matchBrand && !matchColor && !matchMat && !matchLoc) return false;
    }
    return true;
  });

  const totalRemainingWeightKg = (
    filaments.reduce((acc, f) => acc + f.remainingWeightG, 0) / 1000
  ).toFixed(2);

  const totalInventoryValue = filaments.reduce(
    (acc, f) => acc + (f.remainingWeightG / f.weightPurchasedG) * f.cost,
    0
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Low stock warning banner */}
      {lowFilamentSpools.length > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">Low Filament Spool Warning:</span>{' '}
              {lowFilamentSpools
                .map((f) => `${f.brand} ${f.color} (${f.remainingWeightG}g left)`)
                .join(', ')}
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-300">
            Threshold: &lt;{settings.lowFilamentThresholdG}g
          </span>
        </div>
      )}

      {/* Top Filter and Stats Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search spools by brand, color, material, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenFilamentModal()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Spool
            </Button>
          </div>
        </div>

        {/* Quick Inventory Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Active Spools</span>
            <span className="font-mono text-white font-bold">{filaments.length} spools</span>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Filament Stock</span>
            <span className="font-mono text-sky-400 font-bold">{totalRemainingWeightKg} kg</span>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Estimated Value</span>
            <span className="font-mono text-emerald-400 font-bold">
              {formatCurrency(totalInventoryValue, settings.currencySymbol)}
            </span>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Low Stock Spools</span>
            <span
              className={`font-mono font-bold ${
                lowFilamentSpools.length > 0 ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {lowFilamentSpools.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filament Spools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFilaments.map((spool) => {
          const percentRemaining = Math.min(
            100,
            Math.round((spool.remainingWeightG / spool.weightPurchasedG) * 100)
          );
          const isLow = spool.remainingWeightG <= settings.lowFilamentThresholdG && spool.spoolStatus !== 'Depleted';

          return (
            <div
              key={spool.id}
              className={`bg-slate-900 border rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-3 transition-colors ${
                isLow ? 'border-amber-700/60 bg-amber-950/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header with color swatch */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full border border-slate-700 shadow-sm shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: spool.hexColor || '#334155' }}
                    />
                    <div>
                      <h3 className="font-bold text-white text-sm leading-tight">{spool.color}</h3>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {spool.brand} • {spool.material}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      spool.spoolStatus === 'In Use'
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                        : spool.spoolStatus === 'Depleted'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {spool.spoolStatus}
                  </span>
                </div>

                {/* Remaining Gauge */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Remaining Weight</span>
                    <span className="font-mono text-white font-bold">
                      {spool.remainingWeightG}g{' '}
                      <span className="text-slate-400 font-normal">/ {spool.weightPurchasedG}g</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentRemaining < 20
                          ? 'bg-rose-500'
                          : percentRemaining < 40
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-right font-mono text-slate-400">
                    {percentRemaining}% left
                  </div>
                </div>

                {/* Economics */}
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cost per Gram</span>
                    <span className="font-mono text-sky-400 font-semibold text-[11px]">
                      {formatCurrency(spool.costPerGram, settings.currencySymbol)}/g
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Spool Purchase Price</span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {formatCurrency(spool.cost, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {spool.location && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    Location: <span className="text-slate-300">{spool.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenLogUsageModal(spool)}
                  leftIcon={<Scale className="w-3.5 h-3.5" />}
                >
                  Weigh / Log Usage
                </Button>

                <button
                  onClick={() => onOpenFilamentModal(spool)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Edit Spool Details"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
