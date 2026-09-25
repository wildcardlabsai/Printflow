import express, { Request, Response } from 'express';
import { ShippingService } from '../services/shippingService';
import { serverStore } from '../storage';

const router = express.Router();

router.get('/carriers', (req: Request, res: Response) => {
  const carriers = serverStore.getCarriers();
  res.json(carriers);
});

router.post('/rates', async (req: Request, res: Response) => {
  try {
    const { weightGrams = 150, destinationPostcode = 'SW1A 1AA' } = req.body;
    const rates = await ShippingService.getAvailableRates({
      weightGrams: Number(weightGrams) || 150,
      destinationPostcode: destinationPostcode || 'SW1A 1AA',
    });
    res.json(rates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-label', async (req: Request, res: Response) => {
  try {
    const { orderId, carrierId = 'royal_mail', serviceCode = 'RM_TRACKED_48', recipient, package: pkg } = req.body;

    if (!orderId || !recipient) {
      return res.status(400).json({ error: 'orderId and recipient information are required.' });
    }

    const result = await ShippingService.generateLabel({
      orderId,
      carrierId,
      serviceCode,
      recipient,
      package: pkg || { weightGrams: 150 },
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
