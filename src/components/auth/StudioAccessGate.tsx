import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Lock, Eye, EyeOff, ShieldCheck, Flame, AlertCircle } from 'lucide-react';

export const StudioAccessGate: React.FC = () => {
  const { loginWithPassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Please enter the studio admin password.');
      return;
    }

    const res = await loginWithPassword(password);
    if (!res.success) {
      setError(res.error || 'Access denied.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-7 sm:p-9 space-y-6">
        {/* Header branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-sky-600 items-center justify-center shadow-lg shadow-sky-600/20 mb-2">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">PokeCraft 3D Prints</h1>
          <p className="text-xs text-slate-400">
            Protected Production & Order Management System
          </p>
        </div>

        {/* Security badge */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Workshop operations are restricted. Enter the master admin password to unlock.</span>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center text-sm py-2.5"
            isLoading={isLoading}
          >
            Unlock Studio
          </Button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-500">
            PokeCraft 3D Prints • Flashforge AD5X Fleet Control
          </p>
        </div>
      </div>
    </div>
  );
};
