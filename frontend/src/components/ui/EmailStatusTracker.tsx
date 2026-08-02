import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Mail, Loader2, Send, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';

interface EmailStatusTrackerProps {
  companyId: string;
  companyName: string;
  hrEmail: string;
  currentStatus?: 'pending' | 'sent' | 'failed';
  failureReason?: string;
  endpointPrefix?: string; // 'companies' or 'previous-companies'
  showBadge?: boolean;
}

export function EmailStatusTracker({ 
  companyId, 
  companyName, 
  hrEmail, 
  currentStatus = 'pending', 
  failureReason,
  endpointPrefix = 'previous-companies',
  showBadge = true
}: EmailStatusTrackerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Domain not found');
  const [customReason, setCustomReason] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const parentCard = containerRef.current.closest('.bg-white.border.rounded-xl') as HTMLElement;
      if (parentCard) {
        if (isOpen) {
          parentCard.style.zIndex = '50';
          parentCard.style.position = 'relative';
        } else {
          parentCard.style.zIndex = '';
          // Only remove position if we added it, but it's safer to just clear it
          if (parentCard.style.position === 'relative' && !parentCard.classList.contains('relative')) {
             parentCard.style.position = '';
          }
        }
      }
    }
  }, [isOpen]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason, customReason }: { status: string, reason?: string, customReason?: string }) => {
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/${endpointPrefix}/${companyId}/email-status`,
        { status, reason, customReason },
        { withCredentials: true }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success('Email status updated successfully!');
      setIsOpen(false);
      // Invalidate relevant queries to refresh badges globally
      queryClient.invalidateQueries({ queryKey: ['previous-my-requested'] });
      queryClient.invalidateQueries({ queryKey: ['previous-others-requested'] });
      queryClient.invalidateQueries({ queryKey: ['previous-available'] });
      queryClient.invalidateQueries({ queryKey: ['past-companies'] });
      queryClient.invalidateQueries({ queryKey: ['target-companies'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['brochure-jnf-requests'] });
      queryClient.invalidateQueries({ queryKey: ['brochure-sent-companies'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update email status');
    }
  });

  const handleSendMail = () => {
    window.open(`mailto:${hrEmail}`, '_blank');
  };

  return (
    <div ref={containerRef} className={`flex items-center gap-2 ${isOpen ? 'relative z-50' : ''}`}>
      {/* Visual Badge */}
      {showBadge && currentStatus === 'sent' && (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 bg-emerald-100 text-emerald-700 rounded-md">
          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Brochure Sent
        </span>
      )}
      {showBadge && currentStatus === 'failed' && (
        <span 
          className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 text-red-700 rounded-md cursor-help"
          title={failureReason || 'Failed to send'}
        >
          <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Failed
        </span>
      )}

      {/* Action Buttons */}
      <div className="relative flex items-center bg-slate-100 rounded-lg p-0.5 sm:p-1 border border-slate-200">
        <button
          onClick={handleSendMail}
          disabled={!hrEmail || hrEmail === 'N/A'}
          className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm rounded-md transition-all flex items-center gap-1 sm:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!hrEmail || hrEmail === 'N/A' ? "No email available" : "Compose Email"}
        >
          <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Compose
        </button>
        
        <div className="w-px h-3 sm:h-4 bg-slate-300 mx-0.5 sm:mx-1"></div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm rounded-md transition-all flex items-center gap-1 sm:gap-1.5"
        >
          Log Status <ChevronDown className="w-3 h-3" />
        </button>

        {/* Dropdown Modal */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2">
            <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Update Email Status</h6>
            
            <button
              onClick={() => updateStatusMutation.mutate({ status: 'sent' })}
              disabled={updateStatusMutation.isPending}
              className="w-full mb-3 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 font-semibold text-sm rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              {updateStatusMutation.isPending && updateStatusMutation.variables?.status === 'sent' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Mark as Sent
            </button>

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Mark as Failed
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2 mb-2 focus:ring-2 focus:ring-red-500 outline-none bg-slate-50"
              >
                <option value="Domain not found">Domain not found</option>
                <option value="Email incorrect">Email incorrect</option>
                <option value="Bounced">Bounced (General)</option>
                <option value="Custom">Custom...</option>
              </select>

              {selectedReason === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter custom reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 mb-2 focus:ring-2 focus:ring-red-500 outline-none"
                />
              )}

              <button
                onClick={() => updateStatusMutation.mutate({ status: 'failed', reason: selectedReason, customReason })}
                disabled={updateStatusMutation.isPending || (selectedReason === 'Custom' && !customReason)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {updateStatusMutation.isPending && updateStatusMutation.variables?.status === 'failed' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Failure'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
