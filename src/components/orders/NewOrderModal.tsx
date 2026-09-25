import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { SalesChannel, Product } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { Plus, Trash2, ShoppingCart, UserPlus, Calculator } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orderId: string) => void;
}

interface SelectedItemRow {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { customers, products, settings, createOrder, saveCustomer } = useDatabase();
  const { showToast } = useNotification();

  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [salesChannel, setSalesChannel] = useState<SalesChannel>('Etsy');
  const [externalOrderId, setExternalOrderId] = useState<string>('');
  const [shippingProvider, setShippingProvider] = useState<string>(settings.defaultShippingProvider || 'Royal Mail');
  const [shippingService, setShippingService] = useState<string>('Tracked 48');
  const [shippingCost, setShippingCost] = useState<number>(3.5);
  const [discount, setDiscount] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustStreet, setNewCustStreet] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustPostcode, setNewCustPostcode] = useState('');

  // Items
  const [items, setItems] = useState<SelectedItemRow[]>([
    {
      productId: products[0]?.id || '',
      variantId: products[0]?.variants?.[0]?.id,
      quantity: 1,
      unitPrice: products[0]?.sellingPrice || 9.99,
    },
  ]);

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    const newItems = [...items];
    const firstVariant = prod.variants?.[0];
    const price = prod.sellingPrice + (firstVariant?.priceModifier || 0);

    newItems[index] = {
      productId: prod.id,
      variantId: firstVariant?.id,
      quantity: newItems[index]?.quantity || 1,
      unitPrice: price,
    };
    setItems(newItems);
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const newItems = [...items];
    const current = newItems[index];
    const prod = products.find((p) => p.id === current.productId);
    if (!prod) return;

    const variant = prod.variants?.find((v) => v.id === variantId);
    const price = prod.sellingPrice + (variant?.priceModifier || 0);

    newItems[index] = {
      ...current,
      variantId: variantId || undefined,
      unitPrice: price,
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      quantity: Math.max(1, qty),
    };
    setItems(newItems);
  };

  const handleUnitPriceChange = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      unitPrice: Math.max(0, price),
    };
    setItems(newItems);
  };

  const addItemRow = () => {
    const prod = products[0];
    if (!prod) return;
    setItems([
      ...items,
      {
        productId: prod.id,
        variantId: prod.variants?.[0]?.id,
        quantity: 1,
        unitPrice: prod.sellingPrice,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (it.unitPrice || 0) * (it.quantity || 1), 0);
  const total = Math.max(0, subtotal + Number(shippingCost || 0) - Number(discount || 0));

  const totalEstProductCost = items.reduce((acc, it) => {
    const prod = products.find((p) => p.id === it.productId);
    if (!prod) return acc;
    return acc + (prod.costPrice || 2.5) * (it.quantity || 1);
  }, 0);

  const estimatedProfit = total - totalEstProductCost - Number(shippingCost || 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) {
      showToast({ type: 'error', title: 'Error', message: 'Name and email are required' });
      return;
    }
    const created = saveCustomer({
      id: 'cust-' + Date.now(),
      name: newCustName,
      email: newCustEmail,
      phone: newCustPhone || '',
      address: {
        street: newCustStreet || '1 High Street',
        city: newCustCity || 'London',
        stateOrCounty: '',
        postcode: newCustPostcode || 'SW1A 1AA',
        country: 'United Kingdom',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setCustomerId(created.id);
    setIsCreatingCustomer(false);
    showToast({ type: 'success', title: 'Customer added', message: `${created.name} created successfully` });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast({ type: 'error', title: 'Error', message: 'Please select or create a customer' });
      return;
    }

    if (items.length === 0) {
      showToast({ type: 'error', title: 'Error', message: 'Please add at least one product' });
      return;
    }

    try {
      const order = createOrder({
        customerId,
        salesChannel,
        externalOrderId: externalOrderId.trim() || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
          customPrice: it.unitPrice,
        })),
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
        shippingProvider,
        shippingService,
        customerNotes,
        internalNotes,
      });

      showToast({
        type: 'success',
        title: 'Order Created',
        message: `Order ${order.internalOrderId} created with ${items.length} production jobs queued`,
      });

      onClose();
      if (onSuccess) onSuccess(order.id);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to create order',
        message: err.message || 'Unknown database error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Customer Order"
      subtitle="Manually enter order details. Production jobs will automatically be scheduled."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer & Channel Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Customer</label>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                {isCreatingCustomer ? 'Select Existing' : 'New Customer'}
              </button>
            </div>

            {isCreatingCustomer ? (
              <div className="space-y-2 p-2.5 rounded border border-slate-800 bg-slate-900 text-xs">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={newCustStreet}
                    onChange={(e) => setNewCustStreet(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="Postcode"
                    value={newCustPostcode}
                    onChange={(e) => setNewCustPostcode(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={handleCreateCustomer}>
                  Save & Select Customer
                </Button>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sales Channel
              </label>
              <select
                value={salesChannel}
                onChange={(e) => setSalesChannel(e.target.value as SalesChannel)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Etsy">Etsy</option>
                <option value="eBay">eBay</option>
                <option value="Facebook Marketplace">Facebook Marketplace</option>
                <option value="Website">Website</option>
                <option value="Manual">Manual / Direct</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                External Order ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ETSY-93821039 or EBAY-83921"
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Order Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ordered Products ({items.length})
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addItemRow}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {items.map((row, idx) => {
              const currentProduct = products.find((p) => p.id === row.productId);
              const lineTotal = (row.unitPrice || 0) * (row.quantity || 1);

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 text-xs"
                >
                  {/* Product selector */}
                  <div className="flex-1 min-w-[180px]">
                    <select
                      value={row.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Variant selector if available */}
                  {currentProduct && currentProduct.variants && currentProduct.variants.length > 0 && (
                    <div className="w-full sm:w-36">
                      <select
                        value={row.variantId || ''}
                        onChange={(e) => handleVariantChange(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white focus:outline-none text-[11px]"
                      >
                        {currentProduct.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.priceModifier ? `(+£${v.priceModifier})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white font-mono text-center"
                      title="Quantity"
                    />
                  </div>

                  {/* Unit price */}
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-1.5 text-slate-400">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unitPrice}
                      onChange={(e) => handleUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded pl-5 pr-2 py-1.5 text-white font-mono"
                      title="Unit Price"
                    />
                  </div>

                  {/* Line Total */}
                  <div className="w-20 text-right font-mono font-medium text-slate-200">
                    {formatCurrency(lineTotal, settings.currencySymbol)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping & Financial Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Shipping Provider</label>
                <select
                  value={shippingProvider}
                  onChange={(e) => setShippingProvider(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="Royal Mail">Royal Mail</option>
                  <option value="Evri">Evri</option>
                  <option value="DPD">DPD</option>
                  <option value="Yodel">Yodel</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Service Type</label>
                <input
                  type="text"
                  value={shippingService}
                  onChange={(e) => setShippingService(e.target.value)}
                  placeholder="e.g. Tracked 48"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Shipping Fee Charged
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded pl-6 pr-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Discount Amount</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded pl-6 pr-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Customer / Internal Notes</label>
              <textarea
                rows={2}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Special packaging requests, rush notes, color requests..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Right Live Calculation Summary */}
          <div className="p-3.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-900">
                Live Order Economics
              </div>

              <div className="flex justify-between text-slate-400 py-0.5">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-200">
                  {formatCurrency(subtotal, settings.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400 py-0.5">
                <span>Shipping:</span>
                <span className="font-mono text-slate-200">
                  +{formatCurrency(shippingCost, settings.currencySymbol)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-rose-400 py-0.5">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{formatCurrency(discount, settings.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-semibold text-white py-1 border-t border-slate-900 text-sm">
                <span>Total Charged:</span>
                <span className="font-mono text-sky-400">
                  {formatCurrency(total, settings.currencySymbol)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-900 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Est. Product Cost (Filament + Power):</span>
                  <span className="font-mono text-slate-300">
                    {formatCurrency(totalEstProductCost, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>Estimated Net Profit:</span>
                  <span
                    className={`font-mono font-semibold ${
                      estimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(estimatedProfit, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
                Confirm & Create Order
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
