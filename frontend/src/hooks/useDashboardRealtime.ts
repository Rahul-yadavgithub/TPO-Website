'use client';

import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketProvider';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { toast } from 'sonner';

export const useDashboardRealtime = (branchId?: string) => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleDashboardUpdate = (payload: any) => {
      // Invalidate global dashboard metrics
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      
      // If we have a payload that says brochure sent or contact logged, update lists
      if (payload && payload.type) {
        if (payload.type === SOCKET_EVENTS.BROCHURE_SENT) {
           queryClient.invalidateQueries({ queryKey: ['brochure-jnf-requests'] });
           queryClient.invalidateQueries({ queryKey: ['brochure-sent-companies'] });
        }
        
        // Also update TPR branch specific lists
        if (branchId) {
          queryClient.invalidateQueries({ queryKey: ['contact-today', branchId] });
          queryClient.invalidateQueries({ queryKey: ['confirmed', branchId] });
          queryClient.invalidateQueries({ queryKey: ['not-confirmed', branchId] });
        }
      }
    };

    const handleBulkUpdate = (payload: any) => {
       toast.info(`Mass Update: ${payload.action || 'Data changed'}. Refreshing view...`);
       queryClient.invalidateQueries(); // Mass invalidation for safety on bulk actions
    };

    socket.on(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, handleDashboardUpdate);
    socket.on(SOCKET_EVENTS.COMPANY_UPDATED, handleDashboardUpdate);
    socket.on(SOCKET_EVENTS.COMPANY_CREATED, handleDashboardUpdate);
    socket.on(SOCKET_EVENTS.BROCHURE_SENT, handleDashboardUpdate);
    socket.on(SOCKET_EVENTS.BULK_COMPANIES_UPDATED, handleBulkUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.DASHBOARD_SUMMARY_UPDATED, handleDashboardUpdate);
      socket.off(SOCKET_EVENTS.COMPANY_UPDATED, handleDashboardUpdate);
      socket.off(SOCKET_EVENTS.COMPANY_CREATED, handleDashboardUpdate);
      socket.off(SOCKET_EVENTS.BROCHURE_SENT, handleDashboardUpdate);
      socket.off(SOCKET_EVENTS.BULK_COMPANIES_UPDATED, handleBulkUpdate);
    };
  }, [socket, isConnected, queryClient, branchId]);

  return { isConnected };
};
