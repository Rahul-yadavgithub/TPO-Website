'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';

export type AuthStatus = 'uninitialized' | 'checking' | 'authenticated' | 'unauthenticated' | 'login_pending' | 'logout_pending' | 'error';
export type AuthErrorType = 'offline' | 'timeout' | 'server_error' | 'unknown' | null;

interface AuthContextType {
  user: any;
  status: AuthStatus;
  errorType: AuthErrorType;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
  login: (credentials: any, portalChoice: string, isCommTpr: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_RETRIES = 3;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('uninitialized');
  const [errorType, setErrorType] = useState<AuthErrorType>(null);
  const [user, setUser] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  
  const currentVerificationId = useRef<number>(0);
  const verifyAbortController = useRef<AbortController | null>(null);

  // Helper to get fresh status since it might be stale in callbacks
  const statusRef = useRef<AuthStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'AUTH_SYNC') {
        const action = event.data.action;
        if (action === 'logout' || action === 'session_expired') {
          setStatus('unauthenticated');
          setUser(null);
          queryClient.clear();
        } else if (action === 'login') {
          // If another tab logged in, we should verify the new session
          if (statusRef.current !== 'login_pending') {
            doVerify(0);
          }
        }
      }
    };

    const channel = new BroadcastChannel('auth_sync');
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [queryClient]);

  const broadcastAuthEvent = (action: 'login' | 'logout' | 'session_expired') => {
    try {
      const channel = new BroadcastChannel('auth_sync');
      channel.postMessage({ type: 'AUTH_SYNC', action });
      channel.close();
    } catch (e) {
      // Ignore
    }
  };

  const logout = useCallback(async () => {
    // If we are actively logging in, ignore logout requests
    if (statusRef.current === 'login_pending') return;

    setStatus('logout_pending');
    
    if (verifyAbortController.current) {
      verifyAbortController.current.abort('logout');
    }
    // Increment verification ID so older resolves are ignored
    currentVerificationId.current = Date.now();
    
    queryClient.clear();
    setUser(null);
    
    document.cookie = 'tpr_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      // Ignore errors on logout
    }

    setStatus('unauthenticated');
    broadcastAuthEvent('logout');

    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
    const isPublic = publicRoutes.some(r => window.location.pathname === r || window.location.pathname.startsWith(`${r}/`));
    if (!isPublic) {
      router.replace('/login');
    }
  }, [queryClient, router]);

  const doVerify = useCallback(async (retryCount = 0): Promise<void> => {
    const verificationId = Date.now();
    currentVerificationId.current = verificationId;

    if (verifyAbortController.current) {
      verifyAbortController.current.abort('New verification started');
    }
    const abortController = new AbortController();
    verifyAbortController.current = abortController;

    setStatus('checking');
    setErrorType(null);

    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        withCredentials: true,
        signal: abortController.signal,
        timeout: 5000
      });

      // Ignore if a newer verification started
      if (currentVerificationId.current !== verificationId) return;

      if (res.data?.success) {
        setUser(res.data.data);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
        setUser(null);
      }
    } catch (error: any) {
      // Ignore if a newer verification started
      if (currentVerificationId.current !== verificationId) return;

      if (axios.isCancel(error)) {
        return; // manual abort
      }
      
      const statusCode = error.response?.status;
      
      if (statusCode === 401 || statusCode === 403) {
        setStatus('unauthenticated');
        setUser(null);
      } else {
        // Network error, 5xx, or timeout
        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(res => setTimeout(res, delay));
          if (currentVerificationId.current === verificationId) {
            return doVerify(retryCount + 1);
          }
        } else {
          // Max retries reached
          setStatus('error');
          if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
            setErrorType('timeout');
          } else if (!error.response) {
            setErrorType('offline');
          } else if (statusCode >= 500) {
            setErrorType('server_error');
          } else {
            setErrorType('unknown');
          }
        }
      }
    }
  }, []);

  const verifySession = useCallback(async () => {
    await doVerify(0);
  }, [doVerify]);

  const login = useCallback(async (credentials: any, portalChoice: string, isCommTpr: boolean) => {
    setStatus('login_pending');
    
    // Abort any pending verifications so they don't overwrite our state later
    if (verifyAbortController.current) {
      verifyAbortController.current.abort('login_started');
    }
    // Increment verification ID so older resolves are ignored
    currentVerificationId.current = Date.now();

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, 
        { ...credentials, portal: 'base' }, 
        { withCredentials: true }
      );
      
      const { commToken } = res.data?.data || {};
      
      if (commToken) {
        document.cookie = `tpr_token=${commToken}; path=/; max-age=2592000; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
      }

      if (isCommTpr && portalChoice === 'communication') {
        if (commToken) localStorage.setItem('comm_tpr_token', commToken);
        broadcastAuthEvent('login');
        window.location.href = '/communication-tpr/dashboard';
        return;
      }
      
      // Perform ONE fresh verification to confirm the cookie was successfully stored
      await doVerify(0);
      
      // The status will be updated by doVerify (to 'authenticated' or 'unauthenticated')
      // If it is authenticated, broadcast login.
      // For immediate synchronization, broadcast regardless, other tabs will run verifySession.
      broadcastAuthEvent('login');
      
    } catch (err: any) {
      setStatus('unauthenticated');
      throw err; // So the caller (login page) can display the error message
    }
  }, [doVerify]);

  // Listen to session expired events
  useEffect(() => {
    const handleSessionExpired = () => {
      // Only unauthenticate if we are not actively trying to log in
      if (statusRef.current === 'login_pending') return;

      setStatus('unauthenticated');
      setUser(null);
      broadcastAuthEvent('session_expired');
      
      const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublic = publicRoutes.some(r => window.location.pathname === r || window.location.pathname.startsWith(`${r}/`));
      if (!isPublic) {
        router.replace('/login');
      }
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [router]);

  // Setup Axios Interceptor for global 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Normalizes 401s into an event, ignoring the actual login endpoint
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Verify exactly once on mount and handle offline recovery
  useEffect(() => {
    verifySession();
    
    const handleOnline = () => {
      // If we are in an error state due to offline, re-verify when we come back online
      if (statusRef.current === 'error') {
        verifySession();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      if (verifyAbortController.current) {
        verifyAbortController.current.abort('unmount');
      }
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, errorType, logout, verifySession, login }}>
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
