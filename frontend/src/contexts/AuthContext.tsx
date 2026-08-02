'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';

export type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: any;
  status: AuthStatus;
  logout: () => void;
  verifySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  
  const verifyAbortController = useRef<AbortController | null>(null);

  const logout = useCallback(async () => {
    // 1. Cancel pending verifications
    if (verifyAbortController.current) {
      verifyAbortController.current.abort();
    }
    
    // 2. Clear query cache completely
    queryClient.clear();
    
    // 3. Clear local state
    setStatus('unauthenticated');
    setUser(null);
    
    // 4. Wipe tokens from JS accessible cookies (fallback)
    document.cookie = 'tpr_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // 5. Tell backend to clear HttpOnly cookie
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      // Ignore errors on logout
    }

    // 6. Avoid redirect loops
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublic = publicRoutes.some(r => window.location.pathname === r || window.location.pathname.startsWith(`${r}/`));
    if (!isPublic) {
      router.replace('/login');
    }
  }, [queryClient, router]);

  const verifySession = useCallback(async () => {
    setStatus('checking');
    
    if (verifyAbortController.current) {
      verifyAbortController.current.abort();
    }
    verifyAbortController.current = new AbortController();
    
    try {
      // 5 second timeout
      const timeoutId = setTimeout(() => {
        if (verifyAbortController.current) {
          verifyAbortController.current.abort('Timeout');
        }
      }, 5000);

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        withCredentials: true,
        signal: verifyAbortController.current.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.data?.success) {
        setUser(res.data.data);
        setStatus('authenticated');
      } else {
        // Technically this should be caught in catch block if it's 401
        logout();
      }
    } catch (error: any) {
      if (axios.isCancel(error)) {
        if (error.message === 'Timeout') {
          // Timeout should redirect to login per user instructions
          logout();
        }
        return;
      }
      
      const statusCode = error.response?.status;
      
      if (statusCode === 401 || statusCode === 403) {
        // Auth failure -> unauthenticated
        logout();
      } else if (!statusCode || statusCode >= 500) {
        // Server down or offline -> error state
        setStatus('error');
      } else {
        // Catch-all for other errors
        logout();
      }
    }
  }, [logout]);

  // Setup Axios Interceptor for global 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Global catch for 401s during normal app usage
          logout();
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // Verify exactly once on mount
  useEffect(() => {
    verifySession();
    
    return () => {
      if (verifyAbortController.current) {
        verifyAbortController.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, logout, verifySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
