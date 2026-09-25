import express, { Request, Response } from 'express';
import { EtsyService, RawEtsyReceipt } from '../services/etsyService';
import { EbayService, RawEbayOrder } from '../services/ebayService';
import { OrderSyncEngine, NormalizedMarketplaceOrder } from '../services/syncEngine';
import { serverStore } from '../storage';
import { MarketplaceConnectionStatus } from '../../src/types';

const router = express.Router();

function getBaseAppUrl(req: Request): string {
  // Use platform APP_URL if provided, else construct from req
  const envUrl = process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

// 1. Overall Integration Status
router.get('/status', (req: Request, res: Response) => {
  const creds = serverStore.getCredentials();
  const logs = serverStore.getSyncLogs();

  const etsyConnected = Boolean(creds.etsy && creds.etsy.accessToken);
  const ebayConnected = Boolean(creds.ebay && creds.ebay.accessToken);

  const etsyLogs = logs.filter((l) => l.channel === 'Etsy');
  const ebayLogs = logs.filter((l) => l.channel === 'eBay');

  const statuses: MarketplaceConnectionStatus[] = [
    {
      channel: 'Etsy',
      connected: etsyConnected,
      accountName: creds.etsy?.shopName,
      shopId: creds.etsy?.shopId,
      connectedAt: creds.etsy?.connectedAt,
      lastSyncAt: creds.etsy?.lastSyncAt,
      ordersSyncedCount: etsyLogs.reduce((acc, l) => acc + l.recordsProcessed, 0),
      health: etsyConnected ? 'healthy' : 'disconnected',
      supportsWebhooks: true,
      webhooksConfigured: false,
    },
    {
      channel: 'eBay',
      connected: ebayConnected,
      accountName: creds.etsy ? creds.ebay?.sellerId : undefined,
      connectedAt: creds.ebay?.connectedAt,
      lastSyncAt: creds.ebay?.lastSyncAt,
      ordersSyncedCount: ebayLogs.reduce((acc, l) => acc + l.recordsProcessed, 0),
      health: ebayConnected ? 'healthy' : 'disconnected',
      supportsWebhooks: true,
      webhooksConfigured: false,
    },
    {
      channel: 'Facebook Marketplace',
      connected: false,
      accountName: 'Meta Commerce Manager',
      ordersSyncedCount: 0,
      health: 'warning',
      errorMessage: 'Direct consumer Marketplace API is restricted by Meta policies. Use manual order entry for direct buyer messaging transactions.',
      supportsWebhooks: false,
      webhooksConfigured: false,
    },
  ];

  res.json({
    marketplaces: statuses,
    configState: {
      etsyConfigured: Boolean(EtsyService.getClientId()),
      ebayConfigured: Boolean(EbayService.getClientId()),
    },
  });
});

// 2. Etsy OAuth Start
router.get('/etsy/auth-url', (req: Request, res: Response) => {
  try {
    const base = getBaseAppUrl(req);
    const redirectUri = `${base}/api/integrations/etsy/callback`;
    const { url, state } = EtsyService.buildAuthUrl(redirectUri);
    res.json({ url, state, redirectUri });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Etsy OAuth Callback
router.get(['/etsy/callback', '/etsy/callback/'], async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Etsy Connection Error</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f87171; padding: 2rem; text-align: center;">
          <h2>Connection Cancelled or Failed</h2>
          <p>${error_description || error}</p>
          <button onclick="window.close()" style="padding: 8px 16px; margin-top: 1rem; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state parameter.');
  }

  try {
    const base = getBaseAppUrl(req);
    const redirectUri = `${base}/api/integrations/etsy/callback`;
    const shopInfo = await EtsyService.handleCallback(String(code), String(state), redirectUri);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Etsy Connected</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #38bdf8; padding: 2rem; text-align: center;">
          <h2>Etsy Shop Connected!</h2>
          <p>Successfully linked <strong>${shopInfo.shopName}</strong>.</p>
          <p style="color: #94a3b8; font-size: 13px;">This window will close automatically...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                channel: 'Etsy',
                shopName: ${JSON.stringify(shopInfo.shopName)}
              }, '*');
              setTimeout(function() { window.close(); }, 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Etsy OAuth Failure</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f87171; padding: 2rem; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>${err.message}</p>
          <button onclick="window.close()" style="padding: 8px 16px; margin-top: 1rem; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// 4. Etsy Disconnect
router.post('/etsy/disconnect', (req: Request, res: Response) => {
  serverStore.deleteEtsyCredentials();
  res.json({ success: true, message: 'Etsy account disconnected' });
});

// 5. Etsy Live Sync Orders
router.post('/etsy/sync', async (req: Request, res: Response) => {
  const startedAt = new Date().toISOString();
  try {
    const receipts = await EtsyService.fetchUnfulfilledOrders();

    // Transform raw Etsy receipts to normalized format
    const normalized: NormalizedMarketplaceOrder[] = receipts.map((r: RawEtsyReceipt) => ({
      channel: 'Etsy',
      externalOrderId: `ETSY-${r.receipt_id}`,
      externalReceiptId: String(r.receipt_id),
      orderDate: new Date(r.create_timestamp * 1000).toISOString(),
      customer: {
        name: r.name,
        email: r.buyer_email || `buyer-${r.receipt_id}@etsy.local`,
        street: [r.first_line, r.second_line].filter(Boolean).join(', '),
        city: r.city,
        state: r.state,
        postcode: r.zip,
        country: r.country_iso || 'GB',
      },
      items: r.transactions.map((t) => ({
        externalListingId: String(t.listing_id),
        externalSku: t.sku,
        title: t.title,
        quantity: t.quantity,
        unitPrice: t.price.amount / t.price.divisor,
        subtotal: (t.price.amount / t.price.divisor) * t.quantity,
        variations: t.variations?.reduce((acc, v) => ({ ...acc, [v.formatted_name]: v.formatted_value }), {}),
      })),
      subtotal: r.subtotal.amount / r.subtotal.divisor,
      shippingPaid: r.total_shipping_cost.amount / r.total_shipping_cost.divisor,
      discount: r.discount_amt ? r.discount_amt.amount / r.discount_amt.divisor : 0,
      total: r.grandtotal.amount / r.grandtotal.divisor,
      customerNotes: r.message_from_buyer,
      isPaid: r.is_paid,
      isShipped: r.is_shipped,
    }));

    // Pass body existing data from client
    const { existingOrders = [], existingProducts = [], existingCustomers = [], nextOrderNumber = 1050, orderPrefix = 'PF-' } = req.body;

    const syncResult = await OrderSyncEngine.processMarketplaceOrders(
      normalized,
      existingOrders,
      existingProducts,
      existingCustomers,
      nextOrderNumber,
      orderPrefix
    );

    // Save sync log
    serverStore.addSyncLog({
      channel: 'Etsy',
      action: 'Etsy Manual Order Sync',
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'success',
      recordsProcessed: syncResult.result.recordsProcessed,
      recordsCreated: syncResult.result.recordsCreated,
      recordsUpdated: syncResult.result.recordsUpdated,
      recordsSkipped: syncResult.result.recordsSkipped,
      errorCount: syncResult.result.errors.length,
      errorDetails: syncResult.result.errors,
    });

    res.json({
      success: true,
      ...syncResult,
    });
  } catch (err: any) {
    serverStore.addSyncLog({
      channel: 'Etsy',
      action: 'Etsy Order Sync Failed',
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'failed',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errorCount: 1,
      errorDetails: [err.message],
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Etsy Fulfill Order
router.post('/etsy/fulfill', async (req: Request, res: Response) => {
  const { receiptId, trackingNumber, carrier } = req.body;
  if (!receiptId || !trackingNumber) {
    return res.status(400).json({ error: 'receiptId and trackingNumber are required' });
  }

  const result = await EtsyService.submitTracking(receiptId, trackingNumber, carrier || 'Royal Mail');
  res.json(result);
});

// 7. eBay OAuth Start
router.get('/ebay/auth-url', (req: Request, res: Response) => {
  try {
    const base = getBaseAppUrl(req);
    const redirectUri = `${base}/api/integrations/ebay/callback`;
    const { url, state } = EbayService.buildAuthUrl(redirectUri);
    res.json({ url, state, redirectUri });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. eBay OAuth Callback
router.get(['/ebay/callback', '/ebay/callback/'], async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>eBay Connection Error</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f87171; padding: 2rem; text-align: center;">
          <h2>Connection Error</h2>
          <p>${error_description || error}</p>
          <button onclick="window.close()" style="padding: 8px 16px; margin-top: 1rem; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).send('Missing authorization code or state parameter.');
  }

  try {
    const base = getBaseAppUrl(req);
    const redirectUri = `${base}/api/integrations/ebay/callback`;
    const sellerInfo = await EbayService.handleCallback(String(code), String(state), redirectUri);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>eBay Connected</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #38bdf8; padding: 2rem; text-align: center;">
          <h2>eBay Connected!</h2>
          <p>Successfully linked <strong>${sellerInfo.sellerId}</strong>.</p>
          <p style="color: #94a3b8; font-size: 13px;">This window will close automatically...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                channel: 'eBay',
                sellerId: ${JSON.stringify(sellerInfo.sellerId)}
              }, '*');
              setTimeout(function() { window.close(); }, 1200);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>eBay OAuth Failure</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f87171; padding: 2rem; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>${err.message}</p>
          <button onclick="window.close()" style="padding: 8px 16px; margin-top: 1rem; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// 9. eBay Disconnect
router.post('/ebay/disconnect', (req: Request, res: Response) => {
  serverStore.deleteEbayCredentials();
  res.json({ success: true, message: 'eBay account disconnected' });
});

// 10. eBay Live Sync Orders
router.post('/ebay/sync', async (req: Request, res: Response) => {
  const startedAt = new Date().toISOString();
  try {
    const rawOrders = await EbayService.fetchUnfulfilledOrders();

    const normalized: NormalizedMarketplaceOrder[] = rawOrders.map((o: RawEbayOrder) => {
      const shipStep = o.fulfillmentStartInstructions?.[0]?.shippingStep;
      const addr = shipStep?.shipTo?.contactAddress;

      return {
        channel: 'eBay',
        externalOrderId: `EBAY-${o.orderId}`,
        externalReceiptId: o.orderId,
        orderDate: o.creationDate,
        customer: {
          name: shipStep?.shipTo?.fullName || o.buyer.username,
          email: shipStep?.shipTo?.email || `buyer-${o.orderId}@ebay.local`,
          phone: shipStep?.shipTo?.primaryPhone?.phoneNumber,
          street: [addr?.addressLine1, addr?.addressLine2].filter(Boolean).join(', '),
          city: addr?.city || 'City',
          state: addr?.stateOrProvince,
          postcode: addr?.postalCode || 'Postcode',
          country: addr?.countryCode || 'GB',
        },
        items: o.lineItems.map((item) => ({
          externalListingId: item.lineItemId,
          externalSku: item.sku,
          title: item.title,
          quantity: item.quantity,
          unitPrice: parseFloat(item.lineItemCost?.value || '0'),
          subtotal: parseFloat(item.total?.value || '0'),
        })),
        subtotal: parseFloat(o.pricingSummary.priceSubtotal?.value || '0'),
        shippingPaid: parseFloat(o.pricingSummary.deliveryCost?.value || '0'),
        discount: 0,
        total: parseFloat(o.pricingSummary.total?.value || '0'),
        isPaid: o.orderPaymentStatus === 'PAID',
        isShipped: o.orderFulfillmentStatus === 'FULFILLED',
      };
    });

    const { existingOrders = [], existingProducts = [], existingCustomers = [], nextOrderNumber = 1050, orderPrefix = 'PF-' } = req.body;

    const syncResult = await OrderSyncEngine.processMarketplaceOrders(
      normalized,
      existingOrders,
      existingProducts,
      existingCustomers,
      nextOrderNumber,
      orderPrefix
    );

    serverStore.addSyncLog({
      channel: 'eBay',
      action: 'eBay Fulfillment API Sync',
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'success',
      recordsProcessed: syncResult.result.recordsProcessed,
      recordsCreated: syncResult.result.recordsCreated,
      recordsUpdated: syncResult.result.recordsUpdated,
      recordsSkipped: syncResult.result.recordsSkipped,
      errorCount: syncResult.result.errors.length,
      errorDetails: syncResult.result.errors,
    });

    res.json({
      success: true,
      ...syncResult,
    });
  } catch (err: any) {
    serverStore.addSyncLog({
      channel: 'eBay',
      action: 'eBay Order Sync Failed',
      startedAt,
      completedAt: new Date().toISOString(),
      status: 'failed',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errorCount: 1,
      errorDetails: [err.message],
    });
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. eBay Shipping Fulfillment
router.post('/ebay/fulfill', async (req: Request, res: Response) => {
  const { orderId, trackingNumber, carrierCode, lineItemIds } = req.body;
  if (!orderId || !trackingNumber) {
    return res.status(400).json({ error: 'orderId and trackingNumber are required' });
  }

  const result = await EbayService.submitShippingFulfillment(orderId, trackingNumber, carrierCode || 'RoyalMail', lineItemIds);
  res.json(result);
});

// 12. Sync Logs
router.get('/logs', (req: Request, res: Response) => {
  const logs = serverStore.getSyncLogs();
  res.json(logs);
});

export default router;
