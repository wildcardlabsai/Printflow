import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  quickDemoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'printflow_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
      // Default initial logged in owner for seamless first run
      return {
        id: 'usr-admin-1',
        email: 'MattofTaylor@gmail.com',
        name: 'Matt Taylor',
        role: 'owner',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsLoading(false);

    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      email,
      name: email.split('@')[0],
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    return { success: true };
  };

  const signUp = async (email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsLoading(false);

    if (!email || !name || !password) {
      return { success: false, error: 'All fields are required' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      email,
      name,
      role: 'owner',
      createdAt: new Date().toISOString(),
    };
    setUser(newUser);
    return { success: true };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsLoading(false);

    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email address' };
    }

    return {
      success: true,
      message: `Password reset instructions have been dispatched to ${email}.`,
    };
  };

  const logout = () => {
    setUser(null);
  };

  const quickDemoLogin = () => {
    setUser({
      id: 'usr-admin-1',
      email: 'MattofTaylor@gmail.com',
      name: 'Matt Taylor',
      role: 'owner',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signUp,
        resetPassword,
        logout,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
