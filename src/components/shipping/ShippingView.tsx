import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Order } from '../../types';
import { OrderStatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/calculations';
import { PackingSlipModal } from '../orders/PackingSlipModal';
import { Truck, Info, Search, PackageCheck, CheckCircle2, ArrowRight, FileText } from 'lucide-react';

interface ShippingViewProps {
  onOpenShippingModal: (order: Order) => void;
  onSelectOrder: (orderId: string) => void;
}

export const ShippingView: React.FC<ShippingViewProps> = ({
  onOpenShippingModal,
  onSelectOrder,
}) => {
  const { orders, settings } = useDatabase();
  const [activeTab, setActiveTab] = useState<'pending' | 'shipped' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [packingSlipOrder, setPackingSlipOrder] = useState<Order | null>(null);

  const pendingFulfillment = orders.filter((o) =>
    ['PRINTED', 'PACKING', 'READY TO SHIP'].includes(o.status)
  );

  const shippedOrders = orders.filter((o) => ['SHIPPED', 'COMPLETED'].includes(o.status));

  const currentList =
    activeTab === 'pending'
      ? pendingFulfillment
      : activeTab === 'shipped'
      ? shippedOrders
      : orders;

  const filteredOrders = currentList.filter((o) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.internalOrderId.toLowerCase().includes(q);
      const matchCust = o.customerName.toLowerCase().includes(q);
      const matchTrack = o.trackingNumber?.toLowerCase().includes(q) ?? false;
      const matchAddr = o.shippingAddress.toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchTrack && !matchAddr) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Phase 2 Clear Notice */}
      <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold block text-amber-100 text-sm">
            Shipping Carrier API Integration Coming in Phase 2
          </span>
          <p className="mt-1 text-amber-200/90">
            Automated PDF label printing, manifest generation, and webhook tracking for Royal Mail Click & Drop, Evri, and DPD will be connected in Phase 2. For Phase 1, you can input tracking numbers, assign carriers, and update fulfillment states.
          </p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Awaiting Dispatch / Packing</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 border border-sky-700">
                {pendingFulfillment.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shipped')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'shipped'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Dispatched Orders</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-950 border border-sky-700">
                {shippedOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Orders
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by order #, tracking, recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Fulfillment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Fulfillment Queue: <strong className="text-white">{filteredOrders.length}</strong> orders
          </span>
          <span className="text-[11px]">Generate packing slips & tracking assignments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 select-none">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Order ID</th>
                <th className="px-3.5 py-2.5 font-medium">Recipient & Address</th>
                <th className="px-3.5 py-2.5 font-medium">Carrier & Service</th>
                <th className="px-3.5 py-2.5 font-medium">Tracking #</th>
                <th className="px-3.5 py-2.5 font-medium">Status</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Postage Fee</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <Truck className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium mb-1">
                        {orders.length === 0 ? 'No orders to ship' : 'No orders in this queue'}
                      </p>
                      <p className="text-xs text-slate-500 max-w-[260px]">
                        {orders.length === 0
                          ? 'Orders ready for dispatch will appear here once they finish printing.'
                          : 'Orders move here after printing is complete. Check the other tabs or adjust your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onSelectOrder(order.id)}
                        className="font-mono font-semibold text-sky-400 hover:underline block"
                      >
                        {order.internalOrderId}
                      </button>
                      <div className="text-[10px] text-slate-400">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-white">{order.customerName}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[240px]">
                        {order.shippingAddress}
                      </div>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap text-slate-300">
                      <div>{order.shippingProvider || 'Royal Mail'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {order.shippingService || 'Tracked 48'}
                      </div>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {order.trackingNumber ? (
                        <span className="font-mono font-medium text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                          {order.trackingNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No tracking</span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} size="sm" />
                    </td>

                    <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono text-slate-300">
                      {formatCurrency(order.shippingCost, settings.currencySymbol)}
                    </td>

                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FileText className="w-3.5 h-3.5" />}
                          onClick={() => setPackingSlipOrder(order)}
                        >
                          Slip
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Truck className="w-3.5 h-3.5" />}
                          onClick={() => onOpenShippingModal(order)}
                        >
                          {order.trackingNumber ? 'Edit Tracking' : 'Dispatch'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PackingSlipModal
        order={packingSlipOrder}
        isOpen={Boolean(packingSlipOrder)}
        onClose={() => setPackingSlipOrder(null)}
      />
    </div>
  );
};
