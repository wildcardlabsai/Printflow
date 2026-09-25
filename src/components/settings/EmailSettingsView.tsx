import React, { useState, useEffect } from 'react';
import { emailService, EmailNotificationSettings, EmailLogEntry } from '../../lib/emailService';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { EmailPreviewModal } from './EmailPreviewModal';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Key,
  Shield,
  Clock,
  Sparkles,
  Truck,
  Package,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export const EmailSettingsView: React.FC = () => {
  const { showToast } = useNotification();

  const [settings, setSettings] = useState<EmailNotificationSettings>(emailService.getSettings());
  const [logs, setLogs] = useState<EmailLogEntry[]>(emailService.getLogs());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewType, setPreviewType] = useState<'order_confirmation' | 'order_completed' | 'order_dispatched' | null>(null);

  // Quick test sender
  const [testEmail, setTestEmail] = useState('MattofTaylor@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const handleLogsChange = () => setLogs(emailService.getLogs());
    window.addEventListener('printflow_email_logs_changed', handleLogsChange);
    return () => window.removeEventListener('printflow_email_logs_changed', handleLogsChange);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      emailService.saveSettings(settings);
      showToast({
        type: 'success',
        title: 'Email Settings Saved',
        message: 'Customer transactional email preferences updated successfully.',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendQuickTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      showToast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setIsSendingTest(true);
      const dummyOrder = {
        id: 'test-order-01',
        internalOrderId: 'PF-TEST',
        salesChannel: 'Website' as const,
        customerName: 'Test Customer',
        customerEmail: testEmail,
        shippingAddress: '10 High Street, Harrogate, HG1 1AA, UK',
        orderDate: new Date().toISOString(),
        total: 24.0,
        items: [
          {
            id: 'item-1',
            orderId: 'test-order-01',
            productId: 'prod-01',
            productName: 'Sample 3D Print',
            quantity: 1,
            unitPrice: 24.0,
            costPrice: 4.0,
            filamentGramsPerUnit: 50,
            printTimeMinutesPerUnit: 90,
            subtotal: 24.0,
          },
        ],
      } as any;

      const res = await emailService.sendCustomerEmail('order_confirmation', dummyOrder, {
        customRecipient: testEmail,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: res.simulated ? 'Test Email Logged (Simulated)' : 'Test Email Sent via Resend!',
          message: `Dispatched to ${testEmail}`,
        });
      } else {
        showToast({ type: 'warning', title: 'Delivery Notice', message: res.error || 'Check Resend API Key.' });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Send Error', message: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Master Toggle Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              <h3 className="font-semibold text-white text-base">Customer Transactional Emails</h3>
            </div>
            <p className="text-xs text-slate-400">
              Automatically send branded email updates to customers when orders are placed, completed, or shipped.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* 3 Lifecycle Triggers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Order Confirmation */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-sky-950/60 border border-sky-800 flex items-center justify-center text-sky-400">
                  <Package className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendOrderConfirmation}
                  onChange={(e) => setSettings({ ...settings, sendOrderConfirmation: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-white text-sm">1. Order Confirmation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Triggered automatically when a new order arrives on the platform. Includes items summary, quantities, specifications, and delivery address.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewType('order_confirmation')}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Preview Template
            </Button>
          </div>

          {/* 2. Order Completed */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendOrderCompleted}
                  onChange={(e) => setSettings({ ...settings, sendOrderCompleted: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-white text-sm">2. Order Completed & QC</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Triggered when an order finishes 3D printing and is marked <strong>COMPLETED</strong>. Reassures customer that fabrication passed inspection.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewType('order_completed')}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Preview Template
            </Button>
          </div>

          {/* 3. Dispatch & Tracking */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded bg-indigo-950/60 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <Truck className="w-4 h-4" />
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendOrderDispatched}
                  onChange={(e) => setSettings({ ...settings, sendOrderDispatched: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
              <h4 className="font-bold text-white text-sm">3. Dispatch & Tracking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Triggered immediately when a <strong>tracking number</strong> is entered. Embeds courier name and a direct clickable tracking link.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewType('order_dispatched')}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Preview Template
            </Button>
          </div>
        </div>

        {/* Sender & Provider Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-400" />
              <h3 className="font-semibold text-sm text-white">Email Provider & Sender Identity</h3>
            </div>
            <span className="text-[11px] text-slate-400">Works in simulated mode without an API key</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Dispatch Provider
              </label>
              <select
                value={settings.provider}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              >
                <option value="simulated">In-App Simulation & Log (No API key needed)</option>
                <option value="resend">Resend (Live Production - 3,000 Free Emails/Mo)</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {settings.provider === 'resend'
                  ? 'Sends authentic emails to customer inboxes via Resend API.'
                  : 'Simulates email delivery and records events in the Activity Log below.'}
              </span>
            </div>

            {settings.provider === 'resend' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resend API Key (<a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">get key</a>)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="re_123456789..."
                    value={settings.apiKey || ''}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2 text-[11px] text-slate-400 hover:text-white"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex 3D Print Studio"
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                From Email Address
              </label>
              <input
                type="email"
                placeholder="orders@yourdomain.co.uk"
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reply-To Email Address
              </label>
              <input
                type="email"
                placeholder="support@yourdomain.co.uk"
                value={settings.replyToEmail || ''}
                onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Email Footer Note
            </label>
            <input
              type="text"
              placeholder="e.g. Fabricated with care using Flashforge multi-material hardware."
              value={settings.customFooterNote || ''}
              onChange={(e) => setSettings({ ...settings, customFooterNote: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white"
            />
          </div>

          {/* Quick Test Sender */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-medium text-white">Send Instant Test Email to:</span>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white w-64"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isSendingTest}
              onClick={handleSendQuickTest}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Test Email
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Save Email Preferences
            </Button>
          </div>
        </div>
      </form>

      {/* Customer Email Activity & Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm text-white">Customer Email Activity Log ({logs.length})</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              emailService.saveLogs([]);
              setLogs([]);
            }}
            className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
          >
            Clear Log
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No customer emails triggered yet. Create an order, mark one completed, or enter a tracking number to test.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                        log.type === 'order_confirmation'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : log.type === 'order_completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-white font-medium">{log.orderInternalId}</span>
                    <span className="text-slate-400">$\rightarrow$ {log.recipientEmail}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-md">
                    {log.subject}
                    {log.trackingNumber && (
                      <span className="ml-2 font-mono text-sky-300">
                        [{log.carrier}: {log.trackingNumber}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      log.status === 'sent'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.status === 'simulated'
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {log.status === 'sent' ? 'Sent (Live)' : log.status === 'simulated' ? 'Simulated' : 'Failed'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {previewType && (
        <EmailPreviewModal
          isOpen={Boolean(previewType)}
          onClose={() => setPreviewType(null)}
          initialType={previewType}
        />
      )}
    </div>
  );
};
