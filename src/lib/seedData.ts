import {
  Customer,
  FilamentSpool,
  Order,
  Printer,
  Product,
  ProductionJob,
  ShippingRecord,
  StatusHistoryEntry,
  AuditLogEntry,
  SystemSettings,
} from '../types';

export const INITIAL_SETTINGS: SystemSettings = {
  businessName: 'PokeCraft 3D Prints',
  currency: 'GBP',
  currencySymbol: '£',
  defaultShippingProvider: 'Royal Mail',
  defaultPrinterId: 'printer-ad5x',
  electricityCostPerHour: 0.22,
  defaultPackagingCost: 0.45,
  defaultFilamentCostPerKg: 19.99,
  orderPrefix: 'PC-',
  nextOrderNumber: 1001,
  lowFilamentThresholdG: 180,
  notificationPreferences: {
    lowFilamentAlert: true,
    orderDeadlines: true,
    failedPrintAlert: true,
  },
};

export const INITIAL_PRINTERS: Printer[] = [
  {
    id: 'printer-ad5x',
    name: 'Flashforge AD5X',
    manufacturer: 'Flashforge',
    model: 'AD5X Multi-Material',
    status: 'IDLE',
    ipAddress: '192.168.1.142',
    location: 'Workbench A1 - Main Print Bay',
    capabilities: {
      buildVolume: '220 x 220 x 220 mm',
      nozzleSize: '0.4mm High-Flow',
      maxTemp: 300,
      multiColor: true,
      highSpeed: true,
    },
    currentJobId: undefined,
    currentJobName: undefined,
    progressPercentage: 0,
    remainingMinutes: 0,
    notes: '0.4mm hardened steel nozzle fitted. Calibrated for 0.16mm optimal layer height.',
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'printer-adv5m',
    name: 'Flashforge Adventurer 5M',
    manufacturer: 'Flashforge',
    model: 'Adventurer 5M Pro',
    status: 'IDLE',
    ipAddress: '192.168.1.145',
    location: 'Workbench A2 - Secondary Bay',
    capabilities: {
      buildVolume: '220 x 220 x 220 mm',
      nozzleSize: '0.4mm Quick-Swap',
      maxTemp: 280,
      multiColor: false,
      highSpeed: true,
    },
    currentJobId: undefined,
    currentJobName: undefined,
    progressPercentage: 0,
    remainingMinutes: 0,
    notes: 'Ready for next queue job. PEI textured build plate cleaned and ready.',
    createdAt: '2026-01-15T11:30:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_FILAMENTS: FilamentSpool[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_PRODUCTION_JOBS: ProductionJob[] = [];

export const INITIAL_SHIPPING_RECORDS: ShippingRecord[] = [];

export const INITIAL_STATUS_HISTORY: StatusHistoryEntry[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];
