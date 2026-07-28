'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';

axios.defaults.withCredentials = true;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Show cached data instantly — refetch silently in background after 30s
        staleTime: 30 * 1000,
        // Keep unused data in memory for 5 minutes (instant back-navigation)
        gcTime: 5 * 60 * 1000,
        // Don't hammer the server on transient errors
        retry: 1,
        // Don't refetch just because the user switched browser tabs
        refetchOnWindowFocus: false,
      },
    },
  }));

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // If we are not already on an auth page, redirect to login
          const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
          if (!isAuthPage) {
            router.push('/login');
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [router, pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
