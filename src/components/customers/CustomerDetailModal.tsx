import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Customer } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { OrderStatusBadge, ChannelBadge } from '../ui/Badge';
import { formatCurrency } from '../../lib/calculations';
import { Mail, Phone, MapPin, ShoppingCart, Calendar, PoundSterling } from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const { orders, settings } = useDatabase();

  if (!customer || !isOpen) return null;

  const customerOrders = orders.filter((o) => o.customerId === customer.id);
  const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);

  const sortedOrders = [...customerOrders].sort(
    (a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime()
  );
  const firstOrderDate = sortedOrders[0]?.orderDate;
  const lastOrderDate = sortedOrders[sortedOrders.length - 1]?.orderDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      subtitle={`Customer Profile • Registered ${new Date(customer.createdAt).toLocaleDateString()}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Contact info & address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{customer.email}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.notes && (
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
                {customer.notes}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-start gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Delivery Address:</span>
                <p className="text-slate-400 mt-0.5 leading-relaxed">
                  {customer.address.street}
                  <br />
                  {customer.address.city}, {customer.address.stateOrCounty}
                  <br />
                  {customer.address.postcode}, {customer.address.country}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lifetime Statistics */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Orders</span>
            <span className="font-mono text-base font-bold text-white">
              {customerOrders.length}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Spend</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {formatCurrency(totalSpent, settings.currencySymbol)}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">First Order</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {firstOrderDate ? new Date(firstOrderDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Latest Order</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Order History Table */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Customer Order History ({customerOrders.length})
          </div>
          {customerOrders.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs border border-slate-800 rounded">
              No orders placed by this customer yet.
            </div>
          ) : (
            <div className="border border-slate-800 rounded overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">Order ID</th>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                  {customerOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => {
                        onClose();
                        if (onSelectOrder) onSelectOrder(ord.id);
                      }}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 font-mono font-medium text-sky-400">
                        {ord.internalOrderId}
                      </td>
                      <td className="px-3 py-2">
                        <ChannelBadge channel={ord.salesChannel} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(ord.orderDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        <OrderStatusBadge status={ord.status} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-white">
                        {formatCurrency(ord.total, settings.currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
