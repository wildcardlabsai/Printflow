import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { History, Search, Filter, ShieldCheck, User } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchSum = log.summary.toLowerCase().includes(q);
      const matchId = log.entityId.toLowerCase().includes(q);
      const matchUser = log.user.toLowerCase().includes(q);
      if (!matchAction && !matchSum && !matchId && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search activity by action, order #, user, summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Entity Filter:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none"
          >
            <option value="ALL">All Operations</option>
            <option value="Order">Orders</option>
            <option value="Production">Production</option>
            <option value="Filament">Filament</option>
            <option value="Product">Products</option>
            <option value="Printer">Printers</option>
            <option value="Customer">Customers</option>
            <option value="Shipping">Shipping</option>
            <option value="Settings">Settings</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Activity Log: <strong className="text-white">{filteredLogs.length}</strong> recorded events
          </span>
          <span className="text-[11px] font-mono">Immutable audit stream</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No activity logs match the selected filter.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const entityBadges: Record<string, string> = {
                Order: 'bg-sky-950/80 text-sky-300 border-sky-800',
                Production: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
                Filament: 'bg-amber-950/80 text-amber-300 border-amber-800',
                Product: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
                Printer: 'bg-purple-950/80 text-purple-300 border-purple-800',
                Customer: 'bg-blue-950/80 text-blue-300 border-blue-800',
                Shipping: 'bg-teal-950/80 text-teal-300 border-teal-800',
                Settings: 'bg-slate-800 text-slate-300 border-slate-700',
              };

              return (
                <div
                  key={log.id}
                  className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          entityBadges[log.entityType] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.entityType}
                      </span>
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        [{log.entityId}]
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed">{log.summary}</p>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.user}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono whitespace-nowrap">
                    <div>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
