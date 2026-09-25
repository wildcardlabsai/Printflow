import React, { useState, useEffect } from 'react';
import { liveSync, LiveSyncState } from '../../lib/liveSync';
import { firebaseDb, FirebaseConfig, FirebaseSyncState, FIRESTORE_RULES_SNIPPET } from '../../lib/firebaseDb';
import { cloudDb, CloudDbConfig, CloudSyncState, SQL_SETUP_SCRIPT } from '../../lib/cloudDb';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import {
  Flame,
  Cloud,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Laptop,
  Smartphone,
  Server,
  Zap,
  Key,
  ShieldCheck,
  Check,
  Globe,
  Radio,
} from 'lucide-react';

export const CloudDatabaseSettingsView: React.FC = () => {
  const { showToast } = useNotification();

  // Central Live Sync State (Zero-config, built-in real-time synchronization)
  const [liveState, setLiveState] = useState<LiveSyncState>(() => liveSync.getState());
  const [isSyncingLive, setIsSyncingLive] = useState(false);

  // Optional External Database Engine (Firebase / Supabase)
  const [activeEngine, setActiveEngine] = useState<'firebase' | 'supabase'>('firebase');

  // Firebase State
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(firebaseDb.getConfig());
  const [fbState, setFbState] = useState<FirebaseSyncState>({
    status: firebaseDb.isConfigured() ? (firebaseDb.getConfig().enabled ? 'connected' : 'disconnected') : 'disconnected',
    lastSyncedAt: localStorage.getItem('pokecraft_firebase_last_sync'),
    isConfigured: firebaseDb.isConfigured(),
    activeCollectionCount: 9,
  });
  const [isTestingFb, setIsTestingFb] = useState(false);
  const [isSyncingFb, setIsSyncingFb] = useState(false);
  const [isSavingFb, setIsSavingFb] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  // Supabase State
  const [sbConfig, setSbConfig] = useState<CloudDbConfig>(cloudDb.getConfig());
  const [sbState, setSbState] = useState<CloudSyncState>({
    status: cloudDb.isConfigured() ? (cloudDb.getConfig().enabled ? 'connected' : 'disconnected') : 'disconnected',
    lastSyncedAt: localStorage.getItem('printflow_cloud_last_sync'),
    isConfigured: cloudDb.isConfigured(),
  });
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [isSyncingSb, setIsSyncingSb] = useState(false);
  const [isSavingSb, setIsSavingSb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const handleLiveStatus = (e: any) => {
      if (e.detail) setLiveState(e.detail);
    };
    const handleFbStatus = (e: any) => {
      if (e.detail) setFbState(e.detail);
    };
    const handleSbStatus = (e: any) => {
      if (e.detail) setSbState(e.detail);
    };

    window.addEventListener('pokecraft_live_sync_status', handleLiveStatus);
    window.addEventListener('pokecraft_firebase_sync_status', handleFbStatus);
    window.addEventListener('printflow_cloud_sync_status', handleSbStatus);

    return () => {
      window.removeEventListener('pokecraft_live_sync_status', handleLiveStatus);
      window.removeEventListener('pokecraft_firebase_sync_status', handleFbStatus);
      window.removeEventListener('printflow_cloud_sync_status', handleSbStatus);
    };
  }, []);

  // Central Live Sync Handler
  const handleForceLiveSync = async () => {
    setIsSyncingLive(true);
    try {
      await liveSync.hydrateFromServer();
      await liveSync.pushAllCollectionsToServer();
      showToast({
        type: 'success',
        title: 'Multi-Device Sync Complete',
        message: 'All orders, inventory, and production jobs are live across all devices.',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sync Notice', message: err.message });
    } finally {
      setIsSyncingLive(false);
    }
  };

  // Firebase Handlers
  const handleTestFirebase = async () => {
    setIsTestingFb(true);
    try {
      const res = await firebaseDb.testConnection();
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Firebase Connected',
          message: res.message,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Firebase Connection Notice',
          message: res.message,
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Connection Error', message: err.message });
    } finally {
      setIsTestingFb(false);
    }
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFb(true);
    try {
      firebaseDb.saveConfig(fbConfig);
      showToast({
        type: 'success',
        title: 'Firebase Credentials Saved',
        message: 'External Firestore sync enabled.',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSavingFb(false);
    }
  };

  const handleSyncFirebaseNow = async () => {
    setIsSyncingFb(true);
    try {
      const pushRes = await firebaseDb.pushAllToFirebase();
      if (pushRes.success) {
        showToast({
          type: 'success',
          title: 'Firebase Mirror Complete',
          message: 'All collections successfully backed up to your Firebase Firestore project.',
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Firebase Notice',
          message: pushRes.message,
        });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sync Error', message: err.message });
    } finally {
      setIsSyncingFb(false);
    }
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    showToast({
      type: 'success',
      title: 'Firestore Rules Copied',
      message: 'Paste into Firebase Console $\\rightarrow$ Firestore Database $\\rightarrow$ Rules tab.',
    });
    setTimeout(() => setCopiedRules(false), 3000);
  };

  // Supabase Handlers
  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    try {
      const res = await cloudDb.testConnection(sbConfig.supabaseUrl, sbConfig.supabaseAnonKey);
      if (res.success) {
        showToast({ type: 'success', title: 'Supabase Connected', message: res.message });
      } else {
        showToast({ type: 'error', title: 'Connection Failed', message: res.message });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Connection Error', message: err.message });
    } finally {
      setIsTestingSb(false);
    }
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSb(true);
    try {
      cloudDb.saveConfig(sbConfig);
      showToast({
        type: 'success',
        title: 'Supabase Settings Saved',
        message: 'PostgreSQL sync preferences updated.',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSavingSb(false);
    }
  };

  const handleSyncSupabaseNow = async () => {
    setIsSyncingSb(true);
    try {
      await cloudDb.pullFromCloud();
      const pushRes = await cloudDb.pushToCloud();
      if (pushRes.success) {
        showToast({ type: 'success', title: 'Supabase Sync Completed', message: pushRes.message });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'Sync Error', message: err.message });
    } finally {
      setIsSyncingSb(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    showToast({
      type: 'success',
      title: 'SQL Script Copied',
      message: 'Paste into Supabase SQL Editor and click RUN.',
    });
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: PRIMARY LIVE MULTI-DEVICE CLOUD SYNC */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white text-base">PokeCraft 3D Live Multi-Device Cloud Sync</h3>
            </div>
            <p className="text-xs text-slate-400">
              Active on all devices. Orders, filament stock, and print jobs synchronize in real-time between your workshop PC, laptop, and phone.
            </p>
          </div>

          {/* Status Badge & Sync Now Button */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                liveState.status === 'connected'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : liveState.status === 'syncing'
                  ? 'bg-sky-950/60 border-sky-800 text-sky-400 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveState.status === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : liveState.status === 'syncing'
                    ? 'bg-sky-400'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {liveState.status === 'connected'
                  ? 'Live Synced Across Devices'
                  : liveState.status === 'syncing'
                  ? 'Syncing Updates...'
                  : 'Connecting...'}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              isLoading={isSyncingLive}
              onClick={handleForceLiveSync}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Sync All Devices Now
            </Button>
          </div>
        </div>

        {/* Live Network Topology */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Workshop Computer</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Flashforge AD5X bay & packing
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">PokeCraft Central Cloud</div>
              <div className="text-[11px] text-slate-400">
                {liveState.lastSyncTime
                  ? `Synced at ${new Date(liveState.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Real-time SSE event stream'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Mobile / Laptop</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live on-the-go order check
              </div>
            </div>
          </div>
        </div>

        {/* Feature Checkpoints */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bi-directional real-time sync</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-push on order/spool edit</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline-first local cache</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPTIONAL EXTERNAL DATABASE BACKUP & REPLICATION */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-white">Optional External Cloud Backup</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Optionally replicate all PokeCraft data to your own external Google Firebase or Supabase project.
            </p>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveEngine('firebase')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeEngine === 'firebase'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Google Firebase
            </button>

            <button
              type="button"
              onClick={() => setActiveEngine('supabase')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeEngine === 'supabase'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Supabase Postgres
            </button>
          </div>
        </div>

        {/* FIREBASE SUB-VIEW */}
        {activeEngine === 'firebase' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold text-white block">External Firebase Firestore Mirror</span>
                <span className="text-slate-400">
                  Connect your Firebase web app credentials to mirror collections into your personal Google Cloud Firestore database.
                </span>
              </div>
              <Button
                type="button"
                variant={copiedRules ? 'primary' : 'outline'}
                size="sm"
                onClick={handleCopyRules}
                leftIcon={copiedRules ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedRules ? 'Rules Copied!' : 'Copy Firestore Rules'}
              </Button>
            </div>

            <form onSubmit={handleSaveFirebase} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Firebase Project ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pokecraft-3d-prints"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Firebase Web API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSyBxxxx..."
                    value={fbConfig.apiKey}
                    onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fbConfig.enabled}
                    onChange={(e) => setFbConfig({ ...fbConfig, enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Enable External Firebase Mirror</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={isTestingFb}
                    onClick={handleTestFirebase}
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Test Firebase
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingFb}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Save Credentials
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* SUPABASE SUB-VIEW */}
        {activeEngine === 'supabase' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold text-white block">External Supabase PostgreSQL Mirror</span>
                <span className="text-slate-400">
                  Mirror all collections into a PostgreSQL table with automated PostgREST endpoints.
                </span>
              </div>
              <Button
                type="button"
                variant={copiedSql ? 'primary' : 'outline'}
                size="sm"
                onClick={handleCopySql}
                leftIcon={copiedSql ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedSql ? 'SQL Copied!' : 'Copy SQL Script'}
              </Button>
            </div>

            <form onSubmit={handleSaveSupabase} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-project.supabase.co"
                    value={sbConfig.supabaseUrl}
                    onChange={(e) => setSbConfig({ ...sbConfig, supabaseUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={sbConfig.supabaseAnonKey}
                    onChange={(e) => setSbConfig({ ...sbConfig, supabaseAnonKey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sbConfig.enabled}
                    onChange={(e) => setSbConfig({ ...sbConfig, enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Enable External Supabase Mirror</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={isTestingSb}
                    onClick={handleTestSupabase}
                    leftIcon={<Zap className="w-3.5 h-3.5" />}
                  >
                    Test Supabase
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingSb}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Save Credentials
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
