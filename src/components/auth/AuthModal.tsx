import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../ui/Button';
import { Layers3, KeyRound, Mail, User, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signUp, resetPassword, quickDemoLogin, isLoading } = useAuth();
  const { showToast } = useNotification();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('MattofTaylor@gmail.com');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Matt Taylor');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      const res = await login(email, password);
      if (res.success) {
        showToast({ type: 'success', title: 'Welcome Back', message: `Signed in as ${email}` });
        if (onClose) onClose();
      } else {
        showToast({ type: 'error', title: 'Sign In Failed', message: res.error });
      }
    } else if (mode === 'signup') {
      const res = await signUp(email, name, password);
      if (res.success) {
        showToast({ type: 'success', title: 'Account Created', message: `Welcome to PrintFlow, ${name}` });
        if (onClose) onClose();
      } else {
        showToast({ type: 'error', title: 'Sign Up Failed', message: res.error });
      }
    } else if (mode === 'forgot') {
      const res = await resetPassword(email);
      showToast({ type: res.success ? 'success' : 'error', title: 'Password Reset', message: res.message });
      if (res.success) setMode('login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-7">
        {/* Logo and title */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-sky-600 text-white items-center justify-center shadow-lg shadow-sky-600/20 mb-3">
            <Layers3 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">PrintFlow Operations</h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Sign in to access 3D printing orders and production'}
            {mode === 'signup' && 'Register a new studio operator account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="mb-5 p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-sky-200 block">Owner Demo Session</span>
            <span className="text-[11px] text-sky-300/80">Immediate access as Matt Taylor</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              quickDemoLogin();
              showToast({ type: 'success', title: 'Owner Session Loaded', message: 'Signed in as Matt Taylor' });
              if (onClose) onClose();
            }}
          >
            Quick Sign In
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isLoading}
          >
            {mode === 'login' && 'Sign In to System'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Send Reset Link'}
          </Button>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-center text-xs text-slate-400 gap-1.5">
            {mode === 'login' && (
              <>
                <span>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sky-400 hover:underline font-medium"
                >
                  Sign Up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                <span>Already registered?</span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-sky-400 hover:underline font-medium"
                >
                  Sign In
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-sky-400 hover:underline font-medium"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
