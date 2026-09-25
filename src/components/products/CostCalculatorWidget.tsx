import React, { useState } from 'react';
import { calculateProductCost, formatCurrency } from '../../lib/calculations';
import { useDatabase } from '../../context/DatabaseContext';
import { Calculator, ArrowRight, DollarSign, Zap, Package, Disc } from 'lucide-react';

interface CostCalculatorWidgetProps {
  initialGrams?: number;
  initialPrintHours?: number;
  initialSellingPrice?: number;
  onApply?: (calculatedCost: number, sellingPrice: number) => void;
}

export const CostCalculatorWidget: React.FC<CostCalculatorWidgetProps> = ({
  initialGrams = 80,
  initialPrintHours = 3,
  initialSellingPrice = 12.99,
  onApply,
}) => {
  const { settings } = useDatabase();

  const [filamentGrams, setFilamentGrams] = useState(initialGrams);
  const [printHours, setPrintHours] = useState(initialPrintHours);
  const [sellingPrice, setSellingPrice] = useState(initialSellingPrice);
  const [filamentCostPerKg, setFilamentCostPerKg] = useState(settings.defaultFilamentCostPerKg || 20.0);
  const [electricityCostPerHour, setElectricityCostPerHour] = useState(settings.electricityCostPerHour || 0.22);
  const [packagingCost, setPackagingCost] = useState(settings.defaultPackagingCost || 0.45);
  const [otherCosts, setOtherCosts] = useState(0);

  const breakdown = calculateProductCost({
    filamentGrams: Number(filamentGrams) || 0,
    printTimeMinutes: (Number(printHours) || 0) * 60,
    packagingCost: Number(packagingCost) || 0,
    otherCosts: Number(otherCosts) || 0,
    filamentCostPerKg: Number(filamentCostPerKg) || 20,
    electricityCostPerHour: Number(electricityCostPerHour) || 0.2,
    sellingPrice: Number(sellingPrice) || 0,
    settings,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm text-slate-200">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-sm text-white">3D Print Cost & Profit Calculator</h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Currency: {settings.currencySymbol} ({settings.currency})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Inputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Filament Used (grams)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={filamentGrams}
                  onChange={(e) => setFilamentGrams(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">g</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Print Time (hours)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={printHours}
                  onChange={(e) => setPrintHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-slate-400">hrs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Filament/kg</label>
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={filamentCostPerKg}
                  onChange={(e) => setFilamentCostPerKg(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-5 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Electricity/hr</label>
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={electricityCostPerHour}
                  onChange={(e) => setElectricityCostPerHour(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-5 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Packaging</label>
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-xs text-slate-400">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.05"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-5 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Selling Price ({settings.currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="0.50"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono font-medium"
              />
            </div>
          </div>
        </div>

        {/* Right Output Card */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Cost Breakdown
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-sky-400" />
                Filament ({filamentGrams}g @ {settings.currencySymbol}{filamentCostPerKg}/kg)
              </span>
              <span className="font-mono text-slate-200">
                {formatCurrency(breakdown.filamentCost, settings.currencySymbol)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Electricity ({printHours}h @ {settings.currencySymbol}{electricityCostPerHour}/h)
              </span>
              <span className="font-mono text-slate-200">
                {formatCurrency(breakdown.electricityCost, settings.currencySymbol)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-purple-400" />
                Packaging & Materials
              </span>
              <span className="font-mono text-slate-200">
                {formatCurrency(breakdown.packagingCost, settings.currencySymbol)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 font-medium text-slate-300">
              <span>Total Estimated Production Cost</span>
              <span className="font-mono text-white text-sm font-semibold">
                {formatCurrency(breakdown.totalCost, settings.currencySymbol)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Estimated Gross Profit</span>
                <span
                  className={`text-xl font-bold font-mono ${
                    breakdown.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(breakdown.grossProfit, settings.currencySymbol)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Margin</span>
                <span
                  className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                    breakdown.profitMarginPercent >= 50
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : breakdown.profitMarginPercent > 20
                      ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {breakdown.profitMarginPercent}%
                </span>
              </div>
            </div>

            {onApply && (
              <button
                type="button"
                onClick={() => onApply(breakdown.totalCost, sellingPrice)}
                className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
              >
                <span>Apply Cost & Price to Product</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
