'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublicRoute = publicRoutes.includes(pathname);
  const [isServiceDown, setIsServiceDown] = useState(false);

  const { isLoading, isError, isSuccess, error } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        withCredentials: true,
      });
      return res.data.data;
    },
    retry: 0,
    // Only run query if it's not a public route
    enabled: !isPublicRoute,
    staleTime: 30 * 1000,
  });

  // Ensure a robust fallback redirect if the global interceptor is slow or fails
  useEffect(() => {
    if (isError && !isPublicRoute) {
      const axiosError = error as any;
      const status = axiosError?.response?.status;
      
      // If it's a server crash (500+) or network down (undefined response)
      if (!status || status >= 500) {
        setIsServiceDown(true);
      } else if (status === 401 || status === 403) {
        // Only wipe tokens and redirect for true authentication failures
        document.cookie = 'tpr_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.replace('/login');
      } else {
        // Fallback for other errors (404, etc)
        document.cookie = 'tpr_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.replace('/login');
      }
    }
  }, [isError, isPublicRoute, error]);

  // To prevent hydration mismatches, only render the actual state once mounted
  if (!mounted) {
    return null; 
  }

  // If on a public route (like /login), just render immediately without auth checks
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If checking authentication, block the UI with a premium full-screen loader
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1f3c] text-white overflow-hidden font-sans">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://res.cloudinary.com/dzbliymin/image/upload/v1785260141/nith27_zlbbxm.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f3c] via-transparent to-transparent opacity-80" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-slate-700/50 border-t-blue-400 animate-spin shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
            {/* Inner icon */}
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex flex-col items-center text-center">
            <h2 className="text-xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-sm">NITH TPR Portal</h2>
            <div className="flex items-center gap-2 mt-2 text-blue-200/80 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Verifying active session...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authentication failed (e.g., token expired), show a clean transition state,
  // the useEffect above will redirect them immediately.
  if (isError) {
    if (isServiceDown) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0d1f3c] text-white p-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Service Temporarily Unavailable</h1>
          <p className="text-blue-200/80 text-center max-w-md mb-8">
            Our systems are currently experiencing difficulties or undergoing maintenance. Please return a little later while we restore normal operations.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1a3a6e] border-t-transparent animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Only render the dashboard/protected content if authentication strictly succeeds
  if (isSuccess) {
    return <>{children}</>;
  }

  return null;
}
