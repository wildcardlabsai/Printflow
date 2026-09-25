import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, formatPrintTime } from '../../lib/calculations';
import { OrderStatusBadge, ChannelBadge, PrinterStatusBadge, JobStatusBadge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Order, ProductionJob, Printer } from '../../types';
import {
  ShoppingCart,
  Layers,
  TrendingUp,
  DollarSign,
  Clock,
  Printer as PrinterIcon,
  PackageCheck,
  Truck,
  ArrowRight,
  AlertCircle,
  Play,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (section: any) => void;
  onSelectOrder: (orderId: string) => void;
  onOpenNewOrder: () => void;
  onJobAction: (job: ProductionJob, actionType: 'start' | 'complete' | 'assign') => void;
  onPrinterStatusToggle: (printer: Printer) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectOrder,
  onOpenNewOrder,
  onJobAction,
  onPrinterStatusToggle,
}) => {
  const { orders, productionJobs, printers, settings } = useDatabase();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 7 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Orders counts
  const ordersToday = orders.filter((o) => new Date(o.orderDate).getTime() >= startOfToday);
  const ordersThisWeek = orders.filter((o) => new Date(o.orderDate).getTime() >= sevenDaysAgo);
  const ordersAwaitingProd = orders.filter((o) => ['CONFIRMED', 'AWAITING PRINT'].includes(o.status));
  const ordersPrinting = orders.filter((o) => o.status === 'PRINTING');
  const ordersReadyToPack = orders.filter((o) => o.status === 'PRINTED' || o.packingStatus === 'Packing');
  const ordersReadyToShip = orders.filter((o) => o.status === 'READY TO SHIP');

  // Production metrics
  const jobsWaiting = productionJobs.filter((j) => j.status === 'awaiting_print');
  const jobsPrinting = productionJobs.filter((j) => j.status === 'printing');
  const jobsCompletedToday = productionJobs.filter(
    (j) => j.status === 'printed' && j.completedAt && new Date(j.completedAt).getTime() >= startOfToday
  );
  const totalEstimatedPrintMinutes = jobsWaiting.reduce((acc, j) => acc + j.estimatedPrintTimeMinutes, 0);

  // Financials
  const revenueToday = ordersToday.reduce((acc, o) => acc + o.total, 0);
  const revenueThisWeek = ordersThisWeek.reduce((acc, o) => acc + o.total, 0);
  const ordersThisMonth = orders.filter((o) => new Date(o.orderDate).getTime() >= startOfMonth);
  const revenueThisMonth = ordersThisMonth.reduce((acc, o) => acc + o.total, 0);

  const profitToday = ordersToday.reduce((acc, o) => acc + o.estimatedProfit, 0);
  const profitThisWeek = ordersThisWeek.reduce((acc, o) => acc + o.estimatedProfit, 0);
  const profitThisMonth = ordersThisMonth.reduce((acc, o) => acc + o.estimatedProfit, 0);

  const recentOrders = orders.slice(0, 6);
  const queueJobs = productionJobs
    .filter((j) => ['awaiting_print', 'printing'].includes(j.status))
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Printer Live Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <PrinterIcon className="w-4 h-4 text-sky-400" />
              <h2 className="font-semibold text-sm text-white">Active Flashforge 3D Print Farm</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Flashforge AD5X (IFS multi-material) & Adventurer 5M connected via LAN Socket (Port 8898/8899)
            </p>
          </div>
          <button
            onClick={() => onNavigate('printers')}
            className="text-xs text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Open Fleet Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map((printer) => {
            const isPrinting = printer.status === 'PRINTING';
            const nextJob = jobsWaiting[0];

            return (
              <div
                key={printer.id}
                className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white text-sm block">{printer.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {printer.model} • {printer.ipAddress || '192.168.1.105'}
                      </span>
                    </div>
                    <button
                      onClick={() => onPrinterStatusToggle(printer)}
                      title="Click to toggle status"
                      className="cursor-pointer"
                    >
                      <PrinterStatusBadge status={printer.status} />
                    </button>
                  </div>

                  {isPrinting && printer.currentJobName ? (
                    <div className="mt-3 p-2.5 rounded bg-indigo-950/30 border border-indigo-900/40 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-indigo-200 font-medium truncate max-w-[200px]">
                          {printer.currentJobName}
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">
                          {printer.progressPercentage || 0}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${printer.progressPercentage || 0}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-indigo-300/80 flex items-center justify-between">
                        <span>{printer.remainingMinutes ? `Remaining: ~${printer.remainingMinutes} mins` : 'Estimating...'}</span>
                        <span>{printer.capabilities?.multiColor ? 'AD5X IFS Multi-Color' : 'Single Extruder'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Next up in queue:</span>
                        <span className="font-medium text-white truncate block max-w-[200px]">
                          {nextJob ? `${nextJob.productName} × ${nextJob.quantity}` : 'Queue empty — Ready'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        Idle
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{printer.location || 'Print Bay'}</span>
                  <span>{printer.capabilities.buildVolume}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Orders awaiting production */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Awaiting Print</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{ordersAwaitingProd.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{jobsWaiting.length} jobs in queue</span>
            <span className="text-amber-400">{formatPrintTime(totalEstimatedPrintMinutes)}</span>
          </div>
        </div>

        {/* Currently Printing */}
        <div
          onClick={() => onNavigate('production')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Currently Printing</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">{jobsPrinting.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Across {printers.filter((p) => p.status === 'PRINTING').length} printers</span>
            <span className="text-slate-300">{jobsCompletedToday.length} done today</span>
          </div>
        </div>

        {/* Ready to Pack */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Ready to Pack</span>
            <PackageCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{ordersReadyToPack.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Printed orders</span>
            <span className="text-sky-400">{ordersReadyToShip.length} awaiting carrier</span>
          </div>
        </div>

        {/* Revenue & Profit (Month) */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Revenue (Month)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(revenueThisMonth, settings.currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Est. Profit:</span>
            <span className="font-mono text-slate-200 font-semibold">
              {formatCurrency(profitThisMonth, settings.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Snapshot Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Revenue & Estimated Profit Breakdown
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-xs">
          <div className="py-2 sm:py-0 sm:px-4 first:pl-0">
            <span className="text-slate-400 block mb-1">Today</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-white">
                {formatCurrency(revenueToday, settings.currencySymbol)}
              </span>
              <span className="font-mono text-xs text-emerald-400">
                (Est. Profit: {formatCurrency(profitToday, settings.currencySymbol)})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {ordersToday.length} orders received
            </span>
          </div>

          <div className="py-2 sm:py-0 sm:px-4">
            <span className="text-slate-400 block mb-1">This Week (Last 7 Days)</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-white">
                {formatCurrency(revenueThisWeek, settings.currencySymbol)}
              </span>
              <span className="font-mono text-xs text-emerald-400">
                (Est. Profit: {formatCurrency(profitThisWeek, settings.currencySymbol)})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {ordersThisWeek.length} orders received
            </span>
          </div>

          <div className="py-2 sm:py-0 sm:px-4 last:pr-0">
            <span className="text-slate-400 block mb-1">This Month</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-white">
                {formatCurrency(revenueThisMonth, settings.currencySymbol)}
              </span>
              <span className="font-mono text-xs text-emerald-400">
                (Est. Profit: {formatCurrency(profitThisMonth, settings.currencySymbol)})
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {ordersThisMonth.length} orders total
            </span>
          </div>
        </div>
      </div>

      {/* Split Section: Recent Orders & Production Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm text-white">Recent Multi-Channel Orders</h3>
              </div>
              <button
                onClick={() => onNavigate('orders')}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View All ({orders.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord.id)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded cursor-pointer transition-colors text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sky-400">
                        {ord.internalOrderId}
                      </span>
                      <ChannelBadge channel={ord.salesChannel} size="sm" />
                      <span className="text-slate-300 font-medium truncate max-w-[120px]">
                        {ord.customerName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {ord.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono font-semibold text-white">
                      {formatCurrency(ord.total, settings.currencySymbol)}
                    </div>
                    <OrderStatusBadge status={ord.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 flex justify-end">
            <Button variant="outline" size="sm" onClick={onOpenNewOrder}>
              + Create Manual Order
            </Button>
          </div>
        </div>

        {/* Next in Production Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-white">Production Queue</h3>
              </div>
              <button
                onClick={() => onNavigate('production')}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Full Queue ({productionJobs.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {queueJobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No active jobs in queue. Everything is up to date!
                </div>
              ) : (
                queueJobs.map((job) => {
                  const isPrinting = job.status === 'printing';
                  return (
                    <div
                      key={job.id}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PriorityBadge priority={job.priority} size="sm" />
                          <span className="font-mono text-slate-400 text-[11px]">
                            {job.orderInternalId}
                          </span>
                          <span className="text-slate-400 text-[11px]">•</span>
                          <span className="text-[11px] text-slate-300 truncate">
                            {job.printerName || 'Unassigned'}
                          </span>
                        </div>
                        <div className="font-medium text-white truncate">{job.productName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>Qty: {job.quantity}</span>
                          <span>•</span>
                          <span>Est: {formatPrintTime(job.estimatedPrintTimeMinutes)}</span>
                          <span>•</span>
                          <span>{job.material} ({job.color})</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isPrinting ? (
                          <Button
                            variant="success"
                            size="sm"
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => onJobAction(job, 'complete')}
                          >
                            Finish
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Play className="w-3.5 h-3.5" />}
                            onClick={() => onJobAction(job, 'start')}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>{jobsWaiting.length} jobs awaiting printer assignment</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('production')}
            >
              Manage Production
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
