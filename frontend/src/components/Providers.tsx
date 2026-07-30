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
    let isRedirecting = false;

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
          
          if (!isAuthPage && !isRedirecting) {
            isRedirecting = true;
            try {
              await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {}, { withCredentials: true });
            } catch (err) {
              console.error('Logout failed during 401 redirect:', err);
            }
            document.cookie = 'tpr_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
