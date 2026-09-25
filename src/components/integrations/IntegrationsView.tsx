import React, { useState, useEffect } from 'react';
import { integrationsApi, SyncResponse } from '../../lib/api/integrations';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { MarketplaceConnectionStatus, SyncLogEntry, ShippingCarrierConfig } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProductMappingModal } from './ProductMappingModal';
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Truck,
  Layers,
  History,
  Info,
  Unlink,
  AlertTriangle,
  Play,
  Key,
  ShoppingBag,
} from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const { orders, products, customers, settings, refreshData } = useDatabase();
  const { showToast } = useNotification();

  const [statuses, setStatuses] = useState<MarketplaceConnectionStatus[]>([]);
  const [carriers, setCarriers] = useState<ShippingCarrierConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingChannel, setSyncingChannel] = useState<string | null>(null);

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [disconnectConfirmChannel, setDisconnectConfirmChannel] = useState<'Etsy' | 'eBay' | null>(null);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [statusRes, carriersRes, logsRes] = await Promise.all([
        integrationsApi.getStatus(),
        integrationsApi.getCarriers(),
        integrationsApi.getSyncLogs(),
      ]);
      setStatuses(statusRes.marketplaces);
      setCarriers(carriersRes);
      setSyncLogs(logsRes);
    } catch (err: any) {
      console.error('Failed to load integration states:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    // Listen for cross-window OAuth success message
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        showToast({
          type: 'success',
          title: 'Account Connected',
          message: `Successfully connected ${event.data.channel} account!`,
        });
        loadAll();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Connect Etsy OAuth flow
  const handleConnectEtsy = async () => {
    try {
      const { url } = await integrationsApi.getEtsyAuthUrl();
      const popup = window.open(url, 'etsy_oauth', 'width=650,height=750,menubar=no,toolbar=no');
      if (!popup) {
        showToast({
          type: 'error',
          title: 'Popup Blocked',
          message: 'Please allow popups for this window to connect Etsy.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: err.message || 'Ensure ETSY_API_KEY is configured in your server environment.',
      });
    }
  };

  // Connect eBay OAuth flow
  const handleConnectEbay = async () => {
    try {
      const { url } = await integrationsApi.getEbayAuthUrl();
      const popup = window.open(url, 'ebay_oauth', 'width=700,height=800,menubar=no,toolbar=no');
      if (!popup) {
        showToast({
          type: 'error',
          title: 'Popup Blocked',
          message: 'Please allow popups for this window to connect eBay.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: err.message || 'Ensure EBAY_CLIENT_ID and EBAY_CLIENT_SECRET are configured.',
      });
    }
  };

  // Disconnect handler
  const handleConfirmDisconnect = async () => {
    if (!disconnectConfirmChannel) return;
    try {
      if (disconnectConfirmChannel === 'Etsy') {
        await integrationsApi.disconnectEtsy();
      } else {
        await integrationsApi.disconnectEbay();
      }
      showToast({
        type: 'info',
        title: 'Disconnected',
        message: `${disconnectConfirmChannel} credentials have been safely cleared.`,
      });
      setDisconnectConfirmChannel(null);
      await loadAll();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Sync Etsy Orders
  const handleSyncEtsy = async () => {
    try {
      setSyncingChannel('Etsy');
      const res: SyncResponse = await integrationsApi.syncEtsy({
        existingOrders: orders,
        existingProducts: products,
        existingCustomers: customers,
        nextOrderNumber: settings.nextOrderNumber,
        orderPrefix: settings.orderPrefix,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to sync orders');
      }

      // If database state was returned, apply updates to local state
      if (res.updatedOrders) {
        localStorage.setItem('printflow_v1_orders', JSON.stringify(res.updatedOrders));
      }
      if (res.newProductionJobs && res.newProductionJobs.length > 0) {
        const currentJobs = JSON.parse(localStorage.getItem('printflow_v1_production_jobs') || '[]');
        localStorage.setItem(
          'printflow_v1_production_jobs',
          JSON.stringify([...res.newProductionJobs, ...currentJobs])
        );
      }
      if (res.newNextOrderNumber) {
        localStorage.setItem(
          'printflow_v1_settings',
          JSON.stringify({ ...settings, nextOrderNumber: res.newNextOrderNumber })
        );
      }
      refreshData();

      const r = res.result!;
      showToast({
        type: 'success',
        title: 'Etsy Sync Completed',
        message: `Processed ${r.recordsProcessed} orders (${r.recordsCreated} new, ${r.recordsUpdated} updated, ${r.ordersRequiringMapping} unmapped).`,
      });

      await loadAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Sync Failed',
        message: err.message,
      });
    } finally {
      setSyncingChannel(null);
    }
  };

  // Sync eBay Orders
  const handleSyncEbay = async () => {
    try {
      setSyncingChannel('eBay');
      const res: SyncResponse = await integrationsApi.syncEbay({
        existingOrders: orders,
        existingProducts: products,
        existingCustomers: customers,
        nextOrderNumber: settings.nextOrderNumber,
        orderPrefix: settings.orderPrefix,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to sync eBay orders');
      }

      if (res.updatedOrders) {
        localStorage.setItem('printflow_v1_orders', JSON.stringify(res.updatedOrders));
      }
      if (res.newProductionJobs && res.newProductionJobs.length > 0) {
        const currentJobs = JSON.parse(localStorage.getItem('printflow_v1_production_jobs') || '[]');
        localStorage.setItem(
          'printflow_v1_production_jobs',
          JSON.stringify([...res.newProductionJobs, ...currentJobs])
        );
      }
      if (res.newNextOrderNumber) {
        localStorage.setItem(
          'printflow_v1_settings',
          JSON.stringify({ ...settings, nextOrderNumber: res.newNextOrderNumber })
        );
      }
      refreshData();

      const r = res.result!;
      showToast({
        type: 'success',
        title: 'eBay Sync Completed',
        message: `Processed ${r.recordsProcessed} orders (${r.recordsCreated} new, ${r.recordsUpdated} updated).`,
      });

      await loadAll();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Sync Failed',
        message: err.message,
      });
    } finally {
      setSyncingChannel(null);
    }
  };

  const etsyStatus = statuses.find((s) => s.channel === 'Etsy');
  const ebayStatus = statuses.find((s) => s.channel === 'eBay');
  const metaStatus = statuses.find((s) => s.channel === 'Facebook Marketplace');

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-white text-base">Multichannel Integration Hub</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connect live marketplaces, synchronize inbound orders, map product SKUs, and dispatch shipping barcodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMappingModal(true)}
            leftIcon={<Layers className="w-3.5 h-3.5" />}
          >
            Product / SKU Mappings
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadAll}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Hub
          </Button>
        </div>
      </div>

      {/* Marketplaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. ETSY CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Etsy Open API v3</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-950/80 text-orange-300 border border-orange-800">
                    Etsy
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  OAuth 2.0 PKCE • Receipts & Tracking API
                </div>
              </div>

              <div>
                {etsyStatus?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Connection Information */}
            <div className="mt-4 space-y-2.5 text-xs">
              {etsyStatus?.connected ? (
                <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Connected Shop:</span>
                    <span className="font-semibold text-white">{etsyStatus.accountName || 'Active Shop'}</span>
                  </div>
                  {etsyStatus.shopId && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Shop ID:</span>
                      <span className="text-slate-300">{etsyStatus.shopId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Synced:</span>
                    <span className="text-slate-300 font-mono">
                      {etsyStatus.lastSyncAt ? new Date(etsyStatus.lastSyncAt).toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                  Connect your Etsy seller account via OAuth 2.0 PKCE. Requires <code className="text-sky-300 font-mono">ETSY_API_KEY</code> in server environment.
                  <div className="mt-2 text-[10px] text-slate-500 font-mono break-all">
                    Callback URL: {window.location.origin}/api/integrations/etsy/callback
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            {etsyStatus?.connected ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncEtsy}
                  isLoading={syncingChannel === 'Etsy'}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync Etsy Now
                </Button>
                <button
                  onClick={() => setDisconnectConfirmChannel('Etsy')}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <Unlink className="w-3.5 h-3.5" /> Disconnect
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectEtsy}
                leftIcon={<Link2 className="w-3.5 h-3.5" />}
              >
                Connect Etsy
              </Button>
            )}
          </div>
        </div>

        {/* 2. EBAY CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">eBay Sell APIs</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-800">
                    eBay
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  OAuth 2.0 • Fulfillment & Inventory API
                </div>
              </div>

              <div>
                {ebayStatus?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Connection Information */}
            <div className="mt-4 space-y-2.5 text-xs">
              {ebayStatus?.connected ? (
                <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seller Account:</span>
                    <span className="font-semibold text-white">{ebayStatus.accountName || 'eBay Seller'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Synced:</span>
                    <span className="text-slate-300 font-mono">
                      {ebayStatus.lastSyncAt ? new Date(ebayStatus.lastSyncAt).toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                  Connect via eBay Sell OAuth 2.0. Requires <code className="text-sky-300 font-mono">EBAY_CLIENT_ID</code> and <code className="text-sky-300 font-mono">EBAY_CLIENT_SECRET</code>.
                  <div className="mt-2 text-[10px] text-slate-500 font-mono break-all">
                    RuName Redirect: {window.location.origin}/api/integrations/ebay/callback
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            {ebayStatus?.connected ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSyncEbay}
                  isLoading={syncingChannel === 'eBay'}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Sync eBay Now
                </Button>
                <button
                  onClick={() => setDisconnectConfirmChannel('eBay')}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                >
                  <Unlink className="w-3.5 h-3.5" /> Disconnect
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectEbay}
                leftIcon={<Link2 className="w-3.5 h-3.5" />}
              >
                Connect eBay
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Facebook / Meta Status Investigation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Meta / Facebook Marketplace</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/80 text-sky-300 border border-sky-800">
              API Policy Status
            </span>
          </div>
          <span className="px-2.5 py-1 rounded text-xs bg-amber-950/80 text-amber-300 border border-amber-800">
            Manual Order Flow Active
          </span>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            <strong>Official Meta API Capability Status:</strong> Meta has phased out native on-Facebook checkout APIs for standard individual Marketplace consumer sellers, requiring commerce integrations to route through certified enterprise checkout partners or direct website checkout.
          </p>
          <p className="text-slate-400 text-[11px]">
            In PrintFlow, Facebook Marketplace orders are fully supported through our generic order ingestion model. You can create Facebook orders manually or log inquiries with external FB order IDs; they automatically flow into the same production queue, print scheduling, and shipping fulfillment pipelines.
          </p>
        </div>
      </div>

      {/* Shipping Provider Adapters Architecture */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-white text-base">Shipping Carrier Adapters</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pluggable carrier architecture supporting Royal Mail Click & Drop, Evri, and DPD
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carriers.map((carrier) => (
            <div key={carrier.id} className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{carrier.name}</span>
                {carrier.configured ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    API Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                    Key Required
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400">
                Supported services:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                  {carrier.services.map((s) => (
                    <li key={s.code} className="truncate">
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                {carrier.configured ? 'Ready for automated label generation' : 'Set API key in .env to enable live generation'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Sync History Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Integration Sync & Event Logs</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{syncLogs.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Channel</th>
                <th className="px-3.5 py-2.5 font-medium">Action</th>
                <th className="px-3.5 py-2.5 font-medium text-center">Processed</th>
                <th className="px-3.5 py-2.5 font-medium text-center">New Orders</th>
                <th className="px-3.5 py-2.5 font-medium text-center">Updated</th>
                <th className="px-3.5 py-2.5 font-medium">Status</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No sync operations logged yet.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-white font-medium">{log.channel}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      <div>{log.action}</div>
                      {log.errorDetails && log.errorDetails.length > 0 && (
                        <div className="text-[10px] text-rose-400 mt-0.5 truncate max-w-xs">
                          {log.errorDetails.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-slate-300">
                      {log.recordsProcessed}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-emerald-400">
                      {log.recordsCreated}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-sky-400">
                      {log.recordsUpdated}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          log.status === 'success'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disconnect confirmation dialog */}
      <ConfirmDialog
        isOpen={!!disconnectConfirmChannel}
        onClose={() => setDisconnectConfirmChannel(null)}
        onConfirm={handleConfirmDisconnect}
        title={`Disconnect ${disconnectConfirmChannel}?`}
        message={`Are you sure you want to disconnect ${disconnectConfirmChannel}? Inbound synchronization and automatic fulfillment updates will be paused until reconnected.`}
        confirmText="Disconnect Account"
      />

      {/* Product Mapping Modal */}
      <ProductMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
      />
    </div>
  );
};
