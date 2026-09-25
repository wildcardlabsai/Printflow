import React, { useState, useEffect } from 'react';
import { Menu, Plus, Bell, AlertTriangle, Layers, ShoppingBag, Cloud } from 'lucide-react';
import { Button } from '../ui/Button';
import { NavSection } from './Sidebar';
import { useDatabase } from '../../context/DatabaseContext';
import { cloudDb } from '../../lib/cloudDb';
import { firebaseDb } from '../../lib/firebaseDb';

interface HeaderProps {
  currentSection: NavSection;
  onOpenMobileMenu: () => void;
  onOpenNewOrder: () => void;
  onOpenNewProduct: () => void;
  onNavigate: (section: NavSection) => void;
}

const SECTION_TITLES: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: { title: 'Operational Dashboard', subtitle: 'Real-time overview of orders, print queue, and financial metrics' },
  orders: { title: 'Order Management', subtitle: 'Multi-channel customer orders, lifecycle statuses, and fulfillment' },
  production: { title: 'Production & Print Queue', subtitle: 'Job scheduling, printer allocation, and completion tracking' },
  products: { title: 'Product Catalog', subtitle: '3D printed products, technical specifications, and cost breakdowns' },
  customers: { title: 'Customers', subtitle: 'Customer directory, order histories, and delivery details' },
  printers: { title: '3D Printers', subtitle: 'Flashforge machine status, specifications, and telemetry readiness' },
  filament: { title: 'Filament Inventory', subtitle: 'Spool weights, material types, and actual consumption tracking' },
  shipping: { title: 'Shipping & Fulfillment', subtitle: 'Carrier dispatch, packaging workflows, and tracking assignments' },
  integrations: { title: 'Multichannel Integrations', subtitle: 'Etsy Open API v3, eBay Sell APIs, and Carrier Shipping' },
  reports: { title: 'Analytics & Reports', subtitle: 'Sales channel performance, profit margins, and production efficiency' },
  settings: { title: 'System Settings', subtitle: 'Cost rates, business preferences, and integration roadmap' },
  audit: { title: 'Audit & Activity Log', subtitle: 'Immutable trail of orders, production jobs, and inventory changes' },
};

export const Header: React.FC<HeaderProps> = ({
  currentSection,
  onOpenMobileMenu,
  onOpenNewOrder,
  onOpenNewProduct,
  onNavigate,
}) => {
  const { filaments, productionJobs, settings, orders } = useDatabase();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(() => {
    const isFb = firebaseDb.isConfigured() && firebaseDb.getConfig().enabled;
    const isSb = cloudDb.isConfigured() && cloudDb.getConfig().enabled;
    return isFb || isSb;
  });

  useEffect(() => {
    const handleSbStatus = (e: any) => {
      if (e.detail) {
        setIsCloudConnected(e.detail.status === 'connected' || e.detail.status === 'syncing');
      }
    };
    const handleFbStatus = (e: any) => {
      if (e.detail) {
        setIsCloudConnected(e.detail.status === 'connected' || e.detail.status === 'syncing');
      }
    };

    window.addEventListener('printflow_cloud_sync_status', handleSbStatus);
    window.addEventListener('pokecraft_firebase_sync_status', handleFbStatus);
    return () => {
      window.removeEventListener('printflow_cloud_sync_status', handleSbStatus);
      window.removeEventListener('pokecraft_firebase_sync_status', handleFbStatus);
    };
  }, []);

  const lowFilamentSpools = filaments.filter(
    (f) => f.remainingWeightG <= settings.lowFilamentThresholdG && f.spoolStatus !== 'Depleted'
  );

  const urgentJobs = productionJobs.filter(
    (j) => j.status === 'awaiting_print' && j.priority === 'URGENT'
  );

  const pendingPackingOrders = orders.filter((o) => o.status === 'PRINTED');

  const totalAlerts = lowFilamentSpools.length + urgentJobs.length;

  const { title, subtitle } = SECTION_TITLES[currentSection];

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
      {/* Left: Mobile trigger & view titles */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
            {title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block truncate">{subtitle}</p>
        </div>
      </div>

      {/* Right: Actions & notifications */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Multi-Device Cloud Sync Status */}
        <button
          onClick={() => onNavigate('settings')}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            isCloudConnected
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/60'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title={isCloudConnected ? 'Multi-Device Cloud Sync Active' : 'Click to configure Cloud Database in Settings'}
        >
          <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>{isCloudConnected ? 'Cloud Synced' : 'Local Storage'}</span>
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 font-medium text-slate-200">
                <span>Operational Alerts</span>
                <span className="text-[10px] text-slate-400 font-mono">{totalAlerts} active</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowFilamentSpools.map((spool) => (
                  <div
                    key={spool.id}
                    onClick={() => {
                      onNavigate('filament');
                      setShowNotifications(false);
                    }}
                    className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-amber-200 cursor-pointer hover:bg-amber-950/50 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Low Filament Alert</div>
                      <div className="text-[11px] text-amber-300">
                        {spool.brand} {spool.color} has only {spool.remainingWeightG}g remaining.
                      </div>
                    </div>
                  </div>
                ))}

                {urgentJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => {
                      onNavigate('production');
                      setShowNotifications(false);
                    }}
                    className="p-2 rounded bg-rose-950/30 border border-rose-800/40 text-rose-200 cursor-pointer hover:bg-rose-950/50 flex items-start gap-2"
                  >
                    <Layers className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Urgent Production Queue</div>
                      <div className="text-[11px] text-rose-300">
                        Job for {job.productName} is flagged as urgent priority.
                      </div>
                    </div>
                  </div>
                ))}

                {pendingPackingOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => {
                      onNavigate('orders');
                      setShowNotifications(false);
                    }}
                    className="p-2 rounded bg-sky-950/30 border border-sky-800/40 text-sky-200 cursor-pointer hover:bg-sky-950/50 flex items-start gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Ready to Pack</div>
                      <div className="text-[11px] text-sky-300">
                        Order {order.internalOrderId} has finished printing and awaits packing.
                      </div>
                    </div>
                  </div>
                ))}

                {totalAlerts === 0 && pendingPackingOrders.length === 0 && (
                  <div className="py-4 text-center text-slate-500">
                    No active warnings. All systems operational.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Action: New Product */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenNewProduct}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="hidden sm:inline-flex"
        >
          Product
        </Button>

        {/* Quick Action: New Order */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenNewOrder}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Order
        </Button>
      </div>
    </header>
  );
};
