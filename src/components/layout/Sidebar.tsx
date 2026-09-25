import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Box,
  Users,
  Printer,
  Scroll,
  Truck,
  BarChart3,
  Settings,
  History,
  LogOut,
  Layers3,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';

export type NavSection =
  | 'dashboard'
  | 'orders'
  | 'production'
  | 'products'
  | 'customers'
  | 'printers'
  | 'filament'
  | 'shipping'
  | 'integrations'
  | 'reports'
  | 'settings'
  | 'audit';

interface SidebarProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  className?: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onNavigate,
  className = '',
  onCloseMobile,
}) => {
  const { orders, productionJobs, filaments, printers, settings } = useDatabase();
  const { user, logout } = useAuth();

  // Compute live badges
  const pendingOrdersCount = orders.filter(
    (o) => ['NEW', 'CONFIRMED', 'AWAITING PRINT', 'READY TO SHIP'].includes(o.status)
  ).length;

  const unmappedOrdersCount = orders.filter((o) => o.status === 'MAPPING REQUIRED').length;

  const activeJobsCount = productionJobs.filter(
    (j) => j.status === 'awaiting_print' || j.status === 'printing'
  ).length;

  const lowFilamentCount = filaments.filter(
    (f) => f.remainingWeightG <= settings.lowFilamentThresholdG && f.spoolStatus !== 'Depleted'
  ).length;

  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'orders' as NavSection,
      label: 'Orders',
      icon: ShoppingCart,
      badge: unmappedOrdersCount > 0 ? `${unmappedOrdersCount} unmapped` : pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: unmappedOrdersCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'production' as NavSection,
      label: 'Production',
      icon: Layers,
      badge: activeJobsCount > 0 ? activeJobsCount : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'products' as NavSection,
      label: 'Products',
      icon: Box,
    },
    {
      id: 'customers' as NavSection,
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'printers' as NavSection,
      label: 'Printers',
      icon: Printer,
    },
    {
      id: 'filament' as NavSection,
      label: 'Filament',
      icon: Scroll,
      badge: lowFilamentCount > 0 ? 'Low' : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'shipping' as NavSection,
      label: 'Shipping',
      icon: Truck,
    },
    {
      id: 'integrations' as NavSection,
      label: 'Integrations',
      icon: Link2,
      badge: unmappedOrdersCount > 0 ? 'Action Req' : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'reports' as NavSection,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'settings' as NavSection,
      label: 'Settings',
      icon: Settings,
    },
    {
      id: 'audit' as NavSection,
      label: 'Audit Log',
      icon: History,
    },
  ];

  const handleItemClick = (id: NavSection) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none text-slate-300 ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-sky-600 text-white flex items-center justify-center font-bold tracking-wider shadow-sm">
            <Layers3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold tracking-tight text-white text-base">PrintFlow</span>
            <span className="text-[10px] text-sky-400 font-mono tracking-widest block uppercase">
              Operations OS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-600/15 text-sky-300 border border-sky-500/30'
                  : 'hover:bg-slate-800/70 text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Printer Status Snapshot in Sidebar */}
      <div className="p-3 mx-3 mb-3 rounded border border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Printers (Manual)
          </span>
          <button
            onClick={() => handleItemClick('printers')}
            className="text-[11px] text-sky-400 hover:underline flex items-center gap-0.5"
          >
            Manage <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {printers.map((p) => {
            const isPrinting = p.status === 'PRINTING';
            const isIdle = p.status === 'IDLE';
            return (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[120px]">{p.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isPrinting
                      ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                      : isIdle
                      ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* User profile & session */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-sky-400 shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'M'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Matt Taylor'}</div>
            <div className="text-[10px] text-slate-400 truncate">{user?.email || 'Owner'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
