import { Order, OrderItem, SystemSettings } from '../types';

export interface EmailNotificationSettings {
  enabled: boolean;
  sendOrderConfirmation: boolean;
  sendOrderCompleted: boolean;
  sendOrderDispatched: boolean;
  provider: 'resend' | 'simulated';
  apiKey?: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  customFooterNote?: string;
}

export interface EmailLogEntry {
  id: string;
  orderId: string;
  orderInternalId: string;
  recipientEmail: string;
  recipientName: string;
  type: 'order_confirmation' | 'order_completed' | 'order_dispatched';
  subject: string;
  status: 'sent' | 'simulated' | 'failed';
  timestamp: string;
  trackingNumber?: string;
  carrier?: string;
  previewSnippet: string;
  error?: string;
}

const SETTINGS_KEY = 'printflow_v1_email_settings';
const LOGS_KEY = 'printflow_v1_email_logs';

export const DEFAULT_EMAIL_SETTINGS: EmailNotificationSettings = {
  enabled: true,
  sendOrderConfirmation: true,
  sendOrderCompleted: true,
  sendOrderDispatched: true,
  provider: 'simulated',
  apiKey: '',
  fromName: 'PokeCraft 3D Prints',
  fromEmail: 'orders@pokecraft3dprints.co.uk',
  replyToEmail: 'support@pokecraft3dprints.co.uk',
  customFooterNote: 'Hand-crafted and precision fabricated by PokeCraft 3D Prints on professional 3D printers.',
};

export const emailService = {
  getSettings(): EmailNotificationSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return DEFAULT_EMAIL_SETTINGS;
      return { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_EMAIL_SETTINGS;
    }
  },

  saveSettings(settings: EmailNotificationSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('printflow_email_settings_changed', { detail: settings }));
  },

  getLogs(): EmailLogEntry[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveLogs(logs: EmailLogEntry[]): void {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('printflow_email_logs_changed'));
  },

  getTrackingUrl(carrier: string = '', trackingNumber: string = ''): string {
    const c = carrier.toLowerCase();
    const t = encodeURIComponent(trackingNumber.trim());
    if (c.includes('royal mail')) {
      return `https://www.royalmail.com/track-your-item#/tracking-results/${t}`;
    }
    if (c.includes('evri') || c.includes('hermes')) {
      return `https://www.evri.com/track-a-parcel?trackingNumber=${t}`;
    }
    if (c.includes('dpd')) {
      return `https://www.dpd.co.uk/tracking/${t}`;
    }
    if (c.includes('ups')) {
      return `https://www.ups.com/track?tracknum=${t}`;
    }
    return `https://parcelsapp.com/en/tracking/${t}`;
  },

  /**
   * Generates responsive HTML email template for customer notifications
   */
  generateHtmlTemplate(
    type: 'order_confirmation' | 'order_completed' | 'order_dispatched',
    order: Partial<Order>,
    options?: {
      trackingNumber?: string;
      carrier?: string;
      service?: string;
      businessName?: string;
      currencySymbol?: string;
    }
  ): { subject: string; html: string } {
    const settings = this.getSettings();
    const studioName = options?.businessName || settings.fromName || 'PrintFlow Studio';
    const currency = options?.currencySymbol || '£';
    const orderNum = order.internalOrderId || '#PF-1001';
    const customerName = order.customerName || 'Valued Customer';
    const items = order.items || [];
    const carrier = options?.carrier || order.shippingProvider || 'Royal Mail';
    const service = options?.service || order.shippingService || 'Tracked 48';
    const tracking = options?.trackingNumber || order.trackingNumber || '';
    const trackingUrl = this.getTrackingUrl(carrier, tracking);

    let subject = '';
    let headline = '';
    let subheadline = '';
    let bodyHighlight = '';
    let statusPill = '';

    if (type === 'order_confirmation') {
      subject = `Order Confirmed: ${orderNum} — ${studioName}`;
      headline = 'We’ve Received Your Order!';
      subheadline = `Thank you for your order, ${customerName}. Your 3D printed components have been scheduled in our production queue.`;
      statusPill = 'bg-sky-100 text-sky-800';
      bodyHighlight = `
        <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #0369a1; display: block; font-size: 14px; margin-bottom: 4px;">What Happens Next?</strong>
          <span style="color: #475569; font-size: 13px; line-height: 1.5;">
            Our automated build system selects the optimal printer profile and filament spool. Once printing commences and passes quality inspection, you'll receive your next progress update.
          </span>
        </div>
      `;
    } else if (type === 'order_completed') {
      subject = `Fabrication Complete & QC Passed: ${orderNum} — ${studioName}`;
      headline = 'Your Print is Complete!';
      subheadline = `Exciting news, ${customerName}! Your custom 3D printed order has finished fabrication and passed quality inspection.`;
      statusPill = 'bg-emerald-100 text-emerald-800';
      bodyHighlight = `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 16px; margin: 20px 0; border-radius: 4px;">
          <strong style="color: #047857; display: block; font-size: 14px; margin-bottom: 4px;">Quality Assurance Verified ✓</strong>
          <span style="color: #065f46; font-size: 13px; line-height: 1.5;">
            Dimensional accuracy, layer adhesion, and surface finish have been inspected and approved. Your order is now transferred to our packaging bench.
          </span>
        </div>
      `;
    } else {
      // order_dispatched
      subject = `Your Order is on the Way! Tracking: ${tracking || orderNum} — ${studioName}`;
      headline = 'Your Order Has Dispatched!';
      subheadline = `Great news, ${customerName}! Your order has been securely packed and handed over to ${carrier}.`;
      statusPill = 'bg-indigo-100 text-indigo-800';
      bodyHighlight = `
        <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 18px; margin: 24px 0; border-radius: 8px; text-align: center;">
          <span style="color: #4338ca; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; font-weight: bold; display: block; margin-bottom: 4px;">
            ${carrier} • ${service}
          </span>
          <div style="font-family: monospace; font-size: 18px; font-weight: bold; color: #1e1b4b; letter-spacing: 2px; margin: 6px 0;">
            ${tracking || 'CONFIRMED DISPATCH'}
          </div>
          ${
            tracking
              ? `
            <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 22px; font-size: 13px; font-weight: bold; border-radius: 6px; margin-top: 10px;">
              Track Your Parcel Online →
            </a>
          `
              : ''
          }
        </div>
      `;
    }

    const itemsHtml = items
      .map(
        (it) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-size: 13px; color: #0f172a; font-weight: 600;">
          ${it.productName}
          ${it.variantName ? `<span style="display: block; font-size: 11px; color: #64748b; font-weight: normal;">Variant: ${it.variantName}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; font-size: 13px; color: #334155; text-align: center;">${it.quantity}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #0f172a; text-align: right; font-family: monospace; font-weight: 600;">
          ${currency}${Number(it.unitPrice || 0).toFixed(2)}
        </td>
      </tr>
    `
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Studio Header -->
    <div style="background-color: #0f172a; padding: 24px 30px; text-align: left;">
      <table style="width: 100%;">
        <tr>
          <td>
            <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: bold; letter-spacing: -0.5px;">
              ${studioName}
            </h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Custom 3D Printing & Fabrication</p>
          </td>
          <td style="text-align: right;">
            <span style="display: inline-block; background-color: #1e293b; color: #38bdf8; font-family: monospace; font-size: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid #334155;">
              ${orderNum}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px;">
      <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 8px 0; font-weight: 800;">
        ${headline}
      </h2>
      <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
        ${subheadline}
      </p>

      ${bodyHighlight}

      <!-- Order Summary Card -->
      <div style="margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 13px; color: #334155;">
          Order Summary (${orderNum})
        </div>
        <table style="width: 100%; border-collapse: collapse; padding: 0 8px;">
          <thead>
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
              <th style="padding: 10px 8px; font-size: 11px; text-align: left; text-transform: uppercase; color: #64748b;">Item</th>
              <th style="padding: 10px 8px; font-size: 11px; text-align: center; text-transform: uppercase; color: #64748b;">Qty</th>
              <th style="padding: 10px 8px; font-size: 11px; text-align: right; text-transform: uppercase; color: #64748b;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="3" style="padding: 12px 8px; font-size: 13px; color: #64748b;">Custom Print Job</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 8px; font-size: 13px; font-weight: bold; color: #0f172a; text-align: right;">Total:</td>
              <td style="padding: 12px 8px; font-size: 15px; font-weight: bold; color: #0f172a; text-align: right; font-family: monospace;">
                ${currency}${Number(order.total || 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Shipping Address -->
      ${
        order.shippingAddress
          ? `
        <div style="margin-top: 20px; padding: 14px 16px; background-color: #f8fafc; border-radius: 6px; font-size: 12px; color: #475569; line-height: 1.5;">
          <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Delivering To:</strong>
          ${order.customerName ? `<div>${order.customerName}</div>` : ''}
          <div>${order.shippingAddress}</div>
        </div>
      `
          : ''
      }

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; text-align: center;">
        <p style="margin: 0 0 6px 0;">
          Have questions or need to make a change? Simply reply to this email or contact us at
          <a href="mailto:${settings.replyToEmail || settings.fromEmail}" style="color: #0284c7; text-decoration: underline;">${settings.replyToEmail || settings.fromEmail}</a>.
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          ${settings.customFooterNote || 'Thank you for supporting independent 3D printing craftsmanship.'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    return { subject, html };
  },

  /**
   * Main dispatch method
   */
  async sendCustomerEmail(
    type: 'order_confirmation' | 'order_completed' | 'order_dispatched',
    order: Order,
    options?: {
      trackingNumber?: string;
      carrier?: string;
      service?: string;
      customRecipient?: string;
      systemSettings?: SystemSettings;
    }
  ): Promise<{ success: boolean; simulated: boolean; error?: string }> {
    const settings = this.getSettings();

    // Check if master toggle or specific type toggle is disabled
    if (!settings.enabled && !options?.customRecipient) {
      return { success: false, simulated: true, error: 'Customer emails are disabled in settings.' };
    }

    if (type === 'order_confirmation' && !settings.sendOrderConfirmation && !options?.customRecipient) {
      return { success: false, simulated: true, error: 'Order confirmation emails are disabled in settings.' };
    }
    if (type === 'order_completed' && !settings.sendOrderCompleted && !options?.customRecipient) {
      return { success: false, simulated: true, error: 'Order completed emails are disabled in settings.' };
    }
    if (type === 'order_dispatched' && !settings.sendOrderDispatched && !options?.customRecipient) {
      return { success: false, simulated: true, error: 'Dispatch emails are disabled in settings.' };
    }

    const recipientEmail = options?.customRecipient || order.customerEmail;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return { success: false, simulated: true, error: 'No valid recipient email address on order.' };
    }

    const { subject, html } = this.generateHtmlTemplate(type, order, {
      trackingNumber: options?.trackingNumber || order.trackingNumber,
      carrier: options?.carrier || order.shippingProvider,
      service: options?.service || order.shippingService,
      businessName: options?.systemSettings?.businessName || settings.fromName,
      currencySymbol: options?.systemSettings?.currencySymbol || '£',
    });

    let status: 'sent' | 'simulated' | 'failed' = 'simulated';
    let errorMessage: string | undefined;

    // Real API send via Resend if API key is provided
    if (settings.provider === 'resend' && settings.apiKey && settings.apiKey.startsWith('re_')) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${settings.fromName} <${settings.fromEmail || 'onboarding@resend.dev'}>`,
            to: [recipientEmail],
            reply_to: settings.replyToEmail || undefined,
            subject,
            html,
          }),
        });

        if (res.ok) {
          status = 'sent';
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Resend API returned status ${res.status}`);
        }
      } catch (err: any) {
        status = 'failed';
        errorMessage = err.message;
        console.warn('Email dispatch warning (falling back to simulated log):', err.message);
      }
    }

    // Save to audit / email logs
    const newLog: EmailLogEntry = {
      id: 'email-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      orderId: order.id,
      orderInternalId: order.internalOrderId,
      recipientEmail,
      recipientName: order.customerName,
      type,
      subject,
      status,
      timestamp: new Date().toISOString(),
      trackingNumber: options?.trackingNumber || order.trackingNumber,
      carrier: options?.carrier || order.shippingProvider,
      previewSnippet: subject,
      error: errorMessage,
    };

    const currentLogs = this.getLogs();
    currentLogs.unshift(newLog);
    this.saveLogs(currentLogs);

    // Dispatch in-app notification event so UI shows a toast
    window.dispatchEvent(
      new CustomEvent('printflow_toast_trigger', {
        detail: {
          type: status === 'failed' ? 'warning' : 'success',
          title: status === 'sent' ? 'Customer Email Dispatched' : 'Customer Email Recorded (Simulated)',
          message: `${subject} $\\rightarrow$ ${recipientEmail}`,
        },
      })
    );

    return {
      success: status !== 'failed',
      simulated: status === 'simulated',
      error: errorMessage,
    };
  },
};
