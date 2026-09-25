/**
 * PokeCraft 3D Prints - Live Multi-Device Cloud Sync Service
 * Maintains real-time SSE stream & bi-directional synchronization with central cloud database
 */
import { db } from './db';

export interface LiveSyncState {
  status: 'connected' | 'syncing' | 'offline' | 'connecting';
  connectedDevices: number;
  lastSyncTime: string | null;
  error?: string;
}

class LiveSyncService {
  private static instance: LiveSyncService;
  private clientId: string;
  private eventSource: EventSource | null = null;
  private state: LiveSyncState = {
    status: 'connecting',
    connectedDevices: 1,
    lastSyncTime: null,
  };
  private pushDebounceTimer: any = null;
  private pendingPushKeys: Set<string> = new Set();
  private reconnectTimer: any = null;
  private isApplyingRemoteUpdate = false;

  private constructor() {
    this.clientId = this.getOrCreateClientId();
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public static getInstance(): LiveSyncService {
    if (!LiveSyncService.instance) {
      LiveSyncService.instance = new LiveSyncService();
    }
    return LiveSyncService.instance;
  }

  private getOrCreateClientId(): string {
    if (typeof window === 'undefined') return 'server';
    let id = sessionStorage.getItem('pokecraft_client_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
      sessionStorage.setItem('pokecraft_client_id', id);
    }
    return id;
  }

  public getState(): LiveSyncState {
    return { ...this.state };
  }

  private init(): void {
    // 1. Initial State Hydration from Server
    this.hydrateFromServer().catch((err) => {
      console.warn('[LiveSync] Initial hydration notice:', err);
    });

    // 2. Connect Server-Sent Events (SSE) stream for live updates
    this.connectStream();

    // 3. Reconnect on online / visibilitychange
    window.addEventListener('online', () => this.connectStream());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.hydrateFromServer();
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.connectStream();
        }
      }
    });
  }

  private connectStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const url = `/api/database/stream?clientId=${encodeURIComponent(this.clientId)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.updateState({ status: 'connected' });
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.handleServerEvent(payload);
        } catch (err) {
          console.error('[LiveSync] Error parsing server event:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.updateState({ status: 'offline' });
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Retry in 5 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectStream();
          }, 5000);
        }
      };
    } catch (err: any) {
      console.warn('[LiveSync] Failed to initialize SSE stream:', err);
      this.updateState({ status: 'offline', error: err.message });
    }
  }

  private handleServerEvent(event: any): void {
    if (event.type === 'heartbeat') {
      return;
    }

    if (event.type === 'connected') {
      this.updateState({
        status: 'connected',
        connectedDevices: event.totalConnectedDevices || 1,
        lastSyncTime: event.updatedAt || new Date().toISOString(),
      });
      return;
    }

    if (event.type === 'db_update') {
      this.updateState({
        status: 'connected',
        connectedDevices: event.connectedDevices || this.state.connectedDevices,
        lastSyncTime: event.timestamp || new Date().toISOString(),
      });

      // Avoid echo loop if this client sent the update
      if (event.senderClientId === this.clientId) {
        return;
      }

      if (event.collections && typeof event.collections === 'object') {
        this.applyRemoteCollections(event.collections);
      }
    }
  }

  private applyRemoteCollections(collections: Record<string, any>): void {
    try {
      this.isApplyingRemoteUpdate = true;
      for (const [key, val] of Object.entries(collections)) {
        if (val !== undefined) {
          localStorage.setItem('printflow_v1_' + key, JSON.stringify(val));
        }
      }
      // Notify application UI to re-read from local database
      window.dispatchEvent(new CustomEvent('printflow_db_changed'));
    } catch (err) {
      console.error('[LiveSync] Error applying remote collections:', err);
    } finally {
      setTimeout(() => {
        this.isApplyingRemoteUpdate = false;
      }, 200);
    }
  }

  public async hydrateFromServer(): Promise<void> {
    try {
      const res = await fetch('/api/database/state');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.collections) {
        const serverKeys = Object.keys(data.collections);

        if (serverKeys.length === 0) {
          // Server is empty (fresh start) -> upload current local state to seed the cloud database!
          await this.pushAllCollectionsToServer();
        } else {
          // Server has data -> apply to local storage
          this.applyRemoteCollections(data.collections);
        }

        this.updateState({
          status: 'connected',
          connectedDevices: data.connectedDevices || 1,
          lastSyncTime: data.updatedAt,
        });
      }
    } catch (err: any) {
      console.warn('[LiveSync] Hydrate notice:', err.message);
    }
  }

  /**
   * Pushes a modified collection to the central database
   */
  public queueCollectionPush(key: string): void {
    if (this.isApplyingRemoteUpdate) return; // Don't re-upload incoming remote updates

    this.pendingPushKeys.add(key);

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }

    this.pushDebounceTimer = setTimeout(() => {
      this.flushPendingPushes();
    }, 400);
  }

  private async flushPendingPushes(): Promise<void> {
    if (this.pendingPushKeys.size === 0) return;

    const keysToPush = Array.from(this.pendingPushKeys);
    this.pendingPushKeys.clear();

    const collectionsPayload: Record<string, any> = {};

    for (const key of keysToPush) {
      try {
        const raw = localStorage.getItem('printflow_v1_' + key);
        if (raw) {
          collectionsPayload[key] = JSON.parse(raw);
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (Object.keys(collectionsPayload).length === 0) return;

    try {
      this.updateState({ status: 'syncing' });
      const res = await fetch('/api/database/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: collectionsPayload,
          clientId: this.clientId,
          origin: 'client_push',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.updateState({
          status: 'connected',
          connectedDevices: data.connectedDevices || 1,
          lastSyncTime: data.updatedAt,
        });
      }
    } catch (err: any) {
      console.warn('[LiveSync] Push notice:', err.message);
      this.updateState({ status: 'offline', error: err.message });
    }
  }

  /**
   * Push all current local data collections to server
   */
  public async pushAllCollectionsToServer(): Promise<{ success: boolean; message: string }> {
    try {
      this.updateState({ status: 'syncing' });
      const collections = {
        orders: db.getOrders(),
        products: db.getProducts(),
        customers: db.getCustomers(),
        production_jobs: db.getProductionJobs(),
        printers: db.getPrinters(),
        filaments: db.getFilaments(),
        settings: db.getSettings(),
        shipping_records: db.getShippingRecords(),
        status_history: db.getStatusHistory(),
        audit_logs: db.getAuditLogs(),
      };

      const res = await fetch('/api/database/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections,
          clientId: this.clientId,
          origin: 'full_seed',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.updateState({
          status: 'connected',
          connectedDevices: data.connectedDevices || 1,
          lastSyncTime: data.updatedAt,
        });
        return { success: true, message: 'All local collections successfully synced to central cloud!' };
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      this.updateState({ status: 'offline', error: err.message });
      return { success: false, message: err.message };
    }
  }

  private updateState(updates: Partial<LiveSyncState>): void {
    this.state = { ...this.state, ...updates };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pokecraft_live_sync_status', { detail: this.state }));
    }
  }
}

export const liveSync = LiveSyncService.getInstance();
