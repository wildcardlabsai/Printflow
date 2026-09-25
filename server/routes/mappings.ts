import express, { Request, Response } from 'express';
import { serverStore } from '../storage';
import { ProductMapping } from '../../src/types';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  const mappings = serverStore.getMappings();
  res.json(mappings);
});

router.post('/', (req: Request, res: Response) => {
  const { salesChannel, externalListingId, externalSku, externalTitle, internalProductId, internalVariantId } = req.body;

  if (!salesChannel || !internalProductId || (!externalListingId && !externalSku)) {
    return res.status(400).json({ error: 'salesChannel, internalProductId, and externalSku/ListingId are required.' });
  }

  const mapping: ProductMapping = {
    id: req.body.id || 'map-' + Date.now(),
    salesChannel,
    externalListingId: externalListingId || '',
    externalSku: externalSku || '',
    externalTitle: externalTitle || 'External Listing',
    internalProductId,
    internalVariantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = serverStore.saveMapping(mapping);
  res.json(saved);
});

router.delete('/:id', (req: Request, res: Response) => {
  const success = serverStore.deleteMapping(req.params.id);
  res.json({ success });
});

export default router;
