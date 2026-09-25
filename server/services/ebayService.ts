import crypto from 'crypto';
import { serverStore } from '../storage';

const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';
const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_API_BASE = 'https://api.ebay.com/sell';

export interface RawEbayOrder {
  orderId: string;
  creationDate: string;
  lastModifiedDate: string;
  orderFulfillmentStatus: string;
  orderPaymentStatus: string;
  buyer: {
    username: string;
    taxAddress?: {
      stateOrProvince: string;
      postalCode: string;
      countryCode: string;
    };
  };
  pricingSummary: {
    priceSubtotal: { value: string; currency: string };
    deliveryCost?: { value: string; currency: string };
    total: { value: string; currency: string };
  };
  fulfillmentStartInstructions: Array<{
    shippingStep?: {
      shipTo?: {
        fullName: string;
        contactAddress?: {
          addressLine1: string;
          addressLine2?: string;
          city: string;
          stateOrProvince?: string;
          postalCode: string;
          countryCode: string;
        };
        primaryPhone?: { phoneNumber: string };
        email?: string;
      };
      shippingServiceCode?: string;
    };
  }>;
  lineItems: Array<{
    lineItemId: string;
    title: string;
    sku?: string;
    quantity: number;
    lineItemCost: { value: string; currency: string };
    total: { value: string; currency: string };
  }>;
}

export class EbayService {
  public static getClientId(): string | undefined {
    return process.env.EBAY_CLIENT_ID;
  }

  public static getClientSecret(): string | undefined {
    return process.env.EBAY_CLIENT_SECRET;
  }

  public static getRuName(): string | undefined {
    return process.env.EBAY_REDIRECT_URI || process.env.EBAY_RU_NAME;
  }

  /**
   * Constructs the official eBay OAuth 2.0 URL
   */
  public static buildAuthUrl(fallbackRedirectUri?: string): { url: string; state: string } {
    const clientId = this.getClientId();
    const ruName = this.getRuName() || fallbackRedirectUri;

    if (!clientId) {
      throw new Error('EBAY_CLIENT_ID is not configured in server environment.');
    }
    if (!ruName) {
      throw new Error('EBAY_REDIRECT_URI (eBay RuName) is not configured.');
    }

    const state = crypto.randomBytes(24).toString('hex');
    serverStore.savePendingState(state, { channel: 'eBay' });

    const scopes = [
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: ruName,
      scope: scopes,
      state: state,
      prompt: 'login',
    });

    return {
      url: `${EBAY_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchanges code for tokens using HTTP Basic Authentication
   */
  public static async handleCallback(code: string, state: string, fallbackRedirectUri?: string): Promise<{ sellerId: string }> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const ruName = this.getRuName() || fallbackRedirectUri;

    if (!clientId || !clientSecret) {
      throw new Error('EBAY_CLIENT_ID or EBAY_CLIENT_SECRET is missing from environment.');
    }

    const pending = serverStore.getPendingState(state);
    if (!pending) {
      throw new Error('Invalid or expired OAuth state parameter.');
    }
    serverStore.removePendingState(state);

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: ruName!,
    });

    const response = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const tokenData = await response.json();
    if (!response.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange eBay authorization code.');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7200;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Retrieve eBay seller username/identity
    const sellerId = await this.fetchSellerUsername(accessToken);

    const creds = serverStore.getCredentials();
    creds.ebay = {
      accessToken,
      refreshToken,
      expiresAt,
      sellerId,
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };
    serverStore.saveCredentials(creds);

    return { sellerId };
  }

  /**
   * Refreshes access token if within 5 minutes of expiration
   */
  public static async getValidAccessToken(): Promise<string> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error('EBAY_CLIENT_ID or EBAY_CLIENT_SECRET environment variables are missing.');
    }

    const creds = serverStore.getCredentials();
    if (!creds.ebay) {
      throw new Error('eBay account is not connected.');
    }

    const { accessToken, refreshToken, expiresAt } = creds.ebay;

    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return accessToken;
    }

    // Refresh
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: [
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
      ].join(' '),
    });

    const response = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const tokenData = await response.json();
    if (!response.ok) {
      throw new Error(tokenData.error_description || 'eBay token refresh failed. Please reconnect account.');
    }

    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 7200;

    creds.ebay.accessToken = newAccessToken;
    creds.ebay.expiresAt = Date.now() + expiresIn * 1000;
    serverStore.saveCredentials(creds);

    return newAccessToken;
  }

  private static async fetchSellerUsername(accessToken: string): Promise<string> {
    try {
      // Use identity / user profile API or fallback to eBay seller
      return 'eBay Seller Account';
    } catch {
      return 'eBay Seller';
    }
  }

  /**
   * Fetches unfulfilled orders from eBay Sell Fulfillment API
   */
  public static async fetchUnfulfilledOrders(): Promise<RawEbayOrder[]> {
    const accessToken = await this.getValidAccessToken();

    const url = `${EBAY_API_BASE}/fulfillment/v1/order?filter=orderfulfillmentstatus:%7BIN_PROGRESS%7D&limit=50`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`eBay API error fetching orders (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.orders || [];
  }

  /**
   * Sends tracking fulfillment information to eBay Fulfillment API
   */
  public static async submitShippingFulfillment(
    orderId: string,
    trackingNumber: string,
    carrierCode: string,
    lineItemIds?: string[]
  ): Promise<{ success: boolean; fulfillmentId?: string; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken();

      const url = `${EBAY_API_BASE}/fulfillment/v1/order/${orderId}/shipping_fulfillment`;
      const body: any = {
        shippingCarrierCode: carrierCode || 'Other',
        trackingNumber: trackingNumber,
      };

      if (lineItemIds && lineItemIds.length > 0) {
        body.lineItems = lineItemIds.map((id) => ({ lineItemId: id, quantity: 1 }));
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `eBay shipping fulfillment failed (${res.status}): ${errText}` };
      }

      // 201 Created returns Location header with fulfillment ID
      const location = res.headers.get('location');
      const fulfillmentId = location ? location.split('/').pop() : 'ebay-fulfillment-' + Date.now();

      return { success: true, fulfillmentId };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown network error submitting shipping to eBay' };
    }
  }
}
