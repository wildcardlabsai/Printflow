import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ProductMapping, SalesChannel, Order } from '../../types';
import { integrationsApi } from '../../lib/api/integrations';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Trash2, Link, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ProductMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  unmappedOrder?: Order | null;
  onMappingResolved?: () => void;
}

export const ProductMappingModal: React.FC<ProductMappingModalProps> = ({
  isOpen,
  onClose,
  unmappedOrder,
  onMappingResolved,
}) => {
  const { products, updateOrderStatus } = useDatabase();
  const { showToast } = useNotification();

  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New mapping form
  const [salesChannel, setSalesChannel] = useState<SalesChannel>(unmappedOrder?.salesChannel || 'Etsy');
  const [externalSku, setExternalSku] = useState('');
  const [externalListingId, setExternalListingId] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const data = await integrationsApi.getMappings();
      setMappings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMappings();
      if (unmappedOrder) {
        setSalesChannel(unmappedOrder.salesChannel);
        // Find unmapped item in the order
        const unmappedItem = unmappedOrder.items.find((i) => i.productId === 'unmapped');
        if (unmappedItem) {
          setExternalTitle(unmappedItem.productName.replace('[UNMAPPED] ', ''));
        }
      }
    }
  }, [isOpen, unmappedOrder]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || (!externalSku.trim() && !externalListingId.trim())) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide either an External SKU or Listing ID, and select a product.',
      });
      return;
    }

    try {
      await integrationsApi.saveMapping({
        salesChannel,
        externalSku: externalSku.trim(),
        externalListingId: externalListingId.trim(),
        externalTitle: externalTitle.trim() || 'Custom Mapping',
        internalProductId: selectedProductId,
        internalVariantId: selectedVariantId || undefined,
      });

      showToast({
        type: 'success',
        title: 'Mapping Saved',
        message: 'Product SKU mapping registered successfully',
      });

      setExternalSku('');
      setExternalListingId('');
      setExternalTitle('');
      await loadMappings();

      if (unmappedOrder) {
        // Resolve unmapped order to Awaiting Print
        updateOrderStatus(unmappedOrder.id, 'AWAITING PRINT', 'Product mapping confirmed by operator');
        if (onMappingResolved) onMappingResolved();
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      await integrationsApi.deleteMapping(id);
      setMappings(mappings.filter((m) => m.id !== id));
      showToast({ type: 'info', title: 'Mapping Deleted', message: 'Mapping removed' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product / SKU Multichannel Mappings"
      subtitle="Link marketplace listing IDs and external SKUs to internal PrintFlow models"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* If opened for an unmapped order, show banner */}
        {unmappedOrder && (
          <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-100">
                Order {unmappedOrder.internalOrderId} requires product mapping
              </span>
              Map the marketplace listing below to assign it to an internal 3D model. Once saved, this order will be automatically scheduled for production.
            </div>
          </div>
        )}

        {/* Add New Mapping Form */}
        <form onSubmit={handleCreateMapping} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Create New Product / SKU Mapping</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Sales Channel</label>
              <select
                value={salesChannel}
                onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
              >
                <option value="Etsy">Etsy</option>
                <option value="eBay">eBay</option>
                <option value="Facebook Marketplace">Facebook</option>
                <option value="Website">Website</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">External SKU (Optional)</label>
              <input
                type="text"
                placeholder="e.g. PCD-BLK-01"
                value={externalSku}
                onChange={(e) => setExternalSku(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">External Listing ID</label>
              <input
                type="text"
                placeholder="e.g. 184918231"
                value={externalListingId}
                onChange={(e) => setExternalListingId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">External Listing Title</label>
            <input
              type="text"
              placeholder="e.g. Pokemon Graded Card Display Stand PSA Slab"
              value={externalTitle}
              onChange={(e) => setExternalTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-900">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Map to PrintFlow Product *</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedVariantId('');
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Map to Variant (Optional)</label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                disabled={!currentProduct?.variants || currentProduct.variants.length === 0}
              >
                <option value="">Default / Base Variant</option>
                {currentProduct?.variants?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="sm" leftIcon={<Link className="w-3.5 h-3.5" />}>
              Save Mapping
            </Button>
          </div>
        </form>

        {/* Existing Mappings Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Active Channel Mappings ({mappings.length})
            </span>
            <button
              onClick={loadMappings}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="border border-slate-800 rounded overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium">External Listing / SKU</th>
                  <th className="px-3 py-2 font-medium">Internal PrintFlow Model</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      No product mappings configured yet.
                    </td>
                  </tr>
                ) : (
                  mappings.map((m) => {
                    const prod = products.find((p) => p.id === m.internalProductId);
                    const variant = prod?.variants?.find((v) => v.id === m.internalVariantId);

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800">
                            {m.salesChannel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-white truncate max-w-[200px]">{m.externalTitle}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.externalSku ? `SKU: ${m.externalSku}` : ''} {m.externalListingId ? `ID: ${m.externalListingId}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-sky-400">{prod?.name || m.internalProductId}</div>
                          {variant && <div className="text-[10px] text-slate-400">{variant.name}</div>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDeleteMapping(m.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
