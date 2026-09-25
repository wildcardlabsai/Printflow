import express, { Request, Response } from 'express';
import { EtsyService } from '../services/etsyService';
import { serverStore } from '../storage';

const router = express.Router();

// Etsy Webhook Receiver
router.post('/etsy', (req: Request, res: Response) => {
  const signature = req.headers['x-etsy-signature'] as string;
  const webhookSecret = process.env.ETSY_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const rawBody = JSON.stringify(req.body);
    const isValid = EtsyService.validateWebhookSignature(signature, rawBody, webhookSecret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Etsy webhook signature' });
    }
  }

  const { event_type, data } = req.body;
  console.log(`[Etsy Webhook Received] Event: ${event_type}`, data);

  serverStore.addSyncLog({
    channel: 'Etsy',
    action: `Webhook Event: ${event_type || 'order_update'}`,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'success',
    recordsProcessed: 1,
    recordsCreated: 0,
    recordsUpdated: 1,
    recordsSkipped: 0,
    errorCount: 0,
  });

  // Always return 200 OK to acknowledge receipt to Etsy
  res.status(200).json({ received: true });
});

// eBay Webhook Receiver
router.post('/ebay', (req: Request, res: Response) => {
  // eBay verification challenge response
  const challengeCode = req.query.challenge_code as string;
  if (challengeCode) {
    // Verification response for eBay notification registration
    return res.status(200).send(challengeCode);
  }

  console.log('[eBay Webhook Received]', req.body);
  serverStore.addSyncLog({
    channel: 'eBay',
    action: 'Webhook Event Notification',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'success',
    recordsProcessed: 1,
    recordsCreated: 0,
    recordsUpdated: 1,
    recordsSkipped: 0,
    errorCount: 0,
  });

  res.status(200).json({ received: true });
});

export default router;
