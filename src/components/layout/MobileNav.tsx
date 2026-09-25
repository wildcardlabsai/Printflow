import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Layers,
  Printer,
  MoreHorizontal,
  X,
  Box,
  Users,
  Scroll,
  Truck,
  BarChart3,
  Settings,
  History,
  Link2,
} from 'lucide-react';
import { NavSection } from './Sidebar';
import { useDatabase } from '../../context/DatabaseContext';

interface MobileNavProps {
  currentSection: NavSection;
  onNavigate: (section: NavSection) => void;
  isOpenDrawer: boolean;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentSection,
  onNavigate,
  isOpenDrawer,
  onCloseDrawer,
  onOpenDrawer,
}) => {
  const { orders, productionJobs } = useDatabase();

  const pendingOrders = orders.filter((o) =>
    ['NEW', 'CONFIRMED', 'AWAITING PRINT', 'READY TO SHIP'].includes(o.status)
  ).length;

  const activeJobs = productionJobs.filter((j) =>
    ['awaiting_print', 'printing'].includes(j.status)
  ).length;

  const quickNav = [
    { id: 'dashboard' as NavSection, label: 'Dash', icon: LayoutDashboard },
    { id: 'orders' as NavSection, label: 'Orders', icon: ShoppingCart, badge: pendingOrders },
    { id: 'production' as NavSection, label: 'Queue', icon: Layers, badge: activeJobs },
    { id: 'printers' as NavSection, label: 'Printers', icon: Printer },
  ];

  const drawerItems = [
    { id: 'products' as NavSection, label: 'Products', icon: Box },
    { id: 'customers' as NavSection, label: 'Customers', icon: Users },
    { id: 'filament' as NavSection, label: 'Filament Inventory', icon: Scroll },
    { id: 'shipping' as NavSection, label: 'Shipping & Fulfillment', icon: Truck },
    { id: 'integrations' as NavSection, label: 'Marketplace Integrations', icon: Link2 },
    { id: 'reports' as NavSection, label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings' as NavSection, label: 'Settings', icon: Settings },
    { id: 'audit' as NavSection, label: 'Audit Log', icon: History },
  ];

  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-30 px-2">
        {quickNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive ? 'text-sky-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-sky-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={onOpenDrawer}
          className={`flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-slate-200`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Drawer Overlay for Extra Sections */}
      {isOpenDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-sm font-semibold text-white">More Sections</span>
              <button
                onClick={onCloseDrawer}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseDrawer();
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded text-xs font-medium border text-left ${
                      isActive
                        ? 'bg-sky-600/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-sky-400" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
