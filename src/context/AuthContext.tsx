import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

export const ADMIN_PASSWORD = 'Iv8xkxi44!!';
const AUTH_STORAGE_KEY = 'pokecraft_auth_session_v1';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.authenticated) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null; // Locked by default
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const loginWithPassword = async (password: string, email?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsLoading(false);

    if (password.trim() !== ADMIN_PASSWORD) {
      return {
        success: false,
        error: 'Incorrect admin password. Access to PokeCraft 3D Studio denied.',
      };
    }

    const authenticatedUser: UserProfile = {
      id: 'usr-admin-pokecraft',
      email: email?.trim() || 'MattofTaylor@gmail.com',
      name: 'Matt Taylor',
      role: 'owner',
      createdAt: new Date().toISOString(),
    };

    // Attach authenticated session tag
    (authenticatedUser as any).authenticated = true;

    setUser(authenticatedUser);
    return { success: true };
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    return loginWithPassword(password, email);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithPassword,
        login,
        logout,
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
