import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Product, FilamentMaterial, ProductVariant } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { calculateProductCost, formatCurrency } from '../../lib/calculations';
import { Plus, Trash2, Calculator, Layers, Sparkles } from 'lucide-react';
import { CostCalculatorWidget } from './CostCalculatorWidget';

interface ProductFormModalProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { saveProduct, printers, settings } = useDatabase();
  const { showToast } = useNotification();

  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [imageUrl, setImageUrl] = useState(
    product?.imageUrl ||
      'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=600&q=80'
  );
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice || 12.99);
  const [costPrice, setCostPrice] = useState(product?.costPrice || 2.5);
  const [estimatedFilamentGrams, setEstimatedFilamentGrams] = useState(product?.estimatedFilamentGrams || 75);
  const [estimatedPrintTimeMinutes, setEstimatedPrintTimeMinutes] = useState(product?.estimatedPrintTimeMinutes || 120);
  const [material, setMaterial] = useState<FilamentMaterial>(product?.material || 'PLA');
  const [defaultFilamentColor, setDefaultFilamentColor] = useState(product?.defaultFilamentColor || 'Matte Black');
  const [defaultPrinterId, setDefaultPrinterId] = useState(product?.defaultPrinterId || printers[0]?.id || '');
  const [packagingType, setPackagingType] = useState(product?.packagingType || 'Padded Jiffy Bag Small');
  const [isActive, setIsActive] = useState(product ? product.isActive : true);
  const [notes, setNotes] = useState(product?.notes || '');
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants || []);
  const [showCalculator, setShowCalculator] = useState(false);

  if (!isOpen) return null;

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: 'var-' + Date.now(),
      name: 'Color / Size Variant',
      sku: `${sku || 'SKU'}-VAR`,
      priceModifier: 0,
    };
    setVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const list = [...variants];
    list[index] = { ...list[index], ...updates };
    setVariants(list);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleApplyCalculatedCost = (calculatedCost: number, targetSellingPrice: number) => {
    setCostPrice(calculatedCost);
    if (targetSellingPrice > 0) {
      setSellingPrice(targetSellingPrice);
    }
    setShowCalculator(false);
    showToast({
      type: 'info',
      title: 'Cost Applied',
      message: `Production cost updated to ${formatCurrency(calculatedCost, settings.currencySymbol)}`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) {
      showToast({ type: 'error', title: 'Error', message: 'SKU and Product Name are required' });
      return;
    }

    try {
      const saved = saveProduct({
        id: product?.id || 'prod-' + Date.now(),
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        additionalImages: product?.additionalImages || [],
        sellingPrice: Number(sellingPrice) || 0,
        costPrice: Number(costPrice) || 0,
        estimatedFilamentGrams: Number(estimatedFilamentGrams) || 0,
        estimatedPrintTimeMinutes: Number(estimatedPrintTimeMinutes) || 0,
        defaultPrinterId: defaultPrinterId || undefined,
        compatiblePrinters: ['printer-ad5x', 'printer-adv5m'],
        material,
        defaultFilamentColor,
        packagingType,
        isActive,
        variants,
        notes: notes.trim() || undefined,
        createdAt: product?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast({
        type: 'success',
        title: product ? 'Product Updated' : 'Product Created',
        message: `${saved.name} (${saved.sku}) saved successfully`,
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
      title={product ? `Edit Product: ${product.name}` : 'Create New 3D Print Product'}
      subtitle="Configure model parameters, pricing calculations, filament consumption, and print times."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Calculator Banner */}
        <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">
              Need to compute production cost from filament & electricity?
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCalculator(!showCalculator)}
          >
            {showCalculator ? 'Hide Calculator' : 'Open Cost Calculator'}
          </Button>
        </div>

        {showCalculator && (
          <div className="p-1">
            <CostCalculatorWidget
              initialGrams={estimatedFilamentGrams}
              initialPrintHours={estimatedPrintTimeMinutes / 60}
              initialSellingPrice={sellingPrice}
              onApply={handleApplyCalculatedCost}
            />
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">SKU *</label>
            <input
              type="text"
              required
              placeholder="e.g. PF-PKM-STD-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white uppercase font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pokemon Graded Card Display Stand"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
          <textarea
            rows={2}
            placeholder="Product features, dimensions, recommended slicer settings..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        {/* Image & Material */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Material</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as FilamentMaterial)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="PLA">PLA</option>
              <option value="PETG">PETG</option>
              <option value="Silk PLA">Silk PLA</option>
              <option value="TPU">TPU (Flexible)</option>
              <option value="ABS">ABS</option>
              <option value="ASA">ASA</option>
              <option value="Carbon Fiber PLA">Carbon Fiber PLA</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default Filament Color
            </label>
            <input
              type="text"
              placeholder="e.g. Matte Charcoal Black"
              value={defaultFilamentColor}
              onChange={(e) => setDefaultFilamentColor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Manufacturing & Cost Specifications */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-slate-950 border border-slate-800">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Selling Price</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-2 py-1.5 text-xs text-white font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Base Cost Price</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">
                {settings.currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Est. Filament</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={estimatedFilamentGrams}
                onChange={(e) => setEstimatedFilamentGrams(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">grams</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Est. Print Time</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="5"
                value={estimatedPrintTimeMinutes}
                onChange={(e) => setEstimatedPrintTimeMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">mins</span>
            </div>
          </div>
        </div>

        {/* Machine & Packaging Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default Printer
            </label>
            <select
              value={defaultPrinterId}
              onChange={(e) => setDefaultPrinterId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            >
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.model})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Default Packaging Type
            </label>
            <input
              type="text"
              placeholder="e.g. Cardboard Mailer C5, Small Jiffy"
              value={packagingType}
              onChange={(e) => setPackagingType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Product Variants */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Product Variants ({variants.length})
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddVariant}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Variant
            </Button>
          </div>

          {variants.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {variants.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-xs"
                >
                  <input
                    type="text"
                    placeholder="Variant Name"
                    value={v.name}
                    onChange={(e) => handleUpdateVariant(i, { name: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Variant SKU"
                    value={v.sku}
                    onChange={(e) => handleUpdateVariant(i, { sku: e.target.value })}
                    className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono uppercase"
                  />
                  <div className="w-24 relative">
                    <span className="absolute left-2 top-1 text-[11px] text-slate-400">+£</span>
                    <input
                      type="number"
                      step="0.5"
                      value={v.priceModifier}
                      onChange={(e) =>
                        handleUpdateVariant(i, { priceModifier: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-1 py-1 text-white font-mono"
                      title="Price Modifier"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(i)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
            />
            <span>Active listing (available for sales and orders)</span>
          </label>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {product ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
