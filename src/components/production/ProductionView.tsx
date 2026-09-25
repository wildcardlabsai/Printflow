import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatPrintTime } from '../../lib/calculations';
import { JobStatusBadge, PriorityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProductionJob, JobPriority, JobStatus } from '../../types';
import { SendToPrinterModal } from './SendToPrinterModal';
import {
  Layers,
  Printer as PrinterIcon,
  Play,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Filter,
  Clock,
  ArrowUpDown,
  Search,
  Check,
  Disc,
} from 'lucide-react';

interface ProductionViewProps {
  onJobAction: (job: ProductionJob, actionType: 'start' | 'complete' | 'assign' | 'fail' | 'cancel') => void;
  onSelectOrder: (orderId: string) => void;
}

export const ProductionView: React.FC<ProductionViewProps> = ({
  onJobAction,
  onSelectOrder,
}) => {
  const { productionJobs, printers, filaments } = useDatabase();

  const [activeTab, setActiveTab] = useState<'all' | 'awaiting' | 'printing' | 'printed' | 'issues'>('awaiting');
  const [selectedPrinterFilter, setSelectedPrinterFilter] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJobForDispatch, setSelectedJobForDispatch] = useState<ProductionJob | null>(null);

  const filteredJobs = productionJobs.filter((job) => {
    // Tab filter
    if (activeTab === 'awaiting' && job.status !== 'awaiting_print') return false;
    if (activeTab === 'printing' && job.status !== 'printing') return false;
    if (activeTab === 'printed' && job.status !== 'printed') return false;
    if (activeTab === 'issues' && !['failed', 'cancelled', 'paused'].includes(job.status)) return false;

    // Printer filter
    if (selectedPrinterFilter !== 'ALL' && job.printerId !== selectedPrinterFilter) return false;

    // Priority filter
    if (selectedPriorityFilter !== 'ALL' && job.priority !== selectedPriorityFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = job.orderInternalId.toLowerCase().includes(q);
      const matchProduct = job.productName.toLowerCase().includes(q);
      const matchMat = job.material.toLowerCase().includes(q);
      const matchCol = job.color.toLowerCase().includes(q);
      if (!matchOrder && !matchProduct && !matchMat && !matchCol) return false;
    }

    return true;
  });

  // Sort queue: URGENT first, then HIGH, NORMAL, LOW
  const priorityWeight: Record<JobPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (activeTab === 'awaiting') {
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
      if (pDiff !== 0) return pDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const countAwaiting = productionJobs.filter((j) => j.status === 'awaiting_print').length;
  const countPrinting = productionJobs.filter((j) => j.status === 'printing').length;
  const countPrinted = productionJobs.filter((j) => j.status === 'printed').length;
  const countIssues = productionJobs.filter((j) => ['failed', 'cancelled', 'paused'].includes(j.status)).length;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Filter and Status Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('awaiting')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'awaiting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Awaiting Print</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800">
                {countAwaiting}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('printing')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'printing'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Currently Printing</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800">
                {countPrinting}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('printed')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'printed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Printed / Done</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800">
                {countPrinted}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'issues'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Cancelled / Failed</span>
              {countIssues > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800">
                  {countIssues}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Jobs ({productionJobs.length})
            </button>
          </div>
        </div>

        {/* Filter and Search controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search jobs by order #, model, material, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedPrinterFilter}
              onChange={(e) => setSelectedPrinterFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">All Printers</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Production Jobs Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Queue View: <strong className="text-white">{sortedJobs.length}</strong> jobs
          </span>
          <span className="text-[11px] text-slate-400">
            Manual controls — start prints, log filament, and complete jobs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 select-none">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Job ID & Order</th>
                <th className="px-3.5 py-2.5 font-medium">Product / Model</th>
                <th className="px-3.5 py-2.5 font-medium text-center">Qty</th>
                <th className="px-3.5 py-2.5 font-medium">Assigned Printer</th>
                <th className="px-3.5 py-2.5 font-medium">Material & Color</th>
                <th className="px-3.5 py-2.5 font-medium">Est. Print Time</th>
                <th className="px-3.5 py-2.5 font-medium">Filament</th>
                <th className="px-3.5 py-2.5 font-medium">Priority</th>
                <th className="px-3.5 py-2.5 font-medium">Status</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No production jobs match this view.
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job) => {
                  const isPrinting = job.status === 'printing';
                  const isAwaiting = job.status === 'awaiting_print';
                  const isDone = job.status === 'printed';

                  return (
                    <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                      {/* Job & Order */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-mono text-slate-300 font-semibold">
                          #{job.id.substring(job.id.length - 6)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectOrder(job.orderId)}
                          className="text-[11px] font-mono text-sky-400 hover:underline block"
                        >
                          {job.orderInternalId}
                        </button>
                      </td>

                      {/* Product Name */}
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-white max-w-[200px] truncate">
                          {job.productName}
                        </div>
                        {job.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {job.notes}
                          </div>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="px-3.5 py-3 text-center whitespace-nowrap font-mono text-slate-200">
                        {job.quantity}
                      </td>

                      {/* Printer */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {job.printerName ? (
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <PrinterIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>{job.printerName}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onJobAction(job, 'assign')}
                            className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                          >
                            + Assign Printer
                          </button>
                        )}
                      </td>

                      {/* Material & Color */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="text-slate-200">{job.material}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {job.color}
                        </div>
                      </td>

                      {/* Print Time */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-300">
                        {formatPrintTime(job.estimatedPrintTimeMinutes)}
                        {job.actualPrintTimeMinutes && (
                          <div className="text-[10px] text-emerald-400">
                            Actual: {formatPrintTime(job.actualPrintTimeMinutes)}
                          </div>
                        )}
                      </td>

                      {/* Filament */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-300">
                        {job.estimatedFilamentGrams}g
                        {job.actualFilamentGrams && (
                          <div className="text-[10px] text-emerald-400">
                            Actual: {job.actualFilamentGrams}g
                          </div>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <PriorityBadge priority={job.priority} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <JobStatusBadge status={job.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAwaiting && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<Play className="w-3 h-3" />}
                                onClick={() => setSelectedJobForDispatch(job)}
                              >
                                Send to Printer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedJobForDispatch(job)}
                              >
                                Assign
                              </Button>
                            </>
                          )}

                          {isPrinting && (
                            <Button
                              variant="success"
                              size="sm"
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              onClick={() => onJobAction(job, 'complete')}
                            >
                              Finish & Log
                            </Button>
                          )}

                          {isDone && (
                            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                              <Check className="w-3.5 h-3.5" /> Printed
                            </span>
                          )}

                          {!isDone && (
                            <button
                              onClick={() => onJobAction(job, 'fail')}
                              title="Mark Failed"
                              className="text-slate-400 hover:text-rose-400 p-1 rounded"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SendToPrinterModal
        job={selectedJobForDispatch}
        isOpen={Boolean(selectedJobForDispatch)}
        onClose={() => setSelectedJobForDispatch(null)}
      />
    </div>
  );
};
