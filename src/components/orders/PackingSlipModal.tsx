import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Order } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency } from '../../lib/calculations';
import {
  Printer,
  FileText,
  CheckSquare,
  Gift,
  Eye,
  EyeOff,
  Copy,
  Download,
  Share2,
  Box,
  Truck,
  Sparkles,
} from 'lucide-react';

interface PackingSlipModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({ order, isOpen, onClose }) => {
  const { settings, products } = useDatabase();

  const [showPrices, setShowPrices] = useState(false);
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  const [includeQC, setIncludeQC] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [customThankYou, setCustomThankYou] = useState(
    'Thank you for supporting our independent 3D printing studio! We hope you love your custom print. If you need any assistance, please get in touch.'
  );

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.orderDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const packDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const addressLines = order.shippingAddress
    ? order.shippingAddress.split(/[\r\n,]+/).map((l) => l.trim()).filter(Boolean)
    : [];

  const displayNotes = order.customerNotes || order.internalNotes;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Packing Slip: ${order.internalOrderId}`}
        subtitle={`Channel: ${order.salesChannel} ${order.externalOrderId ? `• Ref: ${order.externalOrderId}` : ''}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Format selection */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormat('a4')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    format === 'a4'
                      ? 'bg-sky-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard A4 / Letter
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('thermal')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    format === 'thermal'
                      ? 'bg-sky-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4×6" Thermal Slip
                </button>
              </div>

              {/* Toggle Prices */}
              <button
                type="button"
                onClick={() => setShowPrices(!showPrices)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors ${
                  showPrices
                    ? 'border-sky-500 bg-sky-950/40 text-sky-200'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {showPrices ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showPrices ? 'Prices Shown' : 'Gift Mode (Prices Hidden)'}</span>
              </button>

              {/* Toggle QC Checkbox */}
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeQC}
                  onChange={(e) => setIncludeQC(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Quality Sign-off</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print Packing Slip
              </Button>
            </div>
          </div>

          {/* Packing Slip Preview Container */}
          <div className="overflow-x-auto bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-center">
            <div
              id="packing-slip-printable"
              className={`bg-white text-slate-900 shadow-xl transition-all ${
                format === 'a4'
                  ? 'w-[794px] min-h-[1050px] p-10 font-sans text-[13px] leading-relaxed'
                  : 'w-[420px] min-h-[600px] p-6 font-sans text-[11px] leading-tight'
              }`}
              style={{ color: '#0f172a' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                      {settings.businessName || 'PrintFlow Studio'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                    <div>Specialist 3D Printing & Additive Fabrication</div>
                    <div>Order Ref: {order.salesChannel} Store</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest font-bold text-slate-500">
                    Packing Slip
                  </div>
                  <div className="text-xl font-mono font-bold text-slate-900 mt-0.5">
                    {order.internalOrderId}
                  </div>
                  {order.externalOrderId && (
                    <div className="text-xs font-mono text-slate-600">
                      Marketplace #{order.externalOrderId}
                    </div>
                  )}
                  <div className="text-xs text-slate-600 mt-1">
                    Pack Date: <strong>{packDate}</strong>
                  </div>
                </div>
              </div>

              {/* Order Meta & Ship To Grid */}
              <div className="grid grid-cols-2 gap-6 my-6 pt-2">
                {/* Ship To */}
                <div className="p-4 rounded border border-slate-200 bg-slate-50/80">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-700" /> Deliver To:
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{order.customerName}</div>
                  <div className="text-slate-700 text-xs mt-1 leading-relaxed">
                    {addressLines.length > 0 ? (
                      addressLines.map((line, idx) => (
                        <div key={idx} className={idx === addressLines.length - 1 ? 'font-semibold text-slate-900' : ''}>
                          {line}
                        </div>
                      ))
                    ) : (
                      <div>{order.shippingAddress || 'Standard Delivery Address'}</div>
                    )}
                  </div>
                </div>

                {/* Dispatch & Shipping Info */}
                <div className="p-4 rounded border border-slate-200 bg-slate-50/80 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Box className="w-3 h-3 text-slate-700" /> Dispatch Details:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Order Date:</span>
                      <span className="font-medium text-slate-800">{formattedDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Channel:</span>
                      <span className="font-medium text-slate-800">{order.salesChannel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Carrier / Service:</span>
                      <span className="font-semibold text-slate-900">
                        {order.shippingProvider || 'Royal Mail Tracked 48'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Tracking Number:</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {order.trackingNumber || 'Standard Dispatch'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated barcode */}
                  <div className="pt-2 text-center border-t border-slate-200">
                    <div className="font-mono text-[16px] tracking-[6px] text-slate-800 select-none py-1 overflow-hidden font-black">
                      ||| | |||| | |||||| || | || ||| |
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">{order.internalOrderId}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="my-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      <th className="py-2.5 px-2 w-8 text-center">QC</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Material & Specifications</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      {showPrices && (
                        <>
                          <th className="py-2.5 px-3 text-right w-20">Unit</th>
                          <th className="py-2.5 px-3 text-right w-24">Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {order.items.map((item, index) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const materialLabel = prod?.material || 'PLA';
                      const colorLabel = item.variantName || prod?.defaultFilamentColor || 'Standard';

                      return (
                        <tr key={index} className="text-xs">
                          <td className="py-3 px-2 text-center align-middle">
                            <span className="inline-block w-4 h-4 border-2 border-slate-400 rounded-sm"></span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {item.productName}
                            <div className="text-[10px] font-mono text-slate-500 font-normal">
                              SKU: {item.productId}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            <span className="inline-block bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-800">
                              {materialLabel} • {colorLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900 text-sm">
                            {item.quantity}
                          </td>
                          {showPrices && (
                            <>
                              <td className="py-3 px-3 text-right text-slate-700 font-mono">
                                {formatCurrency(item.unitPrice, settings.currencySymbol)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                                {formatCurrency(item.unitPrice * item.quantity, settings.currencySymbol)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Subtotals if showPrices is enabled */}
                {showPrices && (
                  <div className="flex justify-end pt-3 border-t-2 border-slate-800 text-xs">
                    <div className="w-56 space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-mono">
                          {formatCurrency(order.total - order.shippingCost, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping:</span>
                        <span className="font-mono">
                          {order.shippingCost === 0
                            ? 'FREE'
                            : formatCurrency(order.shippingCost, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-300">
                        <span>Grand Total:</span>
                        <span className="font-mono">{formatCurrency(order.total, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Notes / Gift Message if present */}
              {includeNotes && displayNotes && (
                <div className="my-5 p-3.5 rounded border border-amber-300 bg-amber-50/80 text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide text-amber-900 mb-1">
                    <Gift className="w-3.5 h-3.5 text-amber-700" />
                    Customer Note / Gift Message:
                  </div>
                  <div className="text-xs italic text-amber-950 font-serif leading-relaxed">
                    "{displayNotes}"
                  </div>
                </div>
              )}

              {/* Quality Assurance & Inspection Sign-Off */}
              {includeQC && (
                <div className="my-6 p-3.5 rounded border border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Quality Checked:</strong> Clean print lines, no stringing, structural integrity verified.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span>Packed by: ____________</span>
                    <span>Date: ____________</span>
                  </div>
                </div>
              )}

              {/* Thank you note & Footer */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center space-y-1.5 text-slate-600 text-xs">
                <div className="font-medium text-slate-900 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {customThankYou}
                </div>
                <div className="text-[10px] text-slate-500">
                  Please recycle our eco-friendly packaging materials. All custom components fabricated on professional Flashforge 3D printers.
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Press <strong>Ctrl+P</strong> (or <strong>Cmd+P</strong>) or click Print to generate paper slip or PDF.
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Global Print Style for Packing Slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #packing-slip-printable, #packing-slip-printable * {
            visibility: visible;
          }
          #packing-slip-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </>
  );
};
