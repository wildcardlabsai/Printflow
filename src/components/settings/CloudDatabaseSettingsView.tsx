import React, { useState, useEffect } from 'react';
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
  Radio,
} from 'lucide-react';

export const CloudDatabaseSettingsView: React.FC = () => {
  const { showToast } = useNotification();

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
    const handleFbStatus = (e: any) => {
      if (e.detail) setFbState(e.detail);
    };
    const handleSbStatus = (e: any) => {
      if (e.detail) setSbState(e.detail);
    };

    window.addEventListener('pokecraft_firebase_sync_status', handleFbStatus);
    window.addEventListener('printflow_cloud_sync_status', handleSbStatus);
    return () => {
      window.removeEventListener('pokecraft_firebase_sync_status', handleFbStatus);
      window.removeEventListener('printflow_cloud_sync_status', handleSbStatus);
    };
  }, []);

  // Firebase Handlers
  const handleTestFirebase = async () => {
    setIsTestingFb(true);
    try {
      const res = await firebaseDb.testConnection();
      if (res.success) {
        showToast({
          type: 'success',
          title: 'Firebase Firestore Connected!',
          message: 'PokeCraft 3D Prints multi-device sync is working.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Firebase Test Notice',
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
        title: 'Firebase Settings Saved',
        message: 'Credentials stored. Realtime multi-device listeners initialized.',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSavingFb(false);
    }
  };

  const handleSyncFirebaseNow = async () => {
    if (!firebaseDb.isConfigured()) {
      showToast({
        type: 'warning',
        title: 'Firebase Not Configured',
        message: 'Please enter your Firebase Project ID and Web API Key first.',
      });
      return;
    }

    setIsSyncingFb(true);
    try {
      const pushRes = await firebaseDb.pushAllToFirebase();
      if (pushRes.success) {
        showToast({
          type: 'success',
          title: 'Firebase Sync Complete',
          message: 'All orders, spools, and jobs pushed to Firestore.',
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Sync Notice',
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
        message: 'PostgreSQL PostgREST sync preferences updated.',
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

  const isCurrentConnected =
    activeEngine === 'firebase'
      ? fbState.status === 'connected' || fbState.status === 'syncing'
      : sbState.status === 'connected' || sbState.status === 'syncing';

  return (
    <div className="space-y-6">
      {/* Multi-Device Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-white text-base">PokeCraft 3D Multi-Device Cloud Sync</h3>
            </div>
            <p className="text-xs text-slate-400">
              Live bi-directional synchronization across your workshop computers, laptops, and mobile devices.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                isCurrentConnected
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isCurrentConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>
                {isCurrentConnected
                  ? `${activeEngine === 'firebase' ? 'Firebase' : 'Supabase'} Synced Live`
                  : 'Local Storage Mode'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              isLoading={activeEngine === 'firebase' ? isSyncingFb : isSyncingSb}
              onClick={activeEngine === 'firebase' ? handleSyncFirebaseNow : handleSyncSupabaseNow}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Sync Now
            </Button>
          </div>
        </div>

        {/* Visual Topology */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Workshop PC</div>
              <div className="text-[11px] text-slate-400">Flashforge queue & packing</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-amber-950/60 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">
                {activeEngine === 'firebase' ? 'Firebase Firestore' : 'Supabase Cloud DB'}
              </div>
              <div className="text-[11px] text-slate-400">
                {fbState.lastSyncedAt
                  ? `Synced ${new Date(fbState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Realtime Cloud Database'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Mobile / Laptop</div>
              <div className="text-[11px] text-slate-400">Remote status checks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Engine Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveEngine('firebase')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeEngine === 'firebase'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4" />
          Google Firebase Firestore (Recommended)
        </button>

        <button
          type="button"
          onClick={() => setActiveEngine('supabase')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            activeEngine === 'supabase'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Supabase (PostgreSQL)
        </button>
      </div>

      {/* FIREBASE ENGINE TAB */}
      {activeEngine === 'firebase' && (
        <div className="space-y-6">
          {/* 3 Step Firebase Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-white">How to Connect Your Firebase Project</h3>
              </div>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                Open Firebase Console <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-400 text-sm">Step 1</span>
                <div className="font-semibold text-white">Create Firebase Web App</div>
                <p className="text-slate-400 leading-relaxed">
                  Go to <strong className="text-slate-200">console.firebase.google.com</strong>, select your project (e.g. PokeCraft 3D Prints), click the <strong>&lt;/&gt; Web</strong> icon, and copy the config values.
                </p>
              </div>

              <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-400 text-sm">Step 2</span>
                <div className="font-semibold text-white">Enable Cloud Firestore</div>
                <p className="text-slate-400 leading-relaxed">
                  In Firebase left sidebar, click <strong className="text-slate-200">Build $\rightarrow$ Firestore Database</strong>, click <strong>Create Database</strong>, and set location to <em>europe-west2</em> or default.
                </p>
              </div>

              <div className="p-3.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="font-bold text-amber-400 text-sm">Step 3</span>
                <div className="font-semibold text-white">Paste Security Rules</div>
                <p className="text-slate-400 leading-relaxed">
                  In Firestore, open the <strong className="text-slate-200">Rules</strong> tab, paste the rules snippet below, and click <strong className="text-slate-200">Publish</strong>.
                </p>
              </div>
            </div>

            {/* Copy Firestore Rules */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium truncate">
                  Firestore Rules: Enables sync for <code className="font-mono text-amber-400">pokecraft_store</code> collection
                </span>
              </div>
              <Button
                type="button"
                variant={copiedRules ? 'primary' : 'outline'}
                size="sm"
                onClick={handleCopyRules}
                leftIcon={copiedRules ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedRules ? 'Copied to Clipboard!' : 'Copy Firestore Rules'}
              </Button>
            </div>
          </div>

          {/* Firebase Credentials Form */}
          <form onSubmit={handleSaveFirebase} className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">Firebase Web App Credentials</h3>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <span>Enable Firebase Live Sync:</span>
                <input
                  type="checkbox"
                  checked={fbConfig.enabled}
                  onChange={(e) => setFbConfig({ ...fbConfig, enabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Firebase Project ID <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. pokecraft-3d-prints"
                  value={fbConfig.projectId}
                  onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Firebase Web API Key <span className="text-amber-400">*</span>
                </label>
                <input
                  type="password"
                  placeholder="AIzaSyBxxxx..."
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auth Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="pokecraft-3d-prints.firebaseapp.com"
                  value={fbConfig.authDomain}
                  onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Storage Bucket (Optional)
                </label>
                <input
                  type="text"
                  placeholder="pokecraft-3d-prints.appspot.com"
                  value={fbConfig.storageBucket}
                  onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  App ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef"
                  value={fbConfig.appId}
                  onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                You can also configure these in Vercel as <code className="text-slate-400">VITE_FIREBASE_PROJECT_ID</code> and <code className="text-slate-400">VITE_FIREBASE_API_KEY</code>.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={isTestingFb}
                  onClick={handleTestFirebase}
                  leftIcon={<Zap className="w-3.5 h-3.5" />}
                >
                  Test Firestore
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingFb}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Save Firebase Credentials
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SUPABASE ENGINE TAB */}
      {activeEngine === 'supabase' && (
        <div className="space-y-6">
          {/* Supabase Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm text-white">Supabase / PostgreSQL Quick Setup</h3>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                Open Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300 font-medium">
                SQL Schema: Creates <code className="font-mono text-sky-400">public.printflow_store</code> table
              </span>
              <Button
                type="button"
                variant={copiedSql ? 'primary' : 'outline'}
                size="sm"
                onClick={handleCopySql}
                leftIcon={copiedSql ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Script'}
              </Button>
            </div>
          </div>

          {/* Supabase Form */}
          <form onSubmit={handleSaveSupabase} className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-400" />
                <h3 className="font-semibold text-sm text-white">Supabase Credentials</h3>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <span>Enable Supabase Sync:</span>
                <input
                  type="checkbox"
                  checked={sbConfig.enabled}
                  onChange={(e) => setSbConfig({ ...sbConfig, enabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  value={sbConfig.supabaseUrl}
                  onChange={(e) => setSbConfig({ ...sbConfig, supabaseUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Anon Public Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={sbConfig.supabaseAnonKey}
                  onChange={(e) => setSbConfig({ ...sbConfig, supabaseAnonKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isTestingSb}
                onClick={handleTestSupabase}
                leftIcon={<Zap className="w-3.5 h-3.5" />}
              >
                Test Connection
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingSb}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Save Supabase Credentials
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
