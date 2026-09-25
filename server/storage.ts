import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ProductMapping,
  SyncLogEntry,
  MarketplaceConnectionStatus,
  ShippingCarrierConfig,
  Printer,
  PrintFile,
  AutoPrintSettings,
  PrinterAuditEntry,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const MAPPINGS_FILE = path.join(DATA_DIR, 'mappings.json');
const SYNC_LOGS_FILE = path.join(DATA_DIR, 'sync_logs.json');
const CARRIERS_FILE = path.join(DATA_DIR, 'carriers.json');
const PRINTERS_FILE = path.join(DATA_DIR, 'printers.json');
const PRINT_FILES_FILE = path.join(DATA_DIR, 'print_files.json');
const PRINTER_AUDIT_FILE = path.join(DATA_DIR, 'printer_audit.json');
const AUTO_PRINT_SETTINGS_FILE = path.join(DATA_DIR, 'auto_print_settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple encryption helper for tokens at rest using a machine key
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.APP_SECRET || 'printflow-phase2-secure-salt-2026')
  .digest();

function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (e) {
    return text;
  }
}

function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    const iv = Buffer.from(parts[0], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return text;
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

export interface StoredCredentials {
  etsy?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // timestamp
    shopId: string;
    shopName: string;
    userId: string;
    connectedAt: string;
    lastSyncAt?: string;
  };
  ebay?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    refreshTokenExpiresAt?: number;
    sellerId: string;
    connectedAt: string;
    lastSyncAt?: string;
  };
}

export interface PendingOAuthState {
  state: string;
  codeVerifier?: string;
  channel: 'Etsy' | 'eBay';
  createdAt: number;
}

// In-memory pending states (expire after 15 minutes)
const pendingStates = new Map<string, PendingOAuthState>();

export const serverStore = {
  savePendingState(state: string, data: Omit<PendingOAuthState, 'state' | 'createdAt'>) {
    pendingStates.set(state, {
      state,
      createdAt: Date.now(),
      ...data,
    });
    // clean up expired states older than 15 mins
    const now = Date.now();
    for (const [key, item] of pendingStates.entries()) {
      if (now - item.createdAt > 15 * 60 * 1000) {
        pendingStates.delete(key);
      }
    }
  },

  getPendingState(state: string): PendingOAuthState | undefined {
    const item = pendingStates.get(state);
    if (!item) return undefined;
    if (Date.now() - item.createdAt > 15 * 60 * 1000) {
      pendingStates.delete(state);
      return undefined;
    }
    return item;
  },

  removePendingState(state: string) {
    pendingStates.delete(state);
  },

  // Credentials
  getCredentials(): StoredCredentials {
    const raw = readJsonFile<StoredCredentials>(CREDENTIALS_FILE, {});
    const result: StoredCredentials = {};
    if (raw.etsy) {
      result.etsy = {
        ...raw.etsy,
        accessToken: decrypt(raw.etsy.accessToken),
        refreshToken: decrypt(raw.etsy.refreshToken),
      };
    }
    if (raw.ebay) {
      result.ebay = {
        ...raw.ebay,
        accessToken: decrypt(raw.ebay.accessToken),
        refreshToken: decrypt(raw.ebay.refreshToken),
      };
    }
    return result;
  },

  saveCredentials(credentials: StoredCredentials) {
    const toSave: StoredCredentials = {};
    if (credentials.etsy) {
      toSave.etsy = {
        ...credentials.etsy,
        accessToken: encrypt(credentials.etsy.accessToken),
        refreshToken: encrypt(credentials.etsy.refreshToken),
      };
    }
    if (credentials.ebay) {
      toSave.ebay = {
        ...credentials.ebay,
        accessToken: encrypt(credentials.ebay.accessToken),
        refreshToken: encrypt(credentials.ebay.refreshToken),
      };
    }
    writeJsonFile(CREDENTIALS_FILE, toSave);
  },

  deleteEtsyCredentials() {
    const creds = this.getCredentials();
    delete creds.etsy;
    this.saveCredentials(creds);
  },

  deleteEbayCredentials() {
    const creds = this.getCredentials();
    delete creds.ebay;
    this.saveCredentials(creds);
  },

  // Product Mappings
  getMappings(): ProductMapping[] {
    return readJsonFile<ProductMapping[]>(MAPPINGS_FILE, [
      {
        id: 'map-pkm-01',
        salesChannel: 'Etsy',
        externalListingId: '184918231',
        externalSku: 'PF-PKM-STD-01-BLK',
        externalTitle: 'Pokemon PSA Slab Display Stand (Matte Black)',
        internalProductId: 'prod-01',
        internalVariantId: 'var-01a',
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'map-tcg-02',
        salesChannel: 'eBay',
        externalListingId: '294819284102',
        externalSku: 'PF-TCG-TRIPLE-BLK',
        externalTitle: 'Triple Tier Trading Card Stand Black',
        internalProductId: 'prod-02',
        internalVariantId: 'var-02a',
        createdAt: '2026-08-05T12:00:00.000Z',
        updatedAt: '2026-08-05T12:00:00.000Z',
      },
    ]);
  },

  saveMapping(mapping: ProductMapping): ProductMapping {
    const mappings = this.getMappings();
    const idx = mappings.findIndex(
      (m) =>
        m.id === mapping.id ||
        (m.salesChannel === mapping.salesChannel &&
          (m.externalSku === mapping.externalSku || m.externalListingId === mapping.externalListingId))
    );
    if (idx >= 0) {
      mappings[idx] = { ...mapping, updatedAt: new Date().toISOString() };
    } else {
      mappings.push({
        ...mapping,
        id: mapping.id || 'map-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    writeJsonFile(MAPPINGS_FILE, mappings);
    return mapping;
  },

  deleteMapping(id: string): boolean {
    const mappings = this.getMappings();
    const filtered = mappings.filter((m) => m.id !== id);
    writeJsonFile(MAPPINGS_FILE, filtered);
    return filtered.length !== mappings.length;
  },

  // Sync Logs
  getSyncLogs(): SyncLogEntry[] {
    return readJsonFile<SyncLogEntry[]>(SYNC_LOGS_FILE, [
      {
        id: 'log-init-01',
        channel: 'Etsy',
        action: 'Initial Marketplace Bridge Check',
        startedAt: '2026-09-24T12:00:00.000Z',
        completedAt: '2026-09-24T12:00:02.000Z',
        status: 'success',
        recordsProcessed: 1,
        recordsCreated: 1,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errorCount: 0,
      },
    ]);
  },

  addSyncLog(log: Omit<SyncLogEntry, 'id'>): SyncLogEntry {
    const logs = this.getSyncLogs();
    const newEntry: SyncLogEntry = {
      id: 'log-' + Date.now(),
      ...log,
    };
    logs.unshift(newEntry);
    writeJsonFile(SYNC_LOGS_FILE, logs.slice(0, 100)); // keep last 100
    return newEntry;
  },

  // Carrier Configurations
  getCarriers(): ShippingCarrierConfig[] {
    const defaultCarriers: ShippingCarrierConfig[] = [
      {
        id: 'royal_mail',
        name: 'Royal Mail Click & Drop',
        enabled: true,
        configured: Boolean(process.env.ROYAL_MAIL_API_KEY),
        hasApiKey: Boolean(process.env.ROYAL_MAIL_API_KEY),
        accountNumber: process.env.ROYAL_MAIL_ACCOUNT || '',
        services: [
          { code: 'RM_TRACKED_24', name: 'Tracked 24 with Signature', estimatedDays: 1 },
          { code: 'RM_TRACKED_48', name: 'Tracked 48 Standard Parcel', estimatedDays: 2 },
          { code: 'RM_SPECIAL_DELIVERY', name: 'Special Delivery Guaranteed by 1pm', estimatedDays: 1 },
        ],
      },
      {
        id: 'evri',
        name: 'Evri (Hermes) Corporate',
        enabled: true,
        configured: Boolean(process.env.EVRI_API_KEY),
        hasApiKey: Boolean(process.env.EVRI_API_KEY),
        accountNumber: process.env.EVRI_CLIENT_ID || '',
        services: [
          { code: 'EVRI_STANDARD', name: 'Standard Parcel Delivery (2-3 Days)', estimatedDays: 3 },
          { code: 'EVRI_NEXT_DAY', name: 'Next Day Parcel Delivery', estimatedDays: 1 },
        ],
      },
      {
        id: 'dpd',
        name: 'DPD Local Ship API',
        enabled: true,
        configured: Boolean(process.env.DPD_API_KEY),
        hasApiKey: Boolean(process.env.DPD_API_KEY),
        accountNumber: process.env.DPD_ACCOUNT_NUMBER || '',
        services: [
          { code: 'DPD_NEXT_DAY', name: 'DPD Next Day 1-Hour Window', estimatedDays: 1 },
          { code: 'DPD_PRE_12', name: 'DPD Express Pre-12:00', estimatedDays: 1 },
        ],
      },
    ];
    return readJsonFile<ShippingCarrierConfig[]>(CARRIERS_FILE, defaultCarriers);
  },

  saveCarriers(carriers: ShippingCarrierConfig[]) {
    writeJsonFile(CARRIERS_FILE, carriers);
  },

  // ----------------------------------------------------
  // Phase 3: Printers Storage
  // ----------------------------------------------------
  getPrinters(): Printer[] {
    const defaultPrinters: Printer[] = [
      {
        id: 'printer-01',
        name: 'Flashforge AD5X',
        manufacturer: 'Flashforge',
        model: 'Flashforge AD5X',
        status: 'IDLE',
        connectionStatus: 'Connected',
        connectionMode: 'lan_direct',
        ipAddress: '192.168.1.105',
        httpPort: 8898,
        tcpPort: 8899,
        checkCode: '88492015',
        location: 'Workshop Bay 1',
        hasCamera: true,
        cameraStreamUrl: 'http://192.168.1.105:8080/?action=stream',
        firmwareVersion: 'v2.4.6-ad5x-release',
        capabilities: {
          buildVolume: '220x220x220mm',
          nozzleSize: '0.4mm',
          maxTemp: 300,
          multiColor: true, // 4-channel IFS ecosystem
          highSpeed: true, // 600 mm/s
        },
        notes: 'Primary multi-color production machine with IFS 4-spool system.',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'printer-02',
        name: 'Flashforge Adventurer 5M',
        manufacturer: 'Flashforge',
        model: 'Flashforge Adventurer 5M',
        status: 'IDLE',
        connectionStatus: 'Connected',
        connectionMode: 'lan_direct',
        ipAddress: '192.168.1.106',
        httpPort: 8898,
        tcpPort: 8899,
        checkCode: '49201948',
        location: 'Workshop Bay 2',
        hasCamera: false, // Adventurer 5M has optional camera accessory
        firmwareVersion: 'v2.3.8-adv5m-release',
        capabilities: {
          buildVolume: '220x220x220mm',
          nozzleSize: '0.4mm',
          maxTemp: 280,
          multiColor: false,
          highSpeed: true,
        },
        notes: 'High-speed rapid prototyping and single-extruder production.',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: new Date().toISOString(),
      },
    ];

    return readJsonFile<Printer[]>(PRINTERS_FILE, defaultPrinters);
  },

  savePrinter(printer: Printer): Printer {
    const list = this.getPrinters();
    const idx = list.findIndex((p) => p.id === printer.id);
    if (idx >= 0) {
      list[idx] = { ...printer, updatedAt: new Date().toISOString() };
    } else {
      list.push({
        ...printer,
        id: printer.id || 'printer-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    writeJsonFile(PRINTERS_FILE, list);
    return printer;
  },

  deletePrinter(id: string): boolean {
    const list = this.getPrinters();
    const filtered = list.filter((p) => p.id !== id);
    writeJsonFile(PRINTERS_FILE, filtered);
    return filtered.length !== list.length;
  },

  // ----------------------------------------------------
  // Phase 3: Print Files Library
  // ----------------------------------------------------
  getPrintFiles(): PrintFile[] {
    const defaultFiles: PrintFile[] = [
      {
        id: 'file-01',
        name: 'Pokemon Slab Stand (AD5X Dual Color)',
        originalFileName: 'Pokemon_Slab_Stand_AD5X_MultiColor.3mf',
        fileFormat: '3mf',
        productId: 'prod-01',
        productName: 'Pokemon Graded Card Stand PSA Slab',
        targetPrinterModel: 'Flashforge AD5X',
        material: 'PLA',
        colors: ['Black', 'Crimson Red'],
        isMultiColor: true,
        colorChannelsCount: 2,
        estimatedPrintTimeMinutes: 135,
        estimatedFilamentGrams: 45,
        layerHeightMm: 0.2,
        infillPercent: 15,
        fileSizeBytes: 2450812,
        slicerProfile: 'Flash Studio Desktop 1.5.2 (Orca-Flashforge)',
        uploadedAt: '2026-09-01T10:00:00.000Z',
      },
      {
        id: 'file-02',
        name: 'Pokemon Slab Stand (5M Standard)',
        originalFileName: 'Pokemon_Slab_Stand_5M_Black.gcode',
        fileFormat: 'gcode',
        productId: 'prod-01',
        productName: 'Pokemon Graded Card Stand PSA Slab',
        targetPrinterModel: 'Flashforge Adventurer 5M',
        material: 'PLA',
        colors: ['Black'],
        isMultiColor: false,
        colorChannelsCount: 1,
        estimatedPrintTimeMinutes: 105,
        estimatedFilamentGrams: 38,
        layerHeightMm: 0.2,
        infillPercent: 15,
        fileSizeBytes: 1820491,
        slicerProfile: 'Flash Studio Desktop 1.5.2 (Orca-Flashforge)',
        uploadedAt: '2026-09-02T14:30:00.000Z',
      },
      {
        id: 'file-03',
        name: 'Triple Tier Trading Card Display',
        originalFileName: 'Triple_Card_Display_5M.gcode',
        fileFormat: 'gcode',
        productId: 'prod-02',
        productName: 'Triple Tier Trading Card Display Stand',
        targetPrinterModel: 'Any',
        material: 'PETG',
        colors: ['Black'],
        isMultiColor: false,
        colorChannelsCount: 1,
        estimatedPrintTimeMinutes: 190,
        estimatedFilamentGrams: 68,
        layerHeightMm: 0.2,
        infillPercent: 20,
        fileSizeBytes: 3120485,
        slicerProfile: 'Flash Studio Desktop',
        uploadedAt: '2026-09-05T09:15:00.000Z',
      },
      {
        id: 'file-04',
        name: 'Hex Gaming Controller Stand (AD5X IFS)',
        originalFileName: 'Hex_Gaming_Stand_IFS.3mf',
        fileFormat: '3mf',
        productId: 'prod-04',
        productName: 'Hexagonal Headphone & Controller Stand',
        targetPrinterModel: 'Flashforge AD5X',
        material: 'PLA',
        colors: ['Black', 'Signal Orange'],
        isMultiColor: true,
        colorChannelsCount: 2,
        estimatedPrintTimeMinutes: 240,
        estimatedFilamentGrams: 110,
        layerHeightMm: 0.2,
        infillPercent: 15,
        fileSizeBytes: 4290124,
        slicerProfile: 'Flash Studio Desktop (Orca-Flashforge)',
        uploadedAt: '2026-09-10T11:00:00.000Z',
      },
    ];

    return readJsonFile<PrintFile[]>(PRINT_FILES_FILE, defaultFiles);
  },

  savePrintFile(file: PrintFile): PrintFile {
    const list = this.getPrintFiles();
    const idx = list.findIndex((f) => f.id === file.id);
    if (idx >= 0) {
      list[idx] = file;
    } else {
      list.push({ ...file, id: file.id || 'file-' + Date.now() });
    }
    writeJsonFile(PRINT_FILES_FILE, list);
    return file;
  },

  deletePrintFile(id: string): boolean {
    const list = this.getPrintFiles();
    const filtered = list.filter((f) => f.id !== id);
    writeJsonFile(PRINT_FILES_FILE, filtered);
    return filtered.length !== list.length;
  },

  // ----------------------------------------------------
  // Phase 3: Auto-Print Settings & Safe Controls
  // ----------------------------------------------------
  getAutoPrintSettings(): AutoPrintSettings {
    const defaultSettings: AutoPrintSettings = {
      enabled: false, // Strictly OFF by default as required by safety specification
      allowedPrinterIds: ['printer-01', 'printer-02'],
      allowedMaterials: ['PLA', 'PETG'],
      maxQueuedJobsPerPrinter: 3,
      requireConfirmation: true,
    };
    return readJsonFile<AutoPrintSettings>(AUTO_PRINT_SETTINGS_FILE, defaultSettings);
  },

  saveAutoPrintSettings(settings: AutoPrintSettings): AutoPrintSettings {
    writeJsonFile(AUTO_PRINT_SETTINGS_FILE, settings);
    return settings;
  },

  // ----------------------------------------------------
  // Phase 3: Printer Audit Entries
  // ----------------------------------------------------
  getPrinterAudit(): PrinterAuditEntry[] {
    const defaultAudit: PrinterAuditEntry[] = [
      {
        id: 'aud-prt-01',
        printerId: 'printer-01',
        printerName: 'Flashforge AD5X',
        action: 'Printer Connected',
        user: 'Matt Taylor (Owner)',
        timestamp: '2026-09-24T18:00:00.000Z',
        details: { connectionMode: 'lan_direct', port: 8898, checkCode: 'verified' },
      },
      {
        id: 'aud-prt-02',
        printerId: 'printer-02',
        printerName: 'Flashforge Adventurer 5M',
        action: 'Printer Connected',
        user: 'Matt Taylor (Owner)',
        timestamp: '2026-09-24T18:05:00.000Z',
        details: { connectionMode: 'lan_direct', port: 8898, checkCode: 'verified' },
      },
    ];
    return readJsonFile<PrinterAuditEntry[]>(PRINTER_AUDIT_FILE, defaultAudit);
  },

  addPrinterAudit(entry: Omit<PrinterAuditEntry, 'id' | 'timestamp'>): PrinterAuditEntry {
    const list = this.getPrinterAudit();
    const newEntry: PrinterAuditEntry = {
      id: 'aud-prt-' + Date.now(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    list.unshift(newEntry);
    writeJsonFile(PRINTER_AUDIT_FILE, list.slice(0, 100));
    return newEntry;
  },
};

