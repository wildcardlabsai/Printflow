import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency } from '../../lib/calculations';
import { OrderStatusBadge, ChannelBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Order, OrderStatus, SalesChannel } from '../../types';
import { ProductMappingModal } from '../integrations/ProductMappingModal';
import { PackingSlipModal } from './PackingSlipModal';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Truck,
  ArrowUpDown,
  Download,
  Calendar,
  Link2,
  FileText,
} from 'lucide-react';

interface OrdersViewProps {
  onSelectOrder: (orderId: string) => void;
  onOpenNewOrder: () => void;
  onOpenShippingModal: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onSelectOrder,
  onOpenNewOrder,
  onOpenShippingModal,
}) => {
  const { orders, settings } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [mappingOrder, setMappingOrder] = useState<Order | null>(null);
  const [packingSlipOrder, setPackingSlipOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    // Channel filter
    if (selectedChannel !== 'ALL' && order.salesChannel !== selectedChannel) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'ALL' && order.status !== selectedStatus) {
      return false;
    }
    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchId = order.internalOrderId.toLowerCase().includes(q);
      const matchExt = order.externalOrderId?.toLowerCase().includes(q) ?? false;
      const matchCust = order.customerName.toLowerCase().includes(q);
      const matchTracking = order.trackingNumber?.toLowerCase().includes(q) ?? false;
      const matchItem = order.items.some((i) => i.productName.toLowerCase().includes(q));
      if (!matchId && !matchExt && !matchCust && !matchTracking && !matchItem) {
        return false;
      }
    }
    return true;
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'date') {
      const timeA = new Date(a.orderDate).getTime();
      const timeB = new Date(b.orderDate).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    } else {
      return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
    }
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by PF-order #, customer name, external ID, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenNewOrder}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Order
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Channel Select */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
          >
            <option value="ALL">All Channels</option>
            <option value="Etsy">Etsy</option>
            <option value="eBay">eBay</option>
            <option value="Facebook Marketplace">Facebook</option>
            <option value="Website">Website</option>
            <option value="Manual">Manual</option>
          </select>

          {/* Status Select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="MAPPING REQUIRED">MAPPING REQUIRED</option>
            <option value="AWAITING PRINT">AWAITING PRINT</option>
            <option value="PRINTING">PRINTING</option>
            <option value="PRINTED">PRINTED</option>
            <option value="PACKING">PACKING</option>
            <option value="READY TO SHIP">READY TO SHIP</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ON HOLD">ON HOLD</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Sort toggle */}
          <button
            onClick={() => {
              if (sortField === 'date') {
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              } else {
                setSortField('date');
                setSortOrder('desc');
              }
            }}
            className="ml-auto text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>
              {sortField === 'date' ? (sortOrder === 'desc' ? 'Newest First' : 'Oldest First') : 'Sorted by Total'}
            </span>
          </button>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{sortedOrders.length}</strong> of{' '}
            <strong className="text-white">{orders.length}</strong> total orders
          </span>
          <span className="text-[11px]">Click an order row for full workflow inspection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 select-none">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Order ID</th>
                <th className="px-3.5 py-2.5 font-medium">Channel</th>
                <th className="px-3.5 py-2.5 font-medium">Customer</th>
                <th className="px-3.5 py-2.5 font-medium">Items & Quantities</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Total</th>
                <th className="px-3.5 py-2.5 font-medium">Status</th>
                <th className="px-3.5 py-2.5 font-medium">Date</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {/* Order IDs */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <div className="font-mono font-semibold text-sky-400 text-xs">
                        {order.internalOrderId}
                      </div>
                      {order.externalOrderId && (
                        <div className="text-[10px] font-mono text-slate-400">
                          {order.externalOrderId}
                        </div>
                      )}
                    </td>

                    {/* Sales Channel */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <ChannelBadge channel={order.salesChannel} size="sm" />
                    </td>

                    {/* Customer */}
                    <td className="px-3.5 py-3">
                      <div className="font-medium text-white truncate max-w-[140px]">
                        {order.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {order.customerEmail}
                      </div>
                    </td>

                    {/* Line Items Summary */}
                    <td className="px-3.5 py-3">
                      <div className="text-slate-200 line-clamp-1 max-w-[220px]">
                        {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {order.items.length} line item{order.items.length > 1 ? 's' : ''} • Prod: {order.productionStatus}
                      </div>
                    </td>

                    {/* Total & Profit */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-white text-xs">
                        {formatCurrency(order.total, settings.currencySymbol)}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        +{formatCurrency(order.estimatedProfit, settings.currencySymbol)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <OrderStatusBadge status={order.status} size="sm" />
                    </td>

                    {/* Date */}
                    <td className="px-3.5 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                      <div>{new Date(order.orderDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {order.status === 'MAPPING REQUIRED' && (
                          <button
                            onClick={() => setMappingOrder(order)}
                            className="px-2 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 hover:bg-amber-900 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            title="Resolve SKU Mapping"
                          >
                            <Link2 className="w-3 h-3" /> Map SKU
                          </button>
                        )}
                        <button
                          onClick={() => setPackingSlipOrder(order)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors"
                          title="Generate Packing Slip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectOrder(order.id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenShippingModal(order)}
                          className="p-1.5 rounded hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
                          title="Shipping / Tracking"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packing Slip Modal */}
      <PackingSlipModal
        order={packingSlipOrder}
        isOpen={Boolean(packingSlipOrder)}
        onClose={() => setPackingSlipOrder(null)}
      />

      {/* Product Mapping Modal for unmapped orders */}
      <ProductMappingModal
        isOpen={Boolean(mappingOrder)}
        onClose={() => setMappingOrder(null)}
        unmappedOrder={mappingOrder}
      />
    </div>
  );
};
