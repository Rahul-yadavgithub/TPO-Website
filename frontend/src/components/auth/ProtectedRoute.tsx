'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, AlertCircle, WifiOff, ServerCrash, Clock } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, errorType, verifySession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = publicRoutes.some(r => pathname === r || pathname.startsWith(`${r}/`));

  useEffect(() => {
    if (status === 'unauthenticated' && !isPublicRoute) {
      router.replace('/login');
    }
  }, [status, pathname, router, isPublicRoute]);

  // Public routes render immediately regardless of auth status
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (status === 'uninitialized' || status === 'checking' || status === 'login_pending') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1f3c] text-white overflow-hidden font-sans">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://res.cloudinary.com/dzbliymin/image/upload/v1785260141/nith27_zlbbxm.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3c] via-transparent to-transparent opacity-80" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/50 border-t-blue-400 animate-spin shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-sm">NITH TPR Portal</h2>
            <div className="flex items-center gap-2 mt-2 text-blue-200/80 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {status === 'login_pending' ? 'Authenticating...' : 'Checking Session...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    let ErrorIcon = AlertCircle;
    let errorTitle = 'Service Temporarily Unavailable';
    let errorMessage = 'Our systems are currently experiencing difficulties. Please check your connection and try again.';

    if (errorType === 'offline') {
      ErrorIcon = WifiOff;
      errorTitle = 'You are Offline';
      errorMessage = 'It seems you have lost your internet connection. We will automatically reconnect when your connection returns.';
    } else if (errorType === 'server_error') {
      ErrorIcon = ServerCrash;
      errorTitle = 'Server Unreachable';
      errorMessage = 'The authentication server is currently down for maintenance or experiencing high load. Please try again in a few moments.';
    } else if (errorType === 'timeout') {
      ErrorIcon = Clock;
      errorTitle = 'Connection Timeout';
      errorMessage = 'The request took too long to complete. Please ensure you have a stable network connection and try again.';
    }

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1f3c] text-white p-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <ErrorIcon className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">{errorTitle}</h1>
        <p className="text-blue-200/80 text-center max-w-md mb-8">
          {errorMessage}
        </p>
        <button 
          onClick={() => verifySession()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors shadow-lg"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (status === 'unauthenticated' || status === 'logout_pending') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1a3a6e] border-t-transparent animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // status === 'authenticated'
  return <>{children}</>;
}
