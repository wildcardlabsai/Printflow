import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Order } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { formatCurrency } from '../../lib/calculations';
import {
  Printer,
  Eye,
  EyeOff,
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
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex flex-wrap items-center gap-3">
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
          <div className="overflow-x-auto bg-slate-950/50 p-4 rounded-lg border border-slate-800 flex justify-center print:bg-transparent print:p-0 print:border-none print:block">
            <div
              id="packing-slip-printable"
              className={`bg-white text-black shadow-xl transition-all print:shadow-none ${
                format === 'a4'
                  ? 'w-[794px] min-h-[1050px] p-10 text-[13px] leading-relaxed'
                  : 'w-[420px] min-h-[600px] p-6 text-[11px] leading-tight'
              }`}
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '2px solid #000' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: '#000' }}>
                    {settings.businessName || 'PokeCraft 3D Prints'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                    <div>Specialist 3D Printing &amp; Additive Fabrication</div>
                    <div>Order Ref: {order.salesChannel} Store</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, color: '#666' }}>
                    Packing Slip
                  </div>
                  <div style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: '#000', marginTop: '2px' }}>
                    {order.internalOrderId}
                  </div>
                  {order.externalOrderId && (
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#555' }}>
                      Marketplace #{order.externalOrderId}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                    Pack Date: <strong>{packDate}</strong>
                  </div>
                </div>
              </div>

              {/* Order Meta & Ship To Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0', paddingTop: '8px' }}>
                {/* Ship To */}
                <div style={{ padding: '14px', border: '1px solid #ddd', borderRadius: '4px', background: '#fafafa' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666', marginBottom: '6px' }}>
                    &#x1F4E6; Deliver To:
                  </div>
                  <div style={{ fontWeight: 700, color: '#000', fontSize: '13px' }}>{order.customerName}</div>
                  <div style={{ fontSize: '12px', color: '#333', marginTop: '4px', lineHeight: '1.6' }}>
                    {addressLines.length > 0 ? (
                      addressLines.map((line, idx) => (
                        <div key={idx} style={idx === addressLines.length - 1 ? { fontWeight: 600 } : {}}>
                          {line}
                        </div>
                      ))
                    ) : (
                      <div>{order.shippingAddress || 'Standard Delivery Address'}</div>
                    )}
                  </div>
                </div>

                {/* Dispatch & Shipping Info */}
                <div style={{ padding: '14px', border: '1px solid #ddd', borderRadius: '4px', background: '#fafafa' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#666', marginBottom: '6px' }}>
                    &#x1F4CB; Dispatch Details:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#888' }}>Order Date:</span>
                      <span style={{ fontWeight: 500, color: '#222' }}>{formattedDate}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#888' }}>Channel:</span>
                      <span style={{ fontWeight: 500, color: '#222' }}>{order.salesChannel}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#888' }}>Carrier / Service:</span>
                      <span style={{ fontWeight: 600, color: '#000' }}>
                        {order.shippingProvider || 'Royal Mail Tracked 48'}
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#888' }}>Tracking Number:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#222' }}>
                        {order.trackingNumber || 'Standard Dispatch'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ margin: '20px 0' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      {includeQC && (
                        <th style={{ padding: '8px 6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444', width: '36px', textAlign: 'center' }}>QC</th>
                      )}
                      <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444' }}>Item Description</th>
                      <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444' }}>Material &amp; Spec</th>
                      <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444', textAlign: 'center', width: '50px' }}>Qty</th>
                      {showPrices && (
                        <>
                          <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444', textAlign: 'right', width: '70px' }}>Unit</th>
                          <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#444', textAlign: 'right', width: '80px' }}>Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const materialLabel = prod?.material || 'PLA';
                      const colorLabel = item.variantName || prod?.defaultFilamentColor || 'Standard';

                      return (
                        <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          {includeQC && (
                            <td style={{ padding: '10px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #999', borderRadius: '2px' }}></span>
                            </td>
                          )}
                          <td style={{ padding: '10px', fontWeight: 600, color: '#000', fontSize: '12px' }}>
                            {item.productName}
                            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', fontWeight: 400 }}>
                              SKU: {item.productId}
                            </div>
                          </td>
                          <td style={{ padding: '10px', color: '#333', fontSize: '12px' }}>
                            <span style={{ background: '#f0f0f0', border: '1px solid #ddd', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 500 }}>
                              {materialLabel} &bull; {colorLabel}
                            </span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: '#000', fontSize: '14px' }}>
                            {item.quantity}
                          </td>
                          {showPrices && (
                            <>
                              <td style={{ padding: '10px', textAlign: 'right', color: '#444', fontFamily: 'monospace', fontSize: '12px' }}>
                                {formatCurrency(item.unitPrice, settings.currencySymbol)}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#000', fontFamily: 'monospace', fontSize: '12px' }}>
                                {formatCurrency(item.unitPrice * item.quantity, settings.currencySymbol)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {showPrices && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '2px solid #000' }}>
                    <div style={{ width: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', padding: '3px 0' }}>
                        <span>Items Subtotal:</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {formatCurrency(order.total - order.shippingCost, settings.currencySymbol)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', padding: '3px 0' }}>
                        <span>Shipping:</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {order.shippingCost === 0
                            ? 'FREE'
                            : formatCurrency(order.shippingCost, settings.currencySymbol)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#000', paddingTop: '6px', borderTop: '1px solid #ccc' }}>
                        <span>Grand Total:</span>
                        <span style={{ fontFamily: 'monospace' }}>{formatCurrency(order.total, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Notes / Gift Message */}
              {includeNotes && displayNotes && (
                <div style={{ margin: '16px 0', padding: '12px', borderRadius: '4px', border: '1px solid #e5c07b', background: '#fef9ef', color: '#333' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#8b6914', marginBottom: '4px' }}>
                    Customer Note / Gift Message:
                  </div>
                  <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#444', lineHeight: '1.5' }}>
                    &ldquo;{displayNotes}&rdquo;
                  </div>
                </div>
              )}

              {/* Quality Assurance Sign-Off */}
              {includeQC && (
                <div style={{ margin: '20px 0', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#444' }}>
                  <div>
                    <strong>&#x2705; Quality Checked:</strong> Clean print lines, no stringing, structural integrity verified.
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    Packed by: ____________ &nbsp;&nbsp; Date: ____________
                  </div>
                </div>
              )}

              {/* Thank you note & Footer */}
              <div style={{ marginTop: '30px', paddingTop: '14px', borderTop: '1px solid #ddd', textAlign: 'center', color: '#666', fontSize: '11px' }}>
                <div style={{ fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                  {customThankYou}
                </div>
                <div style={{ fontSize: '10px', color: '#999' }}>
                  Please recycle our eco-friendly packaging materials. All custom components fabricated on professional Flashforge 3D printers.
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 print:hidden">
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

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #packing-slip-printable, #packing-slip-printable * {
            visibility: visible !important;
          }
          #packing-slip-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </>
  );
};
