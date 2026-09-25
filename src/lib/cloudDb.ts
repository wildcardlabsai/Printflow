import { db } from './db';

export interface CloudDbConfig {
  enabled: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  syncIntervalSeconds: number;
  autoSync: boolean;
}

export interface CloudSyncState {
  status: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  error?: string;
  isConfigured: boolean;
}

const CONFIG_KEY = 'printflow_cloud_config_v1';
const LAST_SYNC_KEY = 'printflow_cloud_last_sync';

export const SQL_SETUP_SCRIPT = `-- ========================================================
-- PrintFlow 3D Studio: Multi-Device Cloud Database Schema
-- Paste this script into your Supabase SQL Editor and click RUN
-- ========================================================

-- 1. Create the unified document store table for high-speed multi-device sync
CREATE TABLE IF NOT EXISTS public.printflow_store (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.printflow_store ENABLE ROW LEVEL SECURITY;

-- 3. Allow read and write for your PrintFlow devices
DROP POLICY IF EXISTS "Allow anon read/write printflow_store" ON public.printflow_store;
CREATE POLICY "Allow anon read/write printflow_store" 
ON public.printflow_store 
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Enable Realtime updates (Optional, for instant live push)
ALTER PUBLICATION supabase_realtime ADD TABLE public.printflow_store;
`;

export class CloudDbService {
  private static instance: CloudDbService;
  private config: CloudDbConfig;
  private syncTimer: any = null;
  private isSyncing = false;

  private constructor() {
    this.config = this.loadConfig();
    if (this.config.enabled && this.isConfigured()) {
      this.startSyncTimer();
      // Initial pull in background
      setTimeout(() => this.pullFromCloud(), 1500);
    }
  }

  public static getInstance(): CloudDbService {
    if (!CloudDbService.instance) {
      CloudDbService.instance = new CloudDbService();
    }
    return CloudDbService.instance;
  }

  public getConfig(): CloudDbConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    const url = this.config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';
    const key = this.config.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    return Boolean(url.trim() && key.trim());
  }

  public getActiveUrl(): string {
    const url = (this.config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '').trim();
    return url.replace(/\/+$/, '');
  }

  public getActiveKey(): string {
    return (this.config.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  }

  public saveConfig(newConfig: Partial<CloudDbConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save cloud config:', e);
    }

    if (this.config.enabled && this.isConfigured()) {
      this.startSyncTimer();
      this.pullFromCloud();
    } else {
      this.stopSyncTimer();
    }

    this.broadcastStatus({
      status: this.isConfigured() ? (this.config.enabled ? 'connected' : 'disconnected') : 'disconnected',
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
      isConfigured: this.isConfigured(),
    });
  }

  private loadConfig(): CloudDbConfig {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }

    // Default to environment variables if present
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

    return {
      enabled: Boolean(envUrl && envKey),
      supabaseUrl: envUrl,
      supabaseAnonKey: envKey,
      syncIntervalSeconds: 30,
      autoSync: true,
    };
  }

  public async testConnection(customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string }> {
    const url = (customUrl ?? this.getActiveUrl()).replace(/\/+$/, '');
    const key = customKey ?? this.getActiveKey();

    if (!url || !key) {
      return { success: false, message: 'Please provide both Supabase Project URL and Anon Public Key.' };
    }

    try {
      // Try querying the printflow_store table via PostgREST
      const res = await fetch(`${url}/rest/v1/printflow_store?select=key&limit=1`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (res.ok) {
        return {
          success: true,
          message: 'Successfully connected to cloud database! Table printflow_store is ready.',
        };
      }

      if (res.status === 404 || res.status === 400) {
        // Connected to Supabase, but table doesn't exist yet
        return {
          success: true,
          message:
            'Connected to Supabase! The printflow_store table is not created yet. Click "Copy SQL Script" to create it in your SQL Editor.',
        };
      }

      const errText = await res.text().catch(() => '');
      return {
        success: false,
        message: `Connection returned HTTP ${res.status}: ${errText || res.statusText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect: ${err.message || 'Network error'}`,
      };
    }
  }

  /**
   * Pushes all local data collections to the cloud database
   */
  public async pushToCloud(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Cloud database is not configured.' };
    }

    const url = this.getActiveUrl();
    const key = this.getActiveKey();

    try {
      this.isSyncing = true;
      this.broadcastStatus({
        status: 'syncing',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        isConfigured: true,
      });

      const collections = [
        { key: 'orders', data: db.getOrders() },
        { key: 'products', data: db.getProducts() },
        { key: 'customers', data: db.getCustomers() },
        { key: 'productionJobs', data: db.getProductionJobs() },
        { key: 'printers', dbKey: 'printers', data: db.getPrinters() },
        { key: 'filaments', data: db.getFilaments() },
        { key: 'settings', data: db.getSettings() },
        { key: 'shippingRecords', data: db.getShippingRecords() },
        { key: 'statusHistory', data: db.getStatusHistory() },
      ];

      const now = new Date().toISOString();
      const recordsToUpsert = collections.map((c) => ({
        key: c.key,
        data: c.data,
        updated_at: now,
      }));

      // PostgREST upsert via POST with Prefer: resolution=merge-duplicates
      const res = await fetch(`${url}/rest/v1/printflow_store`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(recordsToUpsert),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Cloud upsert failed (${res.status}): ${errText}`);
      }

      localStorage.setItem(LAST_SYNC_KEY, now);
      this.broadcastStatus({
        status: 'connected',
        lastSyncedAt: now,
        isConfigured: true,
      });

      return { success: true, message: 'All local data successfully pushed to the cloud!' };
    } catch (err: any) {
      console.error('Push to cloud error:', err);
      this.broadcastStatus({
        status: 'error',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        error: err.message,
        isConfigured: true,
      });
      return { success: false, message: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pulls all collections from cloud database into local storage
   */
  public async pullFromCloud(): Promise<{ success: boolean; message: string; updatedKeys?: string[] }> {
    if (!this.isConfigured() || this.isSyncing) {
      return { success: false, message: 'Cloud database not configured or sync in progress.' };
    }

    const url = this.getActiveUrl();
    const key = this.getActiveKey();

    try {
      this.isSyncing = true;
      this.broadcastStatus({
        status: 'syncing',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        isConfigured: true,
      });

      const res = await fetch(`${url}/rest/v1/printflow_store?select=*`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Cloud query failed (${res.status})`);
      }

      const rows: Array<{ key: string; data: any; updated_at: string }> = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) {
        // Cloud has no data yet, push local data up
        await this.pushToCloud();
        return { success: true, message: 'Initialized cloud storage with local records.' };
      }

      const updatedKeys: string[] = [];

      for (const row of rows) {
        if (!row.key || row.data === undefined) continue;
        try {
          const storageKey = 'printflow_v1_' + row.key;
          localStorage.setItem(storageKey, JSON.stringify(row.data));
          updatedKeys.push(row.key);
        } catch (e) {
          console.error(`Failed to apply cloud row ${row.key}:`, e);
        }
      }

      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);

      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('printflow_db_changed'));

      this.broadcastStatus({
        status: 'connected',
        lastSyncedAt: now,
        isConfigured: true,
      });

      return {
        success: true,
        message: `Synced ${updatedKeys.length} collections from cloud database.`,
        updatedKeys,
      };
    } catch (err: any) {
      console.warn('Cloud pull notice:', err.message);
      this.broadcastStatus({
        status: 'error',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        error: err.message,
        isConfigured: true,
      });
      return { success: false, message: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  private startSyncTimer(): void {
    this.stopSyncTimer();
    const intervalMs = Math.max(10, this.config.syncIntervalSeconds || 30) * 1000;
    this.syncTimer = setInterval(() => {
      if (this.config.enabled && this.config.autoSync) {
        this.pullFromCloud();
      }
    }, intervalMs);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private broadcastStatus(state: CloudSyncState): void {
    window.dispatchEvent(new CustomEvent('printflow_cloud_sync_status', { detail: state }));
  }
}

export const cloudDb = CloudDbService.getInstance();
