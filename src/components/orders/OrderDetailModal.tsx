import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { OrderStatusBadge, ChannelBadge, JobStatusBadge } from '../ui/Badge';
import { Order, OrderStatus } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatPrintTime } from '../../lib/calculations';
import { integrationsApi } from '../../lib/api/integrations';
import { ProductMappingModal } from '../integrations/ProductMappingModal';
import { PackingSlipModal } from './PackingSlipModal';
import {
  Clock,
  Printer,
  Truck,
  Package,
  Layers,
  CheckCircle,
  ExternalLink,
  Tag,
  AlertCircle,
  Share2,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenShippingModal?: (order: Order) => void;
}

const LIFECYCLE_STEPS: OrderStatus[] = [
  'CONFIRMED',
  'AWAITING PRINT',
  'PRINTING',
  'PRINTED',
  'PACKING',
  'READY TO SHIP',
  'SHIPPED',
  'COMPLETED',
];

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onOpenShippingModal,
}) => {
  const { orders, productionJobs, statusHistory, updateOrderStatus, settings } = useDatabase();
  const { showToast } = useNotification();

  const [newStatus, setNewStatus] = useState<OrderStatus>('CONFIRMED');
  const [statusNote, setStatusNote] = useState<string>('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isPushingFulfillment, setIsPushingFulfillment] = useState(false);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = useState(false);

  const order = orders.find((o) => o.id === orderId);
  if (!order || !isOpen) return null;

  const orderJobs = productionJobs.filter((j) => j.orderId === order.id);
  const orderHistory = statusHistory.filter((h) => h.orderId === order.id);

  const handlePushFulfillment = async () => {
    if (!order.trackingNumber) {
      showToast({
        type: 'warning',
        title: 'Missing Tracking',
        message: 'Please assign a tracking number before submitting fulfillment to marketplace.',
      });
      return;
    }

    try {
      setIsPushingFulfillment(true);
      if (order.salesChannel === 'Etsy') {
        const receiptId = order.marketplaceMetadata?.receiptId || order.externalOrderId?.replace('ETSY-', '');
        if (!receiptId) throw new Error('Etsy Receipt ID is missing.');

        const res = await integrationsApi.fulfillEtsy(receiptId, order.trackingNumber, order.shippingProvider || 'Royal Mail');
        if (!res.success) throw new Error(res.error || 'Failed to submit tracking to Etsy');

        showToast({
          type: 'success',
          title: 'Etsy Dispatched',
          message: `Tracking ${order.trackingNumber} pushed to Etsy order #${receiptId}!`,
        });
      } else if (order.salesChannel === 'eBay') {
        const ebayOrderId = order.marketplaceMetadata?.receiptId || order.externalOrderId?.replace('EBAY-', '');
        if (!ebayOrderId) throw new Error('eBay Order ID is missing.');

        const res = await integrationsApi.fulfillEbay(ebayOrderId, order.trackingNumber, order.shippingProvider || 'RoyalMail');
        if (!res.success) throw new Error(res.error || 'Failed to submit tracking to eBay');

        showToast({
          type: 'success',
          title: 'eBay Dispatched',
          message: `Tracking ${order.trackingNumber} submitted to eBay order #${ebayOrderId}!`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Marketplace Fulfillment Error',
        message: err.message,
      });
    } finally {
      setIsPushingFulfillment(false);
    }
  };

  const handleUpdateStatus = () => {
    try {
      updateOrderStatus(order.id, newStatus, statusNote.trim() || undefined);
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order ${order.internalOrderId} moved to ${newStatus}`,
      });
      setIsChangingStatus(false);
      setStatusNote('');
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message,
      });
    }
  };

  const handleQuickAdvance = (targetStatus: OrderStatus) => {
    try {
      updateOrderStatus(order.id, targetStatus, `Advanced directly from order modal`);
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order ${order.internalOrderId} is now ${targetStatus}`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order ${order.internalOrderId}`}
      subtitle={`Created on ${new Date(order.orderDate).toLocaleDateString()} at ${new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Badges & Lifecycle Status bar */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ChannelBadge channel={order.salesChannel} />
              <OrderStatusBadge status={order.status} />
              {order.externalOrderId && (
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Ext ID: {order.externalOrderId}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => setIsPackingSlipOpen(true)}
              >
                Packing Slip
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(order.status);
                  setIsChangingStatus(!isChangingStatus);
                }}
              >
                Change Status
              </Button>

              {onOpenShippingModal && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Truck className="w-3.5 h-3.5" />}
                  onClick={() => onOpenShippingModal(order)}
                >
                  Shipping Label / Tracking
                </Button>
              )}

              {order.trackingNumber && (order.salesChannel === 'Etsy' || order.salesChannel === 'eBay') && (
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isPushingFulfillment}
                  leftIcon={<Share2 className="w-3.5 h-3.5" />}
                  onClick={handlePushFulfillment}
                >
                  Sync to {order.salesChannel}
                </Button>
              )}
            </div>
          </div>

          {/* Change Status Popdown */}
          {isChangingStatus && (
            <div className="p-3 mb-3 rounded bg-slate-900 border border-slate-700/80 space-y-2.5">
              <div className="text-xs font-semibold text-white">Update Lifecycle Status</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="NEW">NEW</option>
                    <option value="CONFIRMED">CONFIRMED</option>
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
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="Reason or notes..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setIsChangingStatus(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpdateStatus}>
                  Save Status
                </Button>
              </div>
            </div>
          )}

          {/* Lifecycle Stepper indicator */}
          <div className="overflow-x-auto pb-1">
            <div className="flex items-center min-w-[580px] text-[10px] text-slate-400">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const stepIndex = LIFECYCLE_STEPS.indexOf(order.status);
                const isCurrent = order.status === step;
                const isPassed = stepIndex > idx;

                return (
                  <div key={step} className="flex items-center flex-1">
                    <button
                      type="button"
                      onClick={() => handleQuickAdvance(step)}
                      className={`flex flex-col items-center gap-1 group text-center cursor-pointer transition-colors ${
                        isCurrent
                          ? 'text-sky-400 font-bold'
                          : isPassed
                          ? 'text-emerald-400'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] border ${
                          isCurrent
                            ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                            : isPassed
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {isPassed ? '✓' : idx + 1}
                      </div>
                      <span className="truncate max-w-[70px] uppercase text-[9px]">
                        {step.replace('AWAITING ', 'WAIT ')}
                      </span>
                    </button>
                    {idx < LIFECYCLE_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${
                          isPassed ? 'bg-emerald-600/50' : 'bg-slate-800'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unmapped items warning banner */}
        {order.status === 'MAPPING REQUIRED' && (
          <div className="p-3.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-100 text-sm">Product / SKU Mapping Required</span>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  One or more items in this {order.salesChannel} order are not mapped to internal 3D models. Map them to automatically dispatch to your print queue.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsMappingModalOpen(true)}
              className="shrink-0"
            >
              Resolve SKU Mapping
            </Button>
          </div>
        )}

        {/* Customer & Shipping Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer & Address */}
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center gap-1.5 pb-1 border-b border-slate-900">
              <Package className="w-3.5 h-3.5 text-sky-400" />
              Customer Details
            </div>
            <div>
              <span className="font-medium text-slate-200 text-sm">{order.customerName}</span>
              <div className="text-slate-400 mt-0.5">{order.customerEmail}</div>
              {order.customerPhone && <div className="text-slate-400">{order.customerPhone}</div>}
            </div>
            <div className="pt-2 border-t border-slate-900">
              <span className="text-[11px] text-slate-400 font-medium uppercase">
                Shipping Address
              </span>
              <div className="text-slate-300 mt-0.5 leading-relaxed">
                {order.shippingAddress}
              </div>
            </div>
          </div>

          {/* Dispatch & Tracking */}
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center gap-1.5 pb-1 border-b border-slate-900">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              Dispatch & Fulfillment
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block">Carrier</span>
                <span className="text-slate-200 font-medium">
                  {order.shippingProvider || 'Royal Mail'} ({order.shippingService || 'Tracked 48'})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Tracking Number</span>
                {order.trackingNumber ? (
                  <span className="font-mono text-sky-300 font-semibold bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
                    {order.trackingNumber}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
              <div>
                <span className="text-[11px] text-slate-400 block">Packing Status</span>
                <span className="text-slate-300">{order.packingStatus}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Shipping Status</span>
                <span className="text-slate-300">{order.shippingStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="space-y-2">
          <div className="font-semibold text-white text-xs uppercase tracking-wider">
            Order Items ({order.items.length})
          </div>
          <div className="border border-slate-800 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium text-center">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit Price</th>
                  <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                  <th className="px-3 py-2 font-medium text-right">Filament / Unit</th>
                  <th className="px-3 py-2 font-medium text-right">Print Time / Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white">{item.productName}</div>
                      {item.variantName && (
                        <div className="text-[11px] text-sky-400">{item.variantName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                      {formatCurrency(item.unitPrice, settings.currencySymbol)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-white">
                      {formatCurrency(item.subtotal, settings.currencySymbol)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                      {item.filamentGramsPerUnit}g
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-400">
                      {formatPrintTime(item.printTimeMinutesPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Totals and Profit */}
        <div className="p-3.5 rounded bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Subtotal</span>
            <span className="font-mono text-slate-200 font-medium">
              {formatCurrency(order.subtotal, settings.currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Shipping Charged</span>
            <span className="font-mono text-slate-200 font-medium">
              +{formatCurrency(order.shippingCost, settings.currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Est. Product Cost</span>
            <span className="font-mono text-slate-400 font-medium">
              {formatCurrency(order.productCost, settings.currencySymbol)}
            </span>
          </div>
          <div className="bg-slate-900 p-2 rounded border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Estimated Profit</span>
            <span
              className={`font-mono text-sm font-bold ${
                order.estimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(order.estimatedProfit, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Associated Production Jobs */}
        <div className="space-y-2">
          <div className="font-semibold text-white text-xs uppercase tracking-wider flex items-center justify-between">
            <span>Production Jobs ({orderJobs.length})</span>
            <span className="text-[11px] text-slate-400 lowercase font-normal">
              Status: {order.productionStatus}
            </span>
          </div>
          <div className="space-y-1.5">
            {orderJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="font-medium text-white">
                      {job.productName} <span className="font-mono text-slate-400">× {job.quantity}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Printer: {job.printerName || 'Unassigned'}</span>
                      <span>•</span>
                      <span>Est. {formatPrintTime(job.estimatedPrintTimeMinutes)}</span>
                      <span>•</span>
                      <span>{job.material} ({job.color})</span>
                    </div>
                  </div>
                </div>
                <JobStatusBadge status={job.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Status History Audit Trail */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="font-semibold text-white text-xs uppercase tracking-wider">
            Status History Trail ({orderHistory.length})
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {orderHistory.map((hist) => (
              <div
                key={hist.id}
                className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] flex items-start justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-300">
                    {hist.previousStatus} → <span className="text-sky-300">{hist.newStatus}</span>
                  </span>
                  {hist.note && <p className="text-slate-400 mt-0.5">{hist.note}</p>}
                </div>
                <div className="text-right text-[10px] text-slate-400 shrink-0">
                  <div>{new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div>{new Date(hist.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProductMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        unmappedOrder={order}
        onMappingResolved={() => setIsMappingModalOpen(false)}
      />

      <PackingSlipModal
        order={order}
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
      />
    </Modal>
  );
};
