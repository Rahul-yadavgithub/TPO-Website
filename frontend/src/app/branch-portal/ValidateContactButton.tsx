'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ValidateContactButtonProps {
  companyId: string;
  branchId: string;
  currentHr?: any;
  additionalContacts?: any[];
  pendingContact?: any;
}

export default function ValidateContactButton({ companyId, branchId, currentHr, additionalContacts = [], pendingContact }: ValidateContactButtonProps) {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Check if branch has active API keys
  const { data: activeKeysCount = 0, isLoading: keysLoading } = useQuery({
    queryKey: ['active-keys-count', branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches/${branchId}/api-keys`);
      let count = 0;
      for (const platform of Object.values(res.data.data) as any[][]) {
        count += platform.filter((k: any) => k.status === 'active').length;
      }
      return count;
    },
    enabled: !!branchId
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/find-hr`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.status === 'queued') {
        toast.info('Request queued for background processing');
      } else if (data.status === 'found_preview') {
        setPreviewData(data.contact);
        setShowPreviewModal(true);
      } else {
        toast.success('Contact successfully enriched!');
        queryClient.invalidateQueries({ queryKey: ['contact-today', branchId] });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to validate contact');
    }
  });

  const allAvailableContacts = [
    ...(currentHr ? [{ id: 'primary', label: currentHr.name || 'Unknown Name', data: currentHr }] : []),
    ...additionalContacts.map((c, i) => ({ id: `additional-${i}`, label: c.hrName || 'Unknown Name', data: { name: c.hrName, email: c.hrEmail, mobile: c.hrPhone, designation: 'Additional HR' } })),
    ...(pendingContact ? [{ id: 'pending', label: pendingContact.name || 'Unknown Name', data: pendingContact }] : [])
  ];

  const handleAutofillSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    
    const selected = allAvailableContacts.find(c => c.id === selectedId);
    if (selected && selected.data) {
      setPreviewData({
        ...previewData,
        name: selected.data.name || previewData?.name || '',
        email: selected.data.email || previewData?.email || '',
        phone: selected.data.phone || selected.data.mobile || previewData?.phone || '',
        job_title: selected.data.designation || previewData?.job_title || '',
        linkedin_url: selected.data.linkedin_url || previewData?.linkedin_url || ''
      });
    }
  };

  const commitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: previewData.name,
        email: previewData.email,
        mobile: previewData.phone || previewData.mobile,
        designation: previewData.job_title || previewData.designation,
        linkedin_url: previewData.linkedin_url
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/hr-contacts/commit`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('HR Contact updated successfully!');
      setShowPreviewModal(false);
      setPreviewData(null);
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['contact-today', branchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', branchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', branchId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update HR contact');
    }
  });

  const isDisabled = keysLoading || activeKeysCount === 0;

  return (
    <>
      <div className="relative w-full group">
        <button
          onClick={() => validateMutation.mutate()}
          disabled={isDisabled || validateMutation.isPending}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
            isDisabled
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border border-transparent hover:from-indigo-700 hover:to-blue-700 hover:shadow-md hover:-translate-y-0.5'
          }`}
        >
          {validateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {validateMutation.isPending ? 'Validating...' : 'Validate'}
        </button>

        {/* Tooltip for disabled state */}
        {isDisabled && isHovered && (
          <div className="absolute z-50 w-64 bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl text-center font-medium transition-opacity">
            No active API keys configured. Please add an API key in the configuration tab.
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>

      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">New Contact Found</h3>
              <p className="text-sm text-slate-500 mt-1">Review the details before updating.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                {allAvailableContacts.length > 0 && (
                  <div className="mb-5 pb-5 border-b border-indigo-100/50">
                    <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Autofill from known contacts</label>
                    <select 
                      onChange={handleAutofillSelect}
                      className="w-full text-sm font-medium border border-indigo-200 text-indigo-800 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                    >
                      <option value="">-- Select a contact to autofill form --</option>
                      {allAvailableContacts.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={previewData.name || ''}
                      onChange={(e) => setPreviewData({ ...previewData, name: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input 
                      type="text" 
                      value={previewData.job_title || previewData.designation || ''}
                      onChange={(e) => setPreviewData({ ...previewData, job_title: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={previewData.email || ''}
                      onChange={(e) => setPreviewData({ ...previewData, email: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <input 
                      type="text" 
                      value={previewData.phone || ''}
                      onChange={(e) => setPreviewData({ ...previewData, phone: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile URL</label>
                    <input 
                      type="url" 
                      placeholder="https://linkedin.com/in/..."
                      value={previewData.linkedin_url || ''}
                      onChange={(e) => setPreviewData({ ...previewData, linkedin_url: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">You can add or update the LinkedIn URL manually before saving.</p>
                  </div>
                  {previewData.location && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-semibold text-slate-900 w-16">Location:</span>
                      <span className="truncate">{previewData.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
                disabled={commitMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => commitMutation.mutate()}
                disabled={commitMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-70"
              >
                {commitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Update HR Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
