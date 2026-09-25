import express, { Request, Response } from 'express';
import { serverStore } from '../storage';
import { PrintFile } from '../../src/types';

const router = express.Router();

// 1. List print files
router.get('/', (req: Request, res: Response) => {
  const files = serverStore.getPrintFiles();
  res.json(files);
});

// 2. Add or upload new print file
router.post('/upload', (req: Request, res: Response) => {
  try {
    const {
      name,
      originalFileName,
      fileFormat = 'gcode',
      productId,
      productName,
      targetPrinterModel = 'Any',
      material = 'PLA',
      colors = ['Black'],
      isMultiColor = false,
      colorChannelsCount = 1,
      estimatedPrintTimeMinutes = 120,
      estimatedFilamentGrams = 40,
      layerHeightMm = 0.2,
      infillPercent = 15,
      slicerProfile = 'Flash Studio Desktop 1.5.2',
    } = req.body;

    if (!name || !originalFileName) {
      return res.status(400).json({ error: 'name and originalFileName are required' });
    }

    const newFile: PrintFile = {
      id: 'file-' + Date.now(),
      name,
      originalFileName,
      fileFormat,
      productId,
      productName,
      targetPrinterModel,
      material,
      colors: Array.isArray(colors) ? colors : [colors],
      isMultiColor: Boolean(isMultiColor),
      colorChannelsCount: Number(colorChannelsCount) || 1,
      estimatedPrintTimeMinutes: Number(estimatedPrintTimeMinutes) || 120,
      estimatedFilamentGrams: Number(estimatedFilamentGrams) || 40,
      layerHeightMm: Number(layerHeightMm) || 0.2,
      infillPercent: Number(infillPercent) || 15,
      fileSizeBytes: req.body.fileSizeBytes || Math.floor(1500000 + Math.random() * 2000000),
      slicerProfile,
      uploadedAt: new Date().toISOString(),
    };

    const saved = serverStore.savePrintFile(newFile);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete print file
router.delete('/:id', (req: Request, res: Response) => {
  const success = serverStore.deletePrintFile(req.params.id);
  res.json({ success });
});

export default router;
