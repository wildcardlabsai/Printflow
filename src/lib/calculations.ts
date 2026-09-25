import { SystemSettings } from '../types';

export interface CostBreakdown {
  filamentCost: number;
  electricityCost: number;
  packagingCost: number;
  otherCosts: number;
  totalCost: number;
  sellingPrice: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export function calculateProductCost(params: {
  filamentGrams: number;
  printTimeMinutes: number;
  packagingCost?: number;
  otherCosts?: number;
  filamentCostPerKg?: number;
  electricityCostPerHour?: number;
  sellingPrice?: number;
  settings?: Partial<SystemSettings>;
}): CostBreakdown {
  const filamentCostPerKg = params.filamentCostPerKg ?? params.settings?.defaultFilamentCostPerKg ?? 20.0;
  const electricityCostPerHour = params.electricityCostPerHour ?? params.settings?.electricityCostPerHour ?? 0.20;
  const packagingCost = params.packagingCost ?? params.settings?.defaultPackagingCost ?? 0.40;
  const otherCosts = params.otherCosts ?? 0;
  const sellingPrice = params.sellingPrice ?? 0;

  // Filament cost: grams * (costPerKg / 1000)
  const costPerGram = filamentCostPerKg / 1000;
  const filamentCost = Number((params.filamentGrams * costPerGram).toFixed(2));

  // Electricity cost: hours * costPerHour
  const printHours = params.printTimeMinutes / 60;
  const electricityCost = Number((printHours * electricityCostPerHour).toFixed(2));

  // Total cost
  const totalCost = Number((filamentCost + electricityCost + packagingCost + otherCosts).toFixed(2));

  // Gross profit & margin
  const grossProfit = Number((sellingPrice - totalCost).toFixed(2));
  const profitMarginPercent = sellingPrice > 0 ? Number(((grossProfit / sellingPrice) * 100).toFixed(1)) : 0;

  return {
    filamentCost,
    electricityCost,
    packagingCost,
    otherCosts,
    totalCost,
    sellingPrice,
    grossProfit,
    profitMarginPercent,
  };
}

export function formatCurrency(amount: number, symbol: string = '£'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);
  return `${isNegative ? '-' : ''}${symbol}${absAmount}`;
}

export function formatPrintTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
