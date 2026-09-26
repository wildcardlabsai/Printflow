import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useDatabase } from '../../context/DatabaseContext';
import { Product, Customer, FilamentMaterial } from '../../types';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X } from 'lucide-react';

type ImportType = 'products' | 'orders';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: ImportType;
}

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  rowNumber: number;
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows = lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}

const PRODUCT_FIELDS = [
  { key: 'name', label: 'Product Name', required: true, example: 'Pikachu Figure' },
  { key: 'sku', label: 'SKU', required: false, example: 'PIK-001' },
  { key: 'selling_price', label: 'Selling Price', required: true, example: '16.99' },
  { key: 'cost_price', label: 'Cost Price', required: false, example: '4.50' },
  { key: 'material', label: 'Material', required: false, example: 'PLA' },
  { key: 'color', label: 'Default Color', required: false, example: 'Yellow' },
  { key: 'filament_grams', label: 'Filament (g)', required: false, example: '45' },
  { key: 'print_time_mins', label: 'Print Time (mins)', required: false, example: '180' },
  { key: 'description', label: 'Description', required: false, example: 'Detailed Pikachu figure' },
  { key: 'packaging', label: 'Packaging Type', required: false, example: 'Bubble Wrap Box' },
];

const ORDER_FIELDS = [
  { key: 'customer_name', label: 'Customer Name', required: true, example: 'John Smith' },
  { key: 'customer_email', label: 'Customer Email', required: true, example: 'john@example.com' },
  { key: 'product_name', label: 'Product Name', required: true, example: 'Pikachu Figure' },
  { key: 'quantity', label: 'Quantity', required: false, example: '1' },
  { key: 'unit_price', label: 'Unit Price', required: true, example: '16.99' },
  { key: 'shipping_address', label: 'Shipping Address', required: false, example: '123 Main St, London, SW1A 1AA' },
  { key: 'channel', label: 'Sales Channel', required: false, example: 'Etsy' },
  { key: 'external_order_id', label: 'External Order ID', required: false, example: '#29481948' },
  { key: 'shipping_cost', label: 'Shipping Cost', required: false, example: '3.99' },
  { key: 'status', label: 'Status', required: false, example: 'NEW' },
];

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, importType }) => {
  const { saveProduct, createOrder, products, customers, saveCustomer } = useDatabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvText, setCsvText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importResult, setImportResult] = useState<{ success: number; errors: number; messages: string[] }>({
    success: 0, errors: 0, messages: [],
  });

  const fields = importType === 'products' ? PRODUCT_FIELDS : ORDER_FIELDS;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const handlePasteCSV = () => {
    if (csvText.trim()) processCSV(csvText);
  };

  const processCSV = (text: string) => {
    const { headers: h, rows } = parseCSV(text);
    setHeaders(h);

    const parsed: ParsedRow[] = rows.map((row, idx) => {
      const errors: string[] = [];
      const requiredFields = fields.filter((f) => f.required);
      for (const f of requiredFields) {
        const val = findFieldValue(row, f.key, h);
        if (!val) errors.push(`Missing required field: ${f.label}`);
      }
      return { data: row, errors, rowNumber: idx + 2 };
    });

    setParsedData(parsed);
    setStep('preview');
  };

  const findFieldValue = (row: Record<string, string>, fieldKey: string, csvHeaders: string[]): string => {
    if (row[fieldKey]) return row[fieldKey];
    const altNames: Record<string, string[]> = {
      name: ['product_name', 'item_name', 'title', 'product', 'item'],
      sku: ['sku', 'product_sku', 'item_sku', 'code'],
      selling_price: ['price', 'selling_price', 'sell_price', 'retail_price', 'unit_price'],
      cost_price: ['cost', 'cost_price', 'base_cost'],
      material: ['material', 'filament_type', 'filament_material'],
      color: ['color', 'colour', 'default_color', 'filament_color'],
      filament_grams: ['filament_grams', 'filament_g', 'weight_g', 'grams', 'filament_weight'],
      print_time_mins: ['print_time', 'print_time_mins', 'print_minutes', 'time_mins', 'print_time_minutes'],
      description: ['description', 'desc', 'notes', 'details'],
      packaging: ['packaging', 'packaging_type', 'package', 'pack_type'],
      customer_name: ['customer_name', 'customer', 'name', 'buyer', 'buyer_name', 'recipient'],
      customer_email: ['customer_email', 'email', 'buyer_email'],
      product_name: ['product_name', 'product', 'item', 'item_name', 'title'],
      quantity: ['quantity', 'qty', 'amount', 'count'],
      unit_price: ['unit_price', 'price', 'item_price', 'selling_price'],
      shipping_address: ['shipping_address', 'address', 'ship_to', 'delivery_address'],
      channel: ['channel', 'sales_channel', 'source', 'platform', 'marketplace'],
      external_order_id: ['external_order_id', 'external_id', 'marketplace_id', 'order_ref', 'ref'],
      shipping_cost: ['shipping_cost', 'shipping', 'postage', 'delivery_cost'],
      status: ['status', 'order_status'],
    };
    const alts = altNames[fieldKey] || [];
    for (const alt of alts) {
      if (row[alt]) return row[alt];
    }
    return '';
  };

  const getVal = (row: Record<string, string>, key: string) => findFieldValue(row, key, headers);

  const handleImport = () => {
    const validRows = parsedData.filter((r) => r.errors.length === 0);
    let successCount = 0;
    let errorCount = 0;
    const messages: string[] = [];

    if (importType === 'products') {
      for (const row of validRows) {
        try {
          const material = (getVal(row.data, 'material') || 'PLA') as FilamentMaterial;
          const validMaterials: FilamentMaterial[] = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'Silk PLA', 'Carbon Fiber PLA', 'Other'];
          const product: Product = {
            id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            name: getVal(row.data, 'name'),
            sku: getVal(row.data, 'sku') || 'SKU-' + Date.now().toString(36).substring(5),
            description: getVal(row.data, 'description') || '',
            imageUrl: '',
            additionalImages: [],
            sellingPrice: parseFloat(getVal(row.data, 'selling_price')) || 0,
            costPrice: parseFloat(getVal(row.data, 'cost_price')) || 0,
            estimatedFilamentGrams: parseFloat(getVal(row.data, 'filament_grams')) || 0,
            estimatedPrintTimeMinutes: parseFloat(getVal(row.data, 'print_time_mins')) || 0,
            material: validMaterials.includes(material) ? material : 'PLA',
            defaultFilamentColor: getVal(row.data, 'color') || 'Standard',
            packagingType: getVal(row.data, 'packaging') || 'Standard Box',
            compatiblePrinters: [],
            isActive: true,
            variants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveProduct(product);
          successCount++;
        } catch (err: any) {
          errorCount++;
          messages.push(`Row ${row.rowNumber}: ${err.message}`);
        }
      }
    } else {
      for (const row of validRows) {
        try {
          const productName = getVal(row.data, 'product_name');
          const existingProduct = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
          const unitPrice = parseFloat(getVal(row.data, 'unit_price')) || 0;
          const quantity = parseInt(getVal(row.data, 'quantity')) || 1;
          const shippingCost = parseFloat(getVal(row.data, 'shipping_cost')) || 0;
          const channelRaw = getVal(row.data, 'channel') || 'Manual';
          const validChannels = ['Etsy', 'eBay', 'Facebook Marketplace', 'Website', 'Manual', 'Other'];
          const channel = validChannels.includes(channelRaw) ? channelRaw : 'Manual';

          const customerName = getVal(row.data, 'customer_name');
          const customerEmail = getVal(row.data, 'customer_email');
          let customer = customers.find(
            (c) => c.email.toLowerCase() === customerEmail.toLowerCase()
          );
          if (!customer) {
            customer = saveCustomer({
              id: 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              name: customerName,
              email: customerEmail,
              phone: '',
              address: { street: '', city: '', stateOrCounty: '', postcode: '', country: '' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }

          createOrder({
            customerId: customer.id,
            salesChannel: channel as any,
            externalOrderId: getVal(row.data, 'external_order_id') || undefined,
            items: [
              {
                productId: existingProduct?.id || 'unknown',
                quantity,
                customPrice: unitPrice,
              },
            ],
            shippingCost,
          });
          successCount++;
        } catch (err: any) {
          errorCount++;
          messages.push(`Row ${row.rowNumber}: ${err.message}`);
        }
      }
    }

    const skipped = parsedData.filter((r) => r.errors.length > 0).length;
    if (skipped > 0) {
      messages.unshift(`${skipped} row(s) skipped due to missing required fields`);
    }

    setImportResult({ success: successCount, errors: errorCount + skipped, messages });
    setStep('done');
  };

  const handleClose = () => {
    setCsvText('');
    setParsedData([]);
    setHeaders([]);
    setStep('upload');
    setImportResult({ success: 0, errors: 0, messages: [] });
    onClose();
  };

  const validCount = parsedData.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedData.filter((r) => r.errors.length > 0).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Import ${importType === 'products' ? 'Products' : 'Orders'} from CSV`}
      subtitle="Upload a CSV file or paste CSV data to bulk import"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {step === 'upload' && (
          <>
            {/* Expected format */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white">Expected CSV Columns</h4>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className={`font-mono ${f.required ? 'text-sky-400' : 'text-slate-400'}`}>
                      {f.key}
                    </span>
                    {f.required && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">REQ</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                Column headers are flexible — e.g. "price", "selling_price", or "unit_price" all work.
              </p>
            </div>

            {/* File upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-sky-600 hover:bg-sky-950/10 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-medium">Click to upload CSV file</p>
              <p className="text-xs text-slate-500 mt-1">or drag and drop a .csv file here</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Or paste */}
            <div className="text-center text-xs text-slate-500">— or paste CSV data below —</div>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`${fields.map((f) => f.key).join(',')}\n${fields.map((f) => f.example).join(',')}`}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handlePasteCSV} disabled={!csvText.trim()}>
                Parse CSV
              </Button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validCount} valid row{validCount !== 1 ? 's' : ''}
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950/40 border border-amber-800 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errorCount} row{errorCount !== 1 ? 's' : ''} with errors (will be skipped)
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="px-2.5 py-2 font-medium w-10">#</th>
                    <th className="px-2.5 py-2 font-medium w-14">Status</th>
                    {fields.filter((f) => f.required).map((f) => (
                      <th key={f.key} className="px-2.5 py-2 font-medium">{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {parsedData.slice(0, 50).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.errors.length > 0 ? 'bg-rose-950/20' : 'bg-slate-900/50'}
                    >
                      <td className="px-2.5 py-2 font-mono text-slate-500">{row.rowNumber}</td>
                      <td className="px-2.5 py-2">
                        {row.errors.length > 0 ? (
                          <span className="text-rose-400" title={row.errors.join('; ')}>
                            <X className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      {fields.filter((f) => f.required).map((f) => (
                        <td key={f.key} className="px-2.5 py-2 text-slate-200 max-w-[160px] truncate">
                          {getVal(row.data, f.key) || (
                            <span className="text-rose-400 italic">missing</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 50 && (
                <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-950">
                  Showing first 50 of {parsedData.length} rows
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => { setStep('upload'); setParsedData([]); }}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImport}
                  disabled={validCount === 0}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Import {validCount} {importType === 'products' ? 'Product' : 'Order'}{validCount !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-4">
            {importResult.success > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-950/60 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white">
                  Successfully imported {importResult.success} {importType === 'products' ? 'product' : 'order'}{importResult.success !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-rose-950/60 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <p className="text-sm font-semibold text-white">Import failed</p>
              </div>
            )}

            {importResult.messages.length > 0 && (
              <div className="text-left bg-slate-950 border border-slate-800 rounded p-3 max-h-40 overflow-y-auto">
                {importResult.messages.map((msg, i) => (
                  <div key={i} className="text-[11px] text-amber-300 py-0.5">{msg}</div>
                ))}
              </div>
            )}

            <Button variant="primary" size="sm" onClick={handleClose}>Done</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
