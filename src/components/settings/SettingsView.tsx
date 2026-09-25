import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { INTEGRATION_REGISTRY_STATUS } from '../../lib/integrations';
import { IntegrationsView } from '../integrations/IntegrationsView';
import { PrinterFormModal } from '../printers/PrinterFormModal';
import { EmailSettingsView } from './EmailSettingsView';
import { CloudDatabaseSettingsView } from './CloudDatabaseSettingsView';
import { Printer, PrinterStatus } from '../../types';
import { PrinterStatusBadge, PrinterConnectionBadge } from '../ui/Badge';
import {
  Settings as SettingsIcon,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Zap,
  Package,
  Disc,
  Truck,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Link2,
  Database,
  Printer as PrinterIcon,
  Plus,
  Wifi,
  Mail,
  Cloud,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetDatabase, exportDataJSON, importDataJSON, printers } =
    useDatabase();
  const { showToast } = useNotification();

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [currency, setCurrency] = useState(settings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [defaultShippingProvider, setDefaultShippingProvider] = useState(
    settings.defaultShippingProvider
  );
  const [defaultPrinterId, setDefaultPrinterId] = useState(settings.defaultPrinterId);
  const [electricityCostPerHour, setElectricityCostPerHour] = useState(
    settings.electricityCostPerHour
  );
  const [defaultPackagingCost, setDefaultPackagingCost] = useState(settings.defaultPackagingCost);
  const [defaultFilamentCostPerKg, setDefaultFilamentCostPerKg] = useState(
    settings.defaultFilamentCostPerKg
  );
  const [orderPrefix, setOrderPrefix] = useState(settings.orderPrefix);
  const [lowFilamentThresholdG, setLowFilamentThresholdG] = useState(
    settings.lowFilamentThresholdG
  );
  const [lowFilamentAlert, setLowFilamentAlert] = useState(
    settings.notificationPreferences.lowFilamentAlert
  );
  const [orderDeadlines, setOrderDeadlines] = useState(
    settings.notificationPreferences.orderDeadlines
  );
  const [failedPrintAlert, setFailedPrintAlert] = useState(
    settings.notificationPreferences.failedPrintAlert
  );

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'clouddb' | 'printers' | 'emails' | 'integrations' | 'database'>('general');
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      updateSettings({
        businessName: businessName.trim(),
        currency: currency.trim(),
        currencySymbol: currencySymbol.trim(),
        defaultShippingProvider,
        defaultPrinterId,
        electricityCostPerHour: Number(electricityCostPerHour) || 0.2,
        defaultPackagingCost: Number(defaultPackagingCost) || 0.4,
        defaultFilamentCostPerKg: Number(defaultFilamentCostPerKg) || 20,
        orderPrefix: orderPrefix.trim(),
        lowFilamentThresholdG: Number(lowFilamentThresholdG) || 150,
        notificationPreferences: {
          lowFilamentAlert,
          orderDeadlines,
          failedPrintAlert,
        },
      });

      showToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'System parameters and calculation rates updated successfully',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      type: 'success',
      title: 'Database Exported',
      message: 'JSON snapshot downloaded to your device',
    });
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    const res = importDataJSON(importJsonText);
    if (res.success) {
      showToast({ type: 'success', title: 'Import Successful', message: res.message });
      setShowImportModal(false);
      setImportJsonText('');
    } else {
      showToast({ type: 'error', title: 'Import Failed', message: res.message });
    }
  };

  const handleConfirmReset = () => {
    resetDatabase();
    showToast({
      type: 'info',
      title: 'Database Reset',
      message: 'Restored realistic seed products, orders, printers, and filaments',
    });
    setShowResetDialog(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'general'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          General & Costs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clouddb')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'clouddb'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Cloud Database & Sync
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('printers')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'printers'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <PrinterIcon className="w-4 h-4" />
          Printers Hardware ({printers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emails')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'emails'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          Customer Emails
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'integrations'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Integrations & Marketplaces
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'database'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Database className="w-4 h-4" />
          Database & Backups
        </button>
      </div>

      {/* Tab: Printers Hardware Management */}
      {activeTab === 'printers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-white">Registered 3D Printers ({printers.length})</h3>
              <p className="text-xs text-slate-400">
                Flashforge LAN protocol (Port 8898 HTTP REST / Port 8899 TCP Control Socket)
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingPrinter(null);
                setShowPrinterModal(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Printer
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400">
                      <PrinterIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {p.manufacturer} • {p.model}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PrinterConnectionBadge status={p.connectionStatus || 'Connected'} size="sm" />
                    <PrinterStatusBadge status={p.status} size="sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">IP & Socket:</span>
                    <span className="font-mono text-slate-200">
                      {p.ipAddress || '192.168.1.105'}:{p.tcpPort || 8899}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">CheckCode:</span>
                    <span className="font-mono text-slate-200">
                      {p.checkCode ? 'Verified' : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Capabilities:</span>
                    <span className="text-slate-200">
                      {p.capabilities?.multiColor ? '4-Spool IFS Multi-Color' : 'Single Extruder'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Max Bed/Nozzle:</span>
                    <span className="text-slate-200">
                      {p.capabilities?.maxTemp}°C / 600 mm/s
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPrinter(p);
                      setShowPrinterModal(true);
                    }}
                  >
                    Configure Printer
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <PrinterFormModal
            printer={editingPrinter}
            isOpen={showPrinterModal}
            onClose={() => {
              setShowPrinterModal(false);
              setEditingPrinter(null);
            }}
          />
        </div>
      )}

      {/* Tab: Cloud Database & Multi-Device Sync */}
      {activeTab === 'clouddb' && <CloudDatabaseSettingsView />}

      {/* Tab: Customer Email Notifications */}
      {activeTab === 'emails' && <EmailSettingsView />}

      {/* Tab 2: Integrations */}
      {activeTab === 'integrations' && <IntegrationsView />}

      {/* Tab 1: General Settings Form */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Business & Currency */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Building className="w-4 h-4 text-sky-400" />
              <h3 className="font-semibold text-sm text-white">Business Identity & Currency</h3>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Studio / Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Code</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="GBP, USD, EUR"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Symbol</label>
                <input
                  type="text"
                  required
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="£, $, €"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cost & Calculation Constants */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-white">Product Cost Calculation Rates</h3>
          </div>

          <p className="text-xs text-slate-400">
            These default rates feed the automatic production cost and profit calculator across orders and product models:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Filament Cost per kg
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  value={defaultFilamentCostPerKg}
                  onChange={(e) => setDefaultFilamentCostPerKg(parseFloat(e.target.value) || 20)}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard spool rate ({currencySymbol}{(defaultFilamentCostPerKg / 1000).toFixed(4)}/g)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Electricity Cost per Hour
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={electricityCostPerHour}
                  onChange={(e) => setElectricityCostPerHour(parseFloat(e.target.value) || 0.22)}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Average printer power consumption (~350W)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Packaging Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={defaultPackagingCost}
                  onChange={(e) => setDefaultPackagingCost(parseFloat(e.target.value) || 0.45)}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Mailer box, bubble wrap, packing label
              </span>
            </div>
          </div>
        </div>

        {/* Operational Defaults */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <SettingsIcon className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm text-white">Fulfillment & Machine Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Carrier
              </label>
              <select
                value={defaultShippingProvider}
                onChange={(e) => setDefaultShippingProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              >
                <option value="Royal Mail">Royal Mail</option>
                <option value="Evri">Evri</option>
                <option value="DPD">DPD</option>
                <option value="Yodel">Yodel</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default 3D Printer
              </label>
              <select
                value={defaultPrinterId}
                onChange={(e) => setDefaultPrinterId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
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
                Order Prefix
              </label>
              <input
                type="text"
                value={orderPrefix}
                onChange={(e) => setOrderPrefix(e.target.value)}
                placeholder="e.g. PF-"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Low Filament Stock Warning Threshold (grams)
            </label>
            <input
              type="number"
              min="50"
              step="10"
              value={lowFilamentThresholdG}
              onChange={(e) => setLowFilamentThresholdG(parseInt(e.target.value) || 150)}
              className="w-48 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-white">Alert Preferences</h3>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={lowFilamentAlert}
                onChange={(e) => setLowFilamentAlert(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0"
              />
              <span>Trigger visual badge when filament spools fall below threshold</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={orderDeadlines}
                onChange={(e) => setOrderDeadlines(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0"
              />
              <span>Highlight urgent queue jobs nearing dispatch deadlines</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={failedPrintAlert}
                onChange={(e) => setFailedPrintAlert(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0"
              />
              <span>Alert when a job is marked as failed or paused</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md">
            Save System Settings
          </Button>
        </div>
      </form>
      )}

      {/* Tab 3: Database Management & Backups */}
      {activeTab === 'database' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm text-white">Database Operations & Backups</h3>
          <p className="text-xs text-slate-400">
            Export your complete operational state to a JSON file or restore the system back to realistic seed sample data.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBackup}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON Backup
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              Import JSON Backup
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset to Seed Data
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        onConfirm={handleConfirmReset}
        title="Reset Database to Seed Data"
        message="This will repopulate all orders, customers, products, filament spools, and printers with the initial realistic dataset. All newly entered records will be replaced. Are you sure?"
        confirmText="Reset Database"
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Import Database Backup</h3>
            <p className="text-xs text-slate-400">Paste your exported PrintFlow JSON backup below:</p>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-white font-mono focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleImportSubmit}>
                Restore Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
