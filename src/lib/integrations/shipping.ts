export interface ShippingRateQuote {
  serviceCode: string;
  serviceName: string;
  carrier: string;
  rate: number;
  currency: string;
  estimatedDeliveryDays?: number;
}

export interface ShippingLabelRequest {
  orderId: string;
  internalOrderId: string;
  recipient: {
    name: string;
    phone?: string;
    street: string;
    city: string;
    stateOrCounty: string;
    postcode: string;
    country: string;
  };
  parcel: {
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  serviceCode: string;
}

export interface ShippingLabelResponse {
  trackingNumber: string;
  labelUrl: string;
  format: 'PDF' | 'PNG' | 'ZPL';
  carrier: string;
  service: string;
  cost: number;
}

export interface ShippingIntegration {
  readonly carrierId: string;
  readonly carrierName: string;
  readonly phaseTarget: 2;

  getRates(request: ShippingLabelRequest): Promise<ShippingRateQuote[]>;
  generateLabel(request: ShippingLabelRequest): Promise<ShippingLabelResponse>;
  cancelLabel(trackingNumber: string): Promise<{ success: boolean; error?: string }>;
  trackShipment(trackingNumber: string): Promise<{ status: string; history: Array<{ status: string; timestamp: string; location: string }> }>;
}
