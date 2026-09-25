import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, formatPrintTime } from '../../lib/calculations';
import { SalesChannel } from '../../types';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Layers,
  Disc,
  Clock,
  PieChart,
} from 'lucide-react';

type DateRangeOption = 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'all';

export const ReportsView: React.FC = () => {
  const { orders, productionJobs, products, settings } = useDatabase();
  const [dateRange, setDateRange] = useState<DateRangeOption>('30days');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime();

  // Filter orders by date range
  const filteredOrders = orders.filter((o) => {
    const t = new Date(o.orderDate).getTime();
    if (dateRange === 'today') return t >= startOfToday;
    if (dateRange === '7days') return t >= startOfToday - 7 * 86400000;
    if (dateRange === '30days') return t >= startOfToday - 30 * 86400000;
    if (dateRange === 'this_month') return t >= startOfThisMonth;
    if (dateRange === 'last_month') return t >= startOfLastMonth && t <= endOfLastMonth;
    return true; // all
  });

  // Financial aggregates
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + o.estimatedProfit, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Filtered production jobs corresponding to filtered orders
  const filteredOrderIds = new Set(filteredOrders.map((o) => o.id));
  const relevantJobs = productionJobs.filter(
    (j) => filteredOrderIds.has(j.orderId) || (j.createdAt && new Date(j.createdAt).getTime() >= startOfToday - 30 * 86400000)
  );

  const totalFilamentConsumedG = relevantJobs.reduce(
    (acc, j) => acc + (j.actualFilamentGrams || (j.status === 'printed' ? j.estimatedFilamentGrams : 0)),
    0
  );

  const totalPrintMinutes = relevantJobs.reduce(
    (acc, j) => acc + (j.actualPrintTimeMinutes || (j.status === 'printed' ? j.estimatedPrintTimeMinutes : 0)),
    0
  );

  // Sales Channel Breakdown
  const channelBreakdown: Record<SalesChannel, { revenue: number; ordersCount: number }> = {
    Etsy: { revenue: 0, ordersCount: 0 },
    eBay: { revenue: 0, ordersCount: 0 },
    'Facebook Marketplace': { revenue: 0, ordersCount: 0 },
    Website: { revenue: 0, ordersCount: 0 },
    Manual: { revenue: 0, ordersCount: 0 },
    Other: { revenue: 0, ordersCount: 0 },
  };

  filteredOrders.forEach((o) => {
    if (channelBreakdown[o.salesChannel]) {
      channelBreakdown[o.salesChannel].revenue += o.total;
      channelBreakdown[o.salesChannel].ordersCount += 1;
    }
  });

  // Top Products sold
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-5 pb-12">
      {/* Date Range Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">Reporting Timeframe:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'all', label: 'All Time' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id as DateRangeOption)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                dateRange === item.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(totalRevenue, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across {totalOrders} orders</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Estimated Profit</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalProfit, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {overallMargin.toFixed(1)}% gross margin
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Avg Order Value (AOV)</span>
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatCurrency(avgOrderValue, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Per transaction</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Filament Consumed</span>
            <Disc className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {(totalFilamentConsumedG / 1000).toFixed(2)} kg
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total {formatPrintTime(totalPrintMinutes)} print time
          </div>
        </div>
      </div>

      {/* Grid: Sales Channel Breakdown & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales Channels Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" />
              <h3 className="font-semibold text-sm text-white">Performance by Sales Channel</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Total: {formatCurrency(totalRevenue, settings.currencySymbol)}
            </span>
          </div>

          <div className="space-y-3">
            {(Object.keys(channelBreakdown) as SalesChannel[]).map((channel) => {
              const data = channelBreakdown[channel];
              const percent = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;

              return (
                <div key={channel} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{channel}</span>
                    <div className="text-right font-mono">
                      <span className="text-white font-semibold">
                        {formatCurrency(data.revenue, settings.currencySymbol)}
                      </span>{' '}
                      <span className="text-slate-400 text-[11px]">
                        ({data.ordersCount} orders • {percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-white">Top Revenue Generating Products</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-800 text-xs">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No product sales in this timeframe.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-medium text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.quantity} units sold</div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold text-white shrink-0">
                    {formatCurrency(p.revenue, settings.currencySymbol)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
