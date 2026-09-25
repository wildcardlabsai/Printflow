import crypto from 'crypto';
import { serverStore } from '../storage';

const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const ETSY_API_BASE = 'https://openapi.etsy.com/v3/application';

export interface RawEtsyReceipt {
  receipt_id: number;
  name: string;
  first_line: string;
  second_line?: string;
  city: string;
  state?: string;
  zip: string;
  country_iso: string;
  buyer_email?: string;
  grandtotal: { amount: number; divisor: number; currency_code: string };
  subtotal: { amount: number; divisor: number };
  total_shipping_cost: { amount: number; divisor: number };
  discount_amt: { amount: number; divisor: number };
  is_paid: boolean;
  is_shipped: boolean;
  message_from_buyer?: string;
  create_timestamp: number;
  transactions: Array<{
    transaction_id: number;
    title: string;
    listing_id: number;
    sku?: string;
    quantity: number;
    price: { amount: number; divisor: number };
    variations?: Array<{ formatted_name: string; formatted_value: string }>;
  }>;
}

export class EtsyService {
  public static getClientId(): string | undefined {
    return process.env.ETSY_API_KEY || process.env.ETSY_CLIENT_ID;
  }

  public static getClientSecret(): string | undefined {
    return process.env.ETSY_CLIENT_SECRET;
  }

  /**
   * Generates PKCE code_verifier and code_challenge (S256)
   */
  public static generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Constructs the official Etsy OAuth 2.0 PKCE URL
   */
  public static buildAuthUrl(redirectUri: string): { url: string; state: string } {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('ETSY_API_KEY (or ETSY_CLIENT_ID) is not configured in server environment.');
    }

    const { codeVerifier, codeChallenge } = this.generatePkce();
    const state = crypto.randomBytes(24).toString('hex');

    // Save pending state on server with 15min TTL
    serverStore.savePendingState(state, {
      codeVerifier,
      channel: 'Etsy',
    });

    const scopes = [
      'transactions_r',
      'transactions_w',
      'listings_r',
      'listings_w',
      'shops_r',
      'email_r',
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${ETSY_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchanges authorization code for access & refresh tokens
   */
  public static async handleCallback(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<{ shopId: string; shopName: string }> {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('ETSY_API_KEY is missing from environment.');
    }

    const pending = serverStore.getPendingState(state);
    if (!pending || !pending.codeVerifier) {
      throw new Error('Invalid or expired OAuth state parameter. Please restart authorization.');
    }

    serverStore.removePendingState(state);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
      code_verifier: pending.codeVerifier,
    });

    const response = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const tokenData = await response.json();
    if (!response.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token with Etsy.');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Fetch user and shop info
    const shopInfo = await this.fetchShopDetails(accessToken, clientId);

    const creds = serverStore.getCredentials();
    creds.etsy = {
      accessToken,
      refreshToken,
      expiresAt,
      shopId: String(shopInfo.shopId),
      shopName: shopInfo.shopName,
      userId: String(shopInfo.userId),
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };
    serverStore.saveCredentials(creds);

    return shopInfo;
  }

  /**
   * Refreshes access token if within 5 minutes of expiration
   */
  public static async getValidAccessToken(): Promise<{ accessToken: string; shopId: string; clientId: string }> {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('ETSY_API_KEY environment variable is not configured.');
    }

    const creds = serverStore.getCredentials();
    if (!creds.etsy) {
      throw new Error('Etsy account is not connected.');
    }

    const { accessToken, refreshToken, expiresAt, shopId } = creds.etsy;

    // If token is still valid for > 5 minutes, reuse it
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return { accessToken, shopId, clientId };
    }

    // Refresh token
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const tokenData = await response.json();
    if (!response.ok) {
      throw new Error(tokenData.error_description || 'Etsy token refresh failed. Re-authentication required.');
    }

    const newAccessToken = tokenData.access_token;
    const newRefreshToken = tokenData.refresh_token || refreshToken;
    const expiresIn = tokenData.expires_in || 3600;

    creds.etsy.accessToken = newAccessToken;
    creds.etsy.refreshToken = newRefreshToken;
    creds.etsy.expiresAt = Date.now() + expiresIn * 1000;
    serverStore.saveCredentials(creds);

    return { accessToken: newAccessToken, shopId, clientId };
  }

  /**
   * Helper to retrieve connected shop info
   */
  private static async fetchShopDetails(accessToken: string, clientId: string): Promise<{ userId: string; shopId: string; shopName: string }> {
    // 1. Get Me
    const userRes = await fetch(`${ETSY_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
      },
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      throw new Error(`Failed to fetch Etsy user profile: ${err}`);
    }

    const userData = await userRes.json();
    const userId = userData.user_id;

    // 2. Get User's Shop
    const shopRes = await fetch(`${ETSY_API_BASE}/users/${userId}/shops`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
      },
    });

    if (!shopRes.ok) {
      const err = await shopRes.text();
      throw new Error(`Failed to fetch Etsy shop: ${err}`);
    }

    const shopData = await shopRes.json();
    const shop = Array.isArray(shopData) ? shopData[0] : shopData;

    return {
      userId: String(userId),
      shopId: String(shop.shop_id),
      shopName: shop.shop_name || 'Etsy Shop',
    };
  }

  /**
   * Fetches unfulfilled/paid receipts from Etsy Open API v3
   */
  public static async fetchUnfulfilledOrders(): Promise<RawEtsyReceipt[]> {
    const { accessToken, shopId, clientId } = await this.getValidAccessToken();

    const url = `${ETSY_API_BASE}/shops/${shopId}/receipts?was_paid=true&was_shipped=false&limit=50`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': clientId,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Etsy API error fetching receipts (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.results || [];
  }

  /**
   * Sends tracking fulfillment information back to Etsy
   */
  public static async submitTracking(receiptId: string, trackingNumber: string, carrier: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { accessToken, shopId, clientId } = await this.getValidAccessToken();

      const url = `${ETSY_API_BASE}/shops/${shopId}/receipts/${receiptId}/tracking`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-api-key': clientId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          tracking_code: trackingNumber,
          carrier_name: carrier,
          send_bcc: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Etsy tracking submission failed (${res.status}): ${errText}` };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Unknown network error submitting tracking to Etsy' };
    }
  }

  /**
   * Validates Etsy webhook signature
   */
  public static validateWebhookSignature(signature: string, payload: string, secret: string): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
    } catch (e) {
      return false;
    }
  }
}
