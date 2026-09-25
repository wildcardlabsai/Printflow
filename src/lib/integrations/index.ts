import { IntegrationStatus } from './types';

export * from './types';
export * from './marketplace';
export * from './shipping';
export * from './printer';

export const INTEGRATION_REGISTRY_STATUS: IntegrationStatus[] = [
  {
    providerId: 'etsy',
    name: 'Etsy Open API v3',
    type: 'marketplace',
    enabled: false,
    phase: 2,
    description: 'Direct multi-shop order sync, real-time dispatch tracking, and listing inventory allocation.',
    status: 'pending_phase',
  },
  {
    providerId: 'ebay',
    name: 'eBay Fulfillment API',
    type: 'marketplace',
    enabled: false,
    phase: 2,
    description: 'Automatic sync of buy-it-now and auction orders with batch shipping label dispatch.',
    status: 'pending_phase',
  },
  {
    providerId: 'meta',
    name: 'Facebook Marketplace / Meta Graph API',
    type: 'marketplace',
    enabled: false,
    phase: 2,
    description: 'Synchronise buyer orders and customer messages from Commerce Manager.',
    status: 'pending_phase',
  },
  {
    providerId: 'royal_mail',
    name: 'Royal Mail Click & Drop API',
    type: 'shipping',
    enabled: false,
    phase: 2,
    description: 'Generate Tracked 24/48 100x150mm barcodes, create manifests, and retrieve real tracking status.',
    status: 'pending_phase',
  },
  {
    providerId: 'evri',
    name: 'Evri (Hermes) Corporate API',
    type: 'shipping',
    enabled: false,
    phase: 2,
    description: 'Standard and Next Day parcel generation, locker drop-off manifests, and live tracking webhooks.',
    status: 'pending_phase',
  },
  {
    providerId: 'dpd',
    name: 'DPD Local Ship API',
    type: 'shipping',
    enabled: false,
    phase: 2,
    description: 'Pre-12 and Next Day courier consignments with 1-hour delivery window notifications.',
    status: 'pending_phase',
  },
  {
    providerId: 'flashforge',
    name: 'Flashforge Cloud & LAN Protocol',
    type: 'printer',
    enabled: false,
    phase: 3,
    description: 'Direct WebSocket/TCP telemetry for Flashforge AD5X & Adventurer 5M: nozzle temps, remaining time, live camera feed, and gcode pushing.',
    status: 'pending_phase',
  },
];
