import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './db';

export interface FirebaseConfig {
  enabled: boolean;
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FirebaseSyncState {
  status: 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  error?: string;
  isConfigured: boolean;
  activeCollectionCount: number;
}

const CONFIG_KEY = 'pokecraft_firebase_config_v1';
const LAST_SYNC_KEY = 'pokecraft_firebase_last_sync';

export const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allows PokeCraft 3D Prints devices to sync orders, production jobs, and filament data
    match /pokecraft_store/{collectionKey} {
      allow read, write: if true;
    }
  }
}`;

export class FirebaseDbService {
  private static instance: FirebaseDbService;
  private config: FirebaseConfig;
  private app: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private isPushing = false;

  private constructor() {
    this.config = this.loadConfig();
    if (this.config.enabled && this.isConfigured()) {
      this.initializeFirebase();
    }
  }

  public static getInstance(): FirebaseDbService {
    if (!FirebaseDbService.instance) {
      FirebaseDbService.instance = new FirebaseDbService();
    }
    return FirebaseDbService.instance;
  }

  public getConfig(): FirebaseConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    const projectId = this.config.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
    const apiKey = this.config.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '';
    return Boolean(projectId.trim() && apiKey.trim());
  }

  private loadConfig(): FirebaseConfig {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }

    return {
      enabled: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
      apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '',
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
      appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
    };
  }

  public saveConfig(newConfig: Partial<FirebaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save Firebase config:', e);
    }

    if (this.config.enabled && this.isConfigured()) {
      this.initializeFirebase();
    } else {
      this.disconnect();
    }

    this.broadcastStatus({
      status: this.isConfigured() ? (this.config.enabled ? 'connected' : 'disconnected') : 'disconnected',
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
      isConfigured: this.isConfigured(),
      activeCollectionCount: 0,
    });
  }

  public initializeFirebase(): void {
    this.disconnect();

    const apiKey = (this.config.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
    const projectId = (this.config.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
    const authDomain = (this.config.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`).trim();
    const storageBucket = (this.config.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`).trim();
    const messagingSenderId = (this.config.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
    const appId = (this.config.appId || import.meta.env.VITE_FIREBASE_APP_ID || '').trim();

    if (!apiKey || !projectId) return;

    try {
      const firebaseOptions = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId,
        appId,
      };

      this.app = getApps().length > 0 ? getApp() : initializeApp(firebaseOptions);
      this.firestore = getFirestore(this.app);

      this.broadcastStatus({
        status: 'connected',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        isConfigured: true,
        activeCollectionCount: 9,
      });

      // Subscribe to real-time updates from Firestore across all collections
      this.subscribeToRealtimeSync();
    } catch (err: any) {
      console.error('Failed to initialize Firebase:', err);
      this.broadcastStatus({
        status: 'error',
        lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY),
        error: err.message,
        isConfigured: true,
        activeCollectionCount: 0,
      });
    }
  }

  private subscribeToRealtimeSync(): void {
    if (!this.firestore) return;

    const collections = [
      'orders',
      'products',
      'customers',
      'production_jobs',
      'printers',
      'filaments',
      'settings',
      'shipping_records',
      'status_history',
    ];

    collections.forEach((colKey) => {
      try {
        const docRef = doc(this.firestore!, 'pokecraft_store', colKey);
        const unsub = onSnapshot(
          docRef,
          (docSnap) => {
            if (this.isPushing) return; // Prevent local echo loop
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && data.payload) {
                const storageKey = 'printflow_v1_' + colKey;
                localStorage.setItem(storageKey, JSON.stringify(data.payload));
                const now = new Date().toISOString();
                localStorage.setItem(LAST_SYNC_KEY, now);
                window.dispatchEvent(new CustomEvent('printflow_db_changed'));
              }
            }
          },
          (error) => {
            console.warn(`Firestore sync snapshot notice on ${colKey}:`, error.message);
          }
        );
        this.unsubscribers.push(unsub);
      } catch (err) {
        console.error(`Failed to subscribe to ${colKey}:`, err);
      }
    });
  }

  public disconnect(): void {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }

  /**
   * Push all current collections to Firestore
   */
  public async pushAllToFirebase(): Promise<{ success: boolean; message: string }> {
    if (!this.firestore) {
      this.initializeFirebase();
    }
    if (!this.firestore) {
      return { success: false, message: 'Firebase is not initialized. Please verify your Project ID and API Key.' };
    }

    try {
      this.isPushing = true;
      const collections = [
        { key: 'orders', data: db.getOrders() },
        { key: 'products', data: db.getProducts() },
        { key: 'customers', data: db.getCustomers() },
        { key: 'production_jobs', data: db.getProductionJobs() },
        { key: 'printers', data: db.getPrinters() },
        { key: 'filaments', data: db.getFilaments() },
        { key: 'settings', data: db.getSettings() },
        { key: 'shipping_records', data: db.getShippingRecords() },
        { key: 'status_history', data: db.getStatusHistory() },
      ];

      for (const item of collections) {
        const docRef = doc(this.firestore, 'pokecraft_store', item.key);
        await setDoc(
          docRef,
          {
            payload: item.data,
            updatedAt: serverTimestamp(),
            syncedBy: 'PokeCraft 3D Studio Device',
          },
          { merge: true }
        );
      }

      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);

      this.broadcastStatus({
        status: 'connected',
        lastSyncedAt: now,
        isConfigured: true,
        activeCollectionCount: collections.length,
      });

      return { success: true, message: `Successfully synced ${collections.length} collections to Firebase Firestore!` };
    } catch (err: any) {
      console.error('Firebase push error:', err);
      return { success: false, message: `Firebase error: ${err.message}` };
    } finally {
      setTimeout(() => {
        this.isPushing = false;
      }, 500);
    }
  }

  /**
   * Pull all collections from Firestore
   */
  public async pullAllFromFirebase(): Promise<{ success: boolean; message: string }> {
    if (!this.firestore) {
      this.initializeFirebase();
    }
    if (!this.firestore) {
      return { success: false, message: 'Firebase is not initialized. Check your configuration.' };
    }

    try {
      const collections = [
        'orders',
        'products',
        'customers',
        'production_jobs',
        'printers',
        'filaments',
        'settings',
        'shipping_records',
        'status_history',
      ];

      let updatedCount = 0;
      for (const colKey of collections) {
        const docRef = doc(this.firestore, 'pokecraft_store', colKey);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.payload) {
            localStorage.setItem('printflow_v1_' + colKey, JSON.stringify(data.payload));
            updatedCount++;
          }
        }
      }

      if (updatedCount === 0) {
        // Cloud is empty, push local data to seed Firestore
        await this.pushAllToFirebase();
        return { success: true, message: 'Initialized Firestore database with local PokeCraft 3D data.' };
      }

      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      window.dispatchEvent(new CustomEvent('printflow_db_changed'));

      return { success: true, message: `Successfully pulled ${updatedCount} collections from Firebase Firestore.` };
    } catch (err: any) {
      return { success: false, message: `Firebase pull error: ${err.message}` };
    }
  }

  /**
   * Test connection to Firebase Firestore
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: 'Please provide both Firebase Project ID and Web API Key.' };
    }

    try {
      this.initializeFirebase();
      if (!this.firestore) {
        throw new Error('Failed to create Firestore instance.');
      }

      // Try reading the test doc or settings doc
      const testDocRef = doc(this.firestore, 'pokecraft_store', '_connection_test');
      await setDoc(testDocRef, { testAt: serverTimestamp(), device: navigator.userAgent }, { merge: true });

      return {
        success: true,
        message: 'Connected to Firebase Firestore! Live multi-device synchronization is fully operational.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Firebase connection test failed: ${err.message}. If permission was denied, ensure Firestore rules allow read/write.`,
      };
    }
  }

  private broadcastStatus(state: FirebaseSyncState): void {
    window.dispatchEvent(new CustomEvent('pokecraft_firebase_sync_status', { detail: state }));
  }
}

export const firebaseDb = FirebaseDbService.getInstance();
