import {
  MarketplaceConnectionStatus,
  ProductMapping,
  SyncLogEntry,
  ShippingCarrierConfig,
  ShippingLabelResult,
  Order,
  Product,
  Customer,
} from '../../types';

export interface SyncResponse {
  success: boolean;
  result?: {
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    ordersRequiringMapping: number;
    errors: string[];
  };
  updatedOrders?: Order[];
  newProductionJobs?: any[];
  updatedCustomers?: Customer[];
  newNextOrderNumber?: number;
  error?: string;
}

export const integrationsApi = {
  // 1. Connection Status
  async getStatus(): Promise<{
    marketplaces: MarketplaceConnectionStatus[];
    configState: { etsyConfigured: boolean; ebayConfigured: boolean };
  }> {
    const res = await fetch('/api/integrations/status');
    if (!res.ok) throw new Error('Failed to fetch integration status');
    return res.json();
  },

  // 2. Etsy OAuth & Actions
  async getEtsyAuthUrl(): Promise<{ url: string; state: string; redirectUri: string }> {
    const res = await fetch('/api/integrations/etsy/auth-url');
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to get Etsy authorization URL');
    }
    return res.json();
  },

  async disconnectEtsy(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/integrations/etsy/disconnect', { method: 'POST' });
    return res.json();
  },

  async syncEtsy(context: {
    existingOrders: Order[];
    existingProducts: Product[];
    existingCustomers: Customer[];
    nextOrderNumber: number;
    orderPrefix: string;
  }): Promise<SyncResponse> {
    const res = await fetch('/api/integrations/etsy/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    return res.json();
  },

  async fulfillEtsy(receiptId: string, trackingNumber: string, carrier: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/integrations/etsy/fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId, trackingNumber, carrier }),
    });
    return res.json();
  },

  // 3. eBay OAuth & Actions
  async getEbayAuthUrl(): Promise<{ url: string; state: string; redirectUri: string }> {
    const res = await fetch('/api/integrations/ebay/auth-url');
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to get eBay authorization URL');
    }
    return res.json();
  },

  async disconnectEbay(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/integrations/ebay/disconnect', { method: 'POST' });
    return res.json();
  },

  async syncEbay(context: {
    existingOrders: Order[];
    existingProducts: Product[];
    existingCustomers: Customer[];
    nextOrderNumber: number;
    orderPrefix: string;
  }): Promise<SyncResponse> {
    const res = await fetch('/api/integrations/ebay/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    return res.json();
  },

  async fulfillEbay(orderId: string, trackingNumber: string, carrierCode: string): Promise<{ success: boolean; fulfillmentId?: string; error?: string }> {
    const res = await fetch('/api/integrations/ebay/fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, trackingNumber, carrierCode }),
    });
    return res.json();
  },

  // 4. Product / SKU Mappings
  async getMappings(): Promise<ProductMapping[]> {
    const res = await fetch('/api/mappings');
    if (!res.ok) throw new Error('Failed to fetch mappings');
    return res.json();
  },

  async saveMapping(mapping: Partial<ProductMapping>): Promise<ProductMapping> {
    const res = await fetch('/api/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save product mapping');
    }
    return res.json();
  },

  async deleteMapping(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/mappings/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // 5. Sync Logs
  async getSyncLogs(): Promise<SyncLogEntry[]> {
    const res = await fetch('/api/sync/logs');
    if (!res.ok) throw new Error('Failed to fetch sync logs');
    return res.json();
  },

  // 6. Shipping Integrations
  async getCarriers(): Promise<ShippingCarrierConfig[]> {
    const res = await fetch('/api/shipping/carriers');
    if (!res.ok) throw new Error('Failed to fetch carriers');
    return res.json();
  },

  async createShippingLabel(payload: {
    orderId: string;
    carrierId: string;
    serviceCode: string;
    recipient: any;
    package: { weightGrams: number };
  }): Promise<ShippingLabelResult> {
    const res = await fetch('/api/shipping/create-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};
