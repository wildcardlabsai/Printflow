export type IntegrationType = 'marketplace' | 'shipping' | 'printer';
export type IntegrationProviderId = 'etsy' | 'ebay' | 'meta' | 'royal_mail' | 'evri' | 'dpd' | 'flashforge';

export interface IntegrationStatus {
  providerId: IntegrationProviderId;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  phase: 2 | 3;
  description: string;
  lastSyncAt?: string;
  status: 'not_configured' | 'pending_phase' | 'connected' | 'error';
  errorMessage?: string;
}

export interface SyncLogEntry {
  id: string;
  providerId: IntegrationProviderId;
  direction: 'inbound' | 'outbound';
  entity: 'orders' | 'inventory' | 'tracking' | 'telemetry';
  status: 'success' | 'failed' | 'in_progress';
  recordsProcessed: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  rawPayload?: any;
}
