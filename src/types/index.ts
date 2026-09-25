export type SalesChannel = 'Etsy' | 'eBay' | 'Facebook Marketplace' | 'Website' | 'Manual' | 'Other';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'MAPPING REQUIRED'
  | 'AWAITING PRINT'
  | 'PRINTING'
  | 'PRINTED'
  | 'PACKING'
  | 'READY TO SHIP'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'ON HOLD'
  | 'CANCELLED';

export type PaymentStatus = 'Pending' | 'Paid' | 'Refunded' | 'Failed';
export type ProductionStatus = 'Awaiting Print' | 'Printing' | 'Printed' | 'Partially Printed' | 'Cancelled';
export type PackingStatus = 'Unpacked' | 'Packing' | 'Packed';
export type ShippingStatus = 'Unfulfilled' | 'Label Created' | 'Shipped' | 'Delivered' | 'Returned';

export type PrinterStatus = 'ONLINE' | 'OFFLINE' | 'IDLE' | 'PRINTING' | 'ERROR' | 'MAINTENANCE';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type JobStatus =
  | 'awaiting_print'
  | 'assigned'
  | 'ready'
  | 'sending'
  | 'queued'
  | 'printing'
  | 'printed'
  | 'paused'
  | 'failed'
  | 'cancelled';

export type FilamentMaterial = 'PLA' | 'PETG' | 'TPU' | 'ABS' | 'ASA' | 'Silk PLA' | 'Carbon Fiber PLA' | 'Other';
export type SpoolStatus = 'In Stock' | 'In Use' | 'Depleted' | 'Reserved';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'operator';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    stateOrCounty: string;
    postcode: string;
    country: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  color?: string;
  priceModifier: number; // e.g. +£2.00
  filamentGramsModifier?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  additionalImages: string[];
  sellingPrice: number;
  costPrice: number; // calculated base cost
  estimatedFilamentGrams: number;
  estimatedPrintTimeMinutes: number;
  defaultPrinterId?: string;
  compatiblePrinters: string[]; // printer IDs or models
  preferredPrinterModel?: 'Flashforge AD5X' | 'Flashforge Adventurer 5M' | 'Any';
  isMultiColor?: boolean;
  multiColorChannels?: Array<{ channel: number; color: string; hexColor: string; material?: string }>;
  buildDimensionsMm?: { x: number; y: number; z: number };
  nozzleRequirementMm?: number;
  material: FilamentMaterial;
  defaultFilamentColor: string;
  packagingType: string;
  isActive: boolean;
  variants: ProductVariant[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  filamentGramsPerUnit: number;
  printTimeMinutesPerUnit: number;
  subtotal: number;
}

export interface Order {
  id: string;
  internalOrderId: string; // e.g. PF-1001
  externalOrderId?: string; // e.g. Etsy #29481948, eBay #18491823
  salesChannel: SalesChannel;
  orderDate: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  productCost: number;
  estimatedProfit: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  productionStatus: ProductionStatus;
  packingStatus: PackingStatus;
  shippingStatus: ShippingStatus;
  shippingProvider?: string; // Royal Mail, Evri, DPD, etc.
  shippingService?: string; // Tracked 24, Tracked 48, etc.
  trackingNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  marketplaceMetadata?: {
    receiptId?: string;
    transactionIds?: string[];
    lastSyncedAt?: string;
    syncStatus?: 'synced' | 'pending' | 'failed' | 'mapping_required';
    syncError?: string;
    fulfillmentSynced?: boolean;
    fulfillmentSyncedAt?: string;
    fulfillmentId?: string;
    fulfillmentError?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductionJob {
  id: string;
  orderId: string;
  orderInternalId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  printerId?: string;
  printerName?: string;
  printFileId?: string;
  printFileName?: string;
  status: JobStatus;
  priority: JobPriority;
  estimatedPrintTimeMinutes: number;
  actualPrintTimeMinutes?: number;
  estimatedFilamentGrams: number;
  actualFilamentGrams?: number;
  material: FilamentMaterial;
  color: string;
  isMultiColor?: boolean;
  colorChannels?: string[];
  spoolId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  notes?: string;
}

export type PrinterConnectionStatus =
  | 'Connected'
  | 'Disconnected'
  | 'Connecting'
  | 'Authentication Required'
  | 'Error'
  | 'Unknown';

export interface FlashforgeIfsChannel {
  channel: number; // 1, 2, 3, 4
  material: string;
  color: string;
  hexColor: string;
  remainingWeightG?: number;
  inUse: boolean;
}

export interface LivePrinterTelemetry {
  printerId: string;
  connectionStatus: PrinterConnectionStatus;
  bedTemperature: number;
  targetBedTemperature: number;
  nozzleTemperature: number;
  targetNozzleTemperature: number;
  chamberTemperature?: number;
  fanSpeedPercent?: number;
  currentJobName?: string;
  printProgressPercent: number;
  printDurationSeconds: number;
  estimatedTimeRemainingSeconds: number;
  layerNumber?: number;
  totalLayers?: number;
  filamentUsedGrams?: number;
  cameraStreamUrl?: string;
  hasCamera: boolean;
  firmwareVersion?: string;
  ipAddress?: string;
  httpPort: number; // 8898
  tcpPort: number; // 8899
  checkCodeConfigured: boolean;
  connectionMode: 'lan_direct' | 'agent_gateway' | 'mock_simulation';
  lastCommunication?: string;
  lastError?: string;
  ifsChannels?: FlashforgeIfsChannel[];
}

export interface Printer {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  status: PrinterStatus;
  connectionStatus?: PrinterConnectionStatus;
  connectionMode?: 'lan_direct' | 'agent_gateway' | 'mock_simulation';
  ipAddress?: string;
  httpPort?: number; // default 8898 for Flashforge HTTP REST
  tcpPort?: number; // default 8899 for Flashforge TCP control socket
  checkCode?: string; // 8-digit security check code from printer screen
  location?: string;
  cameraStreamUrl?: string;
  hasCamera?: boolean;
  firmwareVersion?: string;
  capabilities: {
    buildVolume: string; // e.g. "220x220x220mm"
    nozzleSize: string; // e.g. "0.4mm"
    maxTemp: number; // e.g. 280 (5M) or 300 (AD5X)
    multiColor: boolean; // true for AD5X IFS
    highSpeed: boolean; // true (600 mm/s)
  };
  currentJobId?: string;
  currentJobName?: string;
  progressPercentage?: number;
  remainingMinutes?: number;
  telemetry?: LivePrinterTelemetry;
  lastCommunication?: string;
  lastError?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilamentSpool {
  id: string;
  brand: string;
  material: FilamentMaterial;
  color: string;
  hexColor?: string;
  weightPurchasedG: number;
  remainingWeightG: number;
  cost: number;
  costPerGram: number;
  spoolStatus: SpoolStatus;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingRecord {
  id: string;
  orderId: string;
  orderInternalId: string;
  customerName: string;
  shippingAddress: string;
  shippingProvider: string;
  shippingService: string;
  trackingNumber?: string;
  shippingCost: number;
  labelStatus: 'Pending' | 'Generated' | 'Printed' | 'Cancelled';
  shippedDate?: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  orderId: string;
  orderInternalId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: string;
  user: string;
  note?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: 'Order' | 'Production' | 'Product' | 'Customer' | 'Printer' | 'Filament' | 'Shipping' | 'Settings';
  entityId: string;
  summary: string;
  details?: Record<string, any>;
  timestamp: string;
  user: string;
}

export interface SystemSettings {
  businessName: string;
  currency: string;
  currencySymbol: string;
  defaultShippingProvider: string;
  defaultPrinterId: string;
  electricityCostPerHour: number; // e.g. £0.20
  defaultPackagingCost: number; // e.g. £0.40
  defaultFilamentCostPerKg: number; // e.g. £20.00
  orderPrefix: string; // e.g. "PF-"
  nextOrderNumber: number; // e.g. 1021
  lowFilamentThresholdG: number; // e.g. 150
  notificationPreferences: {
    lowFilamentAlert: boolean;
    orderDeadlines: boolean;
    failedPrintAlert: boolean;
  };
}

export interface ProductMapping {
  id: string;
  salesChannel: SalesChannel;
  externalListingId: string; // e.g. Etsy listing_id or eBay item ID
  externalSku: string;
  externalTitle: string;
  internalProductId: string;
  internalVariantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  channel: SalesChannel;
  action: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed' | 'in_progress';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorCount: number;
  errorDetails?: string[];
}

export interface MarketplaceConnectionStatus {
  channel: SalesChannel;
  connected: boolean;
  accountName?: string;
  shopId?: string;
  connectedAt?: string;
  expiresAt?: string;
  lastSyncAt?: string;
  ordersSyncedCount: number;
  health: 'healthy' | 'warning' | 'error' | 'disconnected';
  errorMessage?: string;
  supportsWebhooks: boolean;
  webhooksConfigured: boolean;
}

export type ShippingCarrierId = 'royal_mail' | 'evri' | 'dpd' | 'manual';

export interface ShippingCarrierConfig {
  id: ShippingCarrierId;
  name: string;
  enabled: boolean;
  configured: boolean;
  accountNumber?: string;
  hasApiKey: boolean;
  services: Array<{ code: string; name: string; estimatedDays: number }>;
}

export interface ShippingLabelResult {
  success: boolean;
  trackingNumber?: string;
  labelUrl?: string;
  carrier: string;
  service: string;
  cost: number;
  error?: string;
}

export interface PrintFile {
  id: string;
  name: string;
  originalFileName: string;
  fileFormat: 'gcode' | '3mf' | 'gx';
  productId?: string;
  productName?: string;
  targetPrinterModel: 'Flashforge AD5X' | 'Flashforge Adventurer 5M' | 'Any';
  material: FilamentMaterial;
  colors: string[];
  isMultiColor: boolean;
  colorChannelsCount: number;
  estimatedPrintTimeMinutes: number;
  estimatedFilamentGrams: number;
  layerHeightMm: number;
  infillPercent: number;
  fileSizeBytes: number;
  uploadedAt: string;
  downloadUrl?: string;
  slicerProfile?: string;
}

export interface PrinterAgentInfo {
  id: string;
  name: string;
  pairingCode: string;
  token: string;
  status: 'online' | 'offline';
  version: string;
  ipAddress: string;
  lastHeartbeat: string;
  connectedPrintersCount: number;
  recentLogs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
}

export interface AutoPrintSettings {
  enabled: boolean;
  allowedPrinterIds: string[];
  allowedMaterials: string[];
  maxQueuedJobsPerPrinter: number;
  requireConfirmation: boolean;
}

export interface PrinterDiagnostics {
  printerId: string;
  printerName: string;
  model: string;
  ipAddress: string;
  httpPort: number;
  tcpPort: number;
  connectionStatus: PrinterConnectionStatus;
  connectionMode: 'lan_direct' | 'agent_gateway' | 'mock_simulation';
  latencyMs?: number;
  firmwareVersion?: string;
  checkCodeValid: boolean;
  lastCommunication?: string;
  lastError?: string;
  agentId?: string;
  agentOnline: boolean;
  errors: Array<{ timestamp: string; code?: string; message: string }>;
}

export interface PrinterUtilisationStats {
  printerId: string;
  printerName: string;
  todayPrintHours: number;
  sevenDaysPrintHours: number;
  thirtyDaysPrintHours: number;
  totalPrintHours: number;
  completedJobsCount: number;
  failedJobsCount: number;
  successRatePercent: number;
  averagePrintTimeMinutes: number;
  filamentUsedGrams: number;
  estimatedIdleHours: number;
}

export interface PrinterAuditEntry {
  id: string;
  printerId: string;
  printerName: string;
  jobId?: string;
  action: 'Printer Connected' | 'Printer Disconnected' | 'Print Sent' | 'Print Started' | 'Print Paused' | 'Print Resumed' | 'Print Stopped' | 'Print Completed' | 'Print Failed' | 'Settings Changed';
  user: string;
  timestamp: string;
  details?: Record<string, any>;
}

