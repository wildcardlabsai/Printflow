import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency, formatPrintTime } from '../../lib/calculations';
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import {
  Box,
  Plus,
  Search,
  Calculator,
  Edit,
  Trash2,
  Clock,
  Disc,
  Tag,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { CostCalculatorWidget } from './CostCalculatorWidget';

interface ProductsViewProps {
  onOpenProductModal: (product?: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onOpenProductModal }) => {
  const { products, deleteProduct, settings } = useDatabase();
  const { showToast } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [showCalculator, setShowCalculator] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) => {
    if (materialFilter !== 'ALL' && p.material !== materialFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchDesc) return false;
    }
    return true;
  });

  const handleDeleteConfirm = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    showToast({
      type: 'info',
      title: 'Product Deleted',
      message: `${productToDelete.name} was removed from the catalog`,
    });
    setProductToDelete(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Bar with Search & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search products by SKU, name, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculator(!showCalculator)}
              leftIcon={<Calculator className="w-3.5 h-3.5" />}
            >
              {showCalculator ? 'Hide Calculator' : 'Cost Calculator'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenProductModal()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Product
            </Button>
          </div>
        </div>

        {/* Material Filters */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">Material Filter:</span>
          {['ALL', 'PLA', 'PETG', 'Silk PLA', 'TPU', 'ABS'].map((mat) => (
            <button
              key={mat}
              onClick={() => setMaterialFilter(mat)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                materialFilter === mat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {mat === 'ALL' ? 'All Materials' : mat}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded Cost Calculator if toggled */}
      {showCalculator && (
        <div className="p-1">
          <CostCalculatorWidget />
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const grossProfit = product.sellingPrice - product.costPrice;
          const profitMargin =
            product.sellingPrice > 0 ? ((grossProfit / product.sellingPrice) * 100).toFixed(1) : 0;

          return (
            <div
              key={product.id}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-sm group"
            >
              <div>
                {/* Image and badges */}
                <div className="relative h-44 bg-slate-950 overflow-hidden border-b border-slate-800">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-slate-950/85 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-sky-400 border border-slate-700 font-semibold">
                      {product.sku}
                    </span>
                    <span className="bg-slate-950/85 backdrop-blur px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-700 font-medium">
                      {product.material}
                    </span>
                  </div>
                  {!product.isActive && (
                    <div className="absolute top-2.5 right-2.5 bg-rose-950/90 text-rose-300 border border-rose-800 text-[10px] px-2 py-0.5 rounded font-semibold">
                      Inactive
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5">
                  <h3 className="font-semibold text-white text-sm leading-snug line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Print & Filament metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">
                        {formatPrintTime(product.estimatedPrintTimeMinutes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Disc className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{product.estimatedFilamentGrams}g filament</span>
                    </div>
                  </div>

                  {/* Color & packaging */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Default: {product.defaultFilamentColor}</span>
                    {product.variants && product.variants.length > 0 && (
                      <span className="text-sky-400 font-mono">
                        {product.variants.length} variant{product.variants.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing & Footer Actions */}
              <div className="p-4 pt-2 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono font-bold text-white text-base">
                      {formatCurrency(product.sellingPrice, settings.currencySymbol)}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      Cost: {formatCurrency(product.costPrice, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                    Profit: +{formatCurrency(grossProfit, settings.currencySymbol)} ({profitMargin}%)
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenProductModal(product)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Edit Product"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProductToDelete(product)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-lg">
          No products match the selected criteria.
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}" (${productToDelete?.sku})? This cannot be undone.`}
        confirmText="Delete Product"
      />
    </div>
  );
};
