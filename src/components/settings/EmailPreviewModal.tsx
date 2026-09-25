import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { emailService } from '../../lib/emailService';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';
import { Mail, Send, Eye, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'order_confirmation' | 'order_completed' | 'order_dispatched';
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  initialType = 'order_confirmation',
}) => {
  const { orders, settings } = useDatabase();
  const { showToast } = useNotification();

  const [emailType, setEmailType] = useState<'order_confirmation' | 'order_completed' | 'order_dispatched'>(initialType);
  const [testEmailRecipient, setTestEmailRecipient] = useState('MattofTaylor@gmail.com');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  // Use the most recent order for authentic preview or fallback dummy
  const sampleOrder = orders[0] || {
    id: 'sample-01',
    internalOrderId: 'PF-1042',
    salesChannel: 'Etsy',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.jenkins@example.co.uk',
    shippingAddress: '42 Meadow Lane, Harrogate, North Yorkshire, HG2 8NZ, UK',
    shippingProvider: 'Royal Mail',
    shippingService: 'Tracked 48',
    trackingNumber: 'GB48291048291',
    orderDate: new Date().toISOString(),
    total: 38.5,
    items: [
      {
        id: 'item-1',
        orderId: 'sample-01',
        productId: 'prod-01',
        productName: 'Pokemon Graded Slab Display Stand',
        variantName: 'Dual-Color Charcoal & Crimson',
        quantity: 2,
        unitPrice: 16.0,
        costPrice: 4.5,
        filamentGramsPerUnit: 65,
        printTimeMinutesPerUnit: 140,
        subtotal: 32.0,
      },
    ],
  };

  const { subject, html } = emailService.generateHtmlTemplate(emailType, sampleOrder, {
    trackingNumber: 'GB48291048291',
    carrier: 'Royal Mail',
    service: 'Tracked 48',
    businessName: settings.businessName || 'PrintFlow Studio',
    currencySymbol: settings.currencySymbol || '£',
  });

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      showToast({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }

    try {
      setIsSending(true);
      const res = await emailService.sendCustomerEmail(emailType, sampleOrder as any, {
        customRecipient: testEmailRecipient,
        trackingNumber: 'GB48291048291',
        carrier: 'Royal Mail',
        service: 'Tracked 48',
        systemSettings: settings,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: res.simulated ? 'Test Email Logged (Simulated)' : 'Test Email Dispatched!',
          message: `${res.simulated ? 'Logged to Email Activity' : 'Delivered via Resend'} $\\rightarrow$ ${testEmailRecipient}`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Delivery Notice',
          message: res.error || 'Could not dispatch test email.',
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Send Failed', message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Transactional Email Preview"
      subtitle="Interactive responsive email template preview & delivery test"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Template Selector & Send Test Bar */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded border border-slate-800">
            <button
              type="button"
              onClick={() => setEmailType('order_confirmation')}
              className={`px-3 py-1.5 rounded transition-colors ${
                emailType === 'order_confirmation'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Order Confirmation
            </button>

            <button
              type="button"
              onClick={() => setEmailType('order_completed')}
              className={`px-3 py-1.5 rounded transition-colors ${
                emailType === 'order_completed'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Order Completed & QC
            </button>

            <button
              type="button"
              onClick={() => setEmailType('order_dispatched')}
              className={`px-3 py-1.5 rounded transition-colors ${
                emailType === 'order_dispatched'
                  ? 'bg-sky-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Dispatch & Tracking
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Recipient email..."
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white w-56 focus:outline-none focus:border-sky-500"
            />
            <Button
              variant="primary"
              size="sm"
              isLoading={isSending}
              onClick={handleSendTestEmail}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Test
            </Button>
          </div>
        </div>

        {/* Subject Header Preview */}
        <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="text-slate-400 font-semibold shrink-0">Subject:</span>
            <span className="font-mono text-white font-medium truncate">{subject}</span>
          </div>
          <span className="text-[10px] text-slate-500 shrink-0 font-mono">From: {settings.businessName}</span>
        </div>

        {/* HTML Render Container / iFrame Simulation */}
        <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-100 shadow-inner">
          <iframe
            title="Customer Email Preview"
            srcDoc={html}
            className="w-full h-[520px] border-none bg-slate-100"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
          <span>Automated triggers: Order Placed $\rightarrow$ Confirmation; Marked Completed $\rightarrow$ QC Passed; Tracking Entered $\rightarrow$ Dispatch Notice.</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};
