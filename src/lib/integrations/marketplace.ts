import { Order, SalesChannel } from '../../types';

export interface ExternalMarketplaceOrder {
  externalOrderId: string;
  channel: SalesChannel;
  orderDate: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    countyOrState: string;
    postcode: string;
    country: string;
  };
  items: Array<{
    externalListingId: string;
    sku: string;
    title: string;
    quantity: number;
    price: number;
    variations?: Record<string, string>;
  }>;
  shippingAmountPaid: number;
  currency: string;
  subtotal: number;
  total: number;
  buyerNote?: string;
}

export interface MarketplaceSyncResult {
  ordersImported: number;
  ordersUpdated: number;
  duplicatesSkipped: number;
  errors: Array<{ externalId: string; reason: string }>;
}

export interface MarketplaceIntegration {
  readonly channelName: SalesChannel;
  readonly isConnected: boolean;
  readonly phaseTarget: 2;

  authenticate(credentials: { apiKey: string; apiSecret: string; shopId?: string }): Promise<{ success: boolean; error?: string }>;
  fetchUnfulfilledOrders(): Promise<ExternalMarketplaceOrder[]>;
  updateShipmentTracking(externalOrderId: string, trackingNumber: string, carrier: string): Promise<{ success: boolean; error?: string }>;
  syncInventoryLevel(sku: string, availableQuantity: number): Promise<{ success: boolean; error?: string }>;
}

/**
 * Base marketplace adapter pattern for Phase 2.
 * Real marketplace integrations (Etsy OpenAPI v3, eBay Fulfillment API, Facebook Graph)
 * will implement this interface.
 */
export class MarketplaceRegistry {
  private static registeredChannels: Map<SalesChannel, MarketplaceIntegration> = new Map();

  public static register(channel: SalesChannel, adapter: MarketplaceIntegration) {
    this.registeredChannels.set(channel, adapter);
  }

  public static get(channel: SalesChannel): MarketplaceIntegration | undefined {
    return this.registeredChannels.get(channel);
  }

  public static getAvailableChannels(): SalesChannel[] {
    return ['Etsy', 'eBay', 'Facebook Marketplace', 'Website', 'Manual'];
  }
}
