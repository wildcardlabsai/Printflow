import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Order, ShippingCarrierId } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { integrationsApi } from '../../lib/api/integrations';
import { Truck, Info, CheckCircle2, ExternalLink, ShieldAlert, Barcode, RefreshCw } from 'lucide-react';

interface ShippingLabelModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { updateOrderShipping } = useDatabase();
  const { showToast } = useNotification();

  const [provider, setProvider] = useState<string>(order?.shippingProvider || 'Royal Mail');
  const [service, setService] = useState<string>(order?.shippingService || 'Tracked 48');
  const [trackingNumber, setTrackingNumber] = useState<string>(order?.trackingNumber || '');
  const [shippingCost, setShippingCost] = useState<number>(order?.shippingCost || 3.39);
  const [markAsShipped, setMarkAsShipped] = useState<boolean>(true);
  const [pushToMarketplace, setPushToMarketplace] = useState<boolean>(
    Boolean(order?.salesChannel === 'Etsy' || order?.salesChannel === 'eBay')
  );
  const [isGeneratingLabel, setIsGeneratingLabel] = useState<boolean>(false);
  const [carrierError, setCarrierError] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);

  if (!order || !isOpen) return null;

  const isMarketplaceOrder = order.salesChannel === 'Etsy' || order.salesChannel === 'eBay';

  const mapProviderToCarrierId = (p: string): ShippingCarrierId => {
    if (p.toLowerCase().includes('royal')) return 'royal_mail';
    if (p.toLowerCase().includes('evri') || p.toLowerCase().includes('hermes')) return 'evri';
    if (p.toLowerCase().includes('dpd')) return 'dpd';
    return 'royal_mail';
  };

  const handleGenerateLabel = async () => {
    setCarrierError(null);
    setIsGeneratingLabel(true);

    try {
      const carrierId = mapProviderToCarrierId(provider);
      const res = await integrationsApi.createShippingLabel({
        orderId: order.internalOrderId,
        carrierId,
        serviceCode: service,
        recipient: {
          name: order.customerName,
          street: order.shippingAddress.split(',')[0] || order.shippingAddress,
          city: order.shippingAddress.split(',')[1]?.trim() || 'London',
          postcode: order.shippingAddress.split(',').pop()?.trim() || 'SW1A 1AA',
          country: 'GB',
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        package: {
          weightGrams: 200,
        },
      });

      if (res.success && res.trackingNumber) {
        setTrackingNumber(res.trackingNumber);
        if (res.cost) setShippingCost(res.cost);
        if (res.labelUrl) setLabelUrl(res.labelUrl);

        showToast({
          type: 'success',
          title: 'Label Generated',
          message: `Carrier assigned tracking barcode ${res.trackingNumber}`,
        });
      } else {
        setCarrierError(
          res.error || `Carrier API credentials not verified. Please supply API key in .env or enter tracking manually.`
        );
      }
    } catch (err: any) {
      setCarrierError(err.message || 'Failed to communicate with shipping carrier adapter.');
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateOrderShipping(order.id, {
        provider,
        service,
        trackingNumber: trackingNumber.trim() || undefined,
        shippingCost: Number(shippingCost) || 0,
        markAsShipped,
      });

      // If requested, transmit tracking directly to marketplace
      if (pushToMarketplace && trackingNumber.trim()) {
        try {
          if (order.salesChannel === 'Etsy') {
            const receiptId = order.marketplaceMetadata?.receiptId || order.externalOrderId?.replace('ETSY-', '');
            if (receiptId) {
              await integrationsApi.fulfillEtsy(receiptId, trackingNumber.trim(), provider);
              showToast({
                type: 'success',
                title: 'Marketplace Synced',
                message: `Order #${receiptId} updated with tracking on Etsy!`,
              });
            }
          } else if (order.salesChannel === 'eBay') {
            const ebayOrderId = order.marketplaceMetadata?.receiptId || order.externalOrderId?.replace('EBAY-', '');
            if (ebayOrderId) {
              await integrationsApi.fulfillEbay(ebayOrderId, trackingNumber.trim(), provider);
              showToast({
                type: 'success',
                title: 'Marketplace Synced',
                message: `Order #${ebayOrderId} updated with tracking on eBay!`,
              });
            }
          }
        } catch (mktErr: any) {
          console.warn('Marketplace fulfillment push note:', mktErr.message);
          showToast({
            type: 'info',
            title: 'Saved Locally',
            message: `Shipping saved in PrintFlow. Marketplace push message: ${mktErr.message}`,
          });
        }
      }

      showToast({
        type: 'success',
        title: 'Shipping Details Saved',
        message: `Order ${order.internalOrderId} dispatched via ${provider} ${trackingNumber ? `(${trackingNumber})` : ''}`,
      });
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dispatch & Shipping: ${order.internalOrderId}`}
      subtitle={`Recipient: ${order.customerName} • ${order.shippingAddress}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Multichannel Fulfillment Info */}
        {isMarketplaceOrder && (
          <div className="p-3 rounded bg-sky-950/40 border border-sky-800/60 text-sky-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{order.salesChannel} Order:</span>
              <span className="font-mono text-slate-300">{order.externalOrderId}</span>
            </div>
            <span className="text-[11px] text-sky-300 font-mono">Auto-Fulfillment Ready</span>
          </div>
        )}

        {/* Carrier API Error banner if encountered */}
        {carrierError && (
          <div className="p-3 rounded bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-rose-100">Carrier API Response</span>
              <p className="text-[11px] text-rose-200/90 mt-0.5">{carrierError}</p>
            </div>
          </div>
        )}

        {/* Shipping Form */}
        <form onSubmit={handleSaveTracking} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Carrier Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  const val = e.target.value;
                  setProvider(val);
                  if (val === 'Royal Mail') setService('Tracked 48');
                  else if (val === 'Evri') setService('Standard Delivery');
                  else if (val === 'DPD') setService('Next Day');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Royal Mail">Royal Mail Click & Drop</option>
                <option value="Evri">Evri (Hermes) Corporate</option>
                <option value="DPD">DPD Local Ship</option>
                <option value="Yodel">Yodel Direct</option>
                <option value="DHL">DHL Express</option>
                <option value="Other">Other / Manual Carrier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Carrier Service
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="Tracked 48, Next Day, etc."
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Automated Label Generation Button */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-medium text-white block">Carrier Adapter Dispatch</span>
              <span className="text-[11px] text-slate-400">
                Call {provider} API to generate consignment barcode and tracking code
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isGeneratingLabel}
              onClick={handleGenerateLabel}
              leftIcon={<Barcode className="w-3.5 h-3.5" />}
            >
              Generate Label
            </Button>
          </div>

          {labelUrl && (
            <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-800 text-xs flex items-center justify-between text-emerald-200">
              <span>PDF Shipping Label Created:</span>
              <a
                href={labelUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline font-mono text-[11px] flex items-center gap-1"
              >
                View / Print Label <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tracking Number / Barcode
            </label>
            <input
              type="text"
              placeholder="e.g. RM492019482GB, EVR891048123"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Actual Postage Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-900">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={markAsShipped}
                onChange={(e) => setMarkAsShipped(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
              />
              <span>Mark order as dispatched / SHIPPED immediately upon saving</span>
            </label>

            {isMarketplaceOrder && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-sky-300 select-none">
                <input
                  type="checkbox"
                  checked={pushToMarketplace}
                  onChange={(e) => setPushToMarketplace(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
                />
                <span>Transmit tracking number & mark fulfilled on {order.salesChannel}</span>
              </label>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Truck className="w-3.5 h-3.5" />}
            >
              Save Shipping & Dispatch
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
