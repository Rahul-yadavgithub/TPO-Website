'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Edit2, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChangeContactDetailsButtonProps {
  companyId: string;
  tpoName: string;
  tpoType?: string;
  currentHr?: any;
  is_verified_by_admin?: boolean;
}

export default function ChangeContactDetailsButton({ companyId, tpoName, tpoType, currentHr, is_verified_by_admin }: ChangeContactDetailsButtonProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentHr?.name || '',
    email: currentHr?.email || '',
    mobile: currentHr?.mobile || '',
    designation: currentHr?.designation || '',
    linkedin_url: currentHr?.linkedin_url || ''
  });

  const [smartPasteText, setSmartPasteText] = useState('');

  // Handle Smart Paste parsing
  useEffect(() => {
    if (!smartPasteText.trim()) return;

    const timer = setTimeout(() => {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\d{5}[-.\s]?\d{5}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{4}[-.\s]?\d{3}[-.\s]?\d{3}|\d{10})/g;
      const linkedinRegex = /(https?:\/\/(www\.)?linkedin\.com\/in\/[^\s]+)/gi;
      const urlRegex = /(https?:\/\/[^\s]+)/gi;

      const emails = smartPasteText.match(emailRegex);
      const phones = smartPasteText.match(phoneRegex);
      const linkedins = smartPasteText.match(linkedinRegex);
      const urls = smartPasteText.match(urlRegex);

      setFormData(prev => {
        const newData = { ...prev };
        
        if (emails && emails.length > 0 && !prev.email) newData.email = emails[0];
        if (phones && phones.length > 0 && !prev.mobile) newData.mobile = phones[0].trim();
        if (linkedins && linkedins.length > 0 && !prev.linkedin_url) newData.linkedin_url = linkedins[0];
        
        // Advanced Name Extraction
        let cleanText = smartPasteText;
        if (emails) emails.forEach(e => cleanText = cleanText.replace(e, ''));
        if (phones) phones.forEach(p => cleanText = cleanText.replace(p, ''));
        if (linkedins) linkedins.forEach(l => cleanText = cleanText.replace(l, ''));
        if (urls) urls.forEach(u => cleanText = cleanText.replace(u, ''));
        
        // Remove common titles and prefixes
        cleanText = cleanText.replace(/HR|Manager|Talent|Acquisition|Lead|Director|Head|Mr\.|Ms\.|Mrs\./gi, '');
        // Keep only letters and spaces
        cleanText = cleanText.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
        
        const words = cleanText.split(' ').filter(w => w.length > 1);
        if (words.length > 0 && !prev.name) {
          newData.name = words.slice(0, 2).join(' ');
        }

        return newData;
      });

      toast.success('Smart Paste extracted available information.');
      setSmartPasteText('');
    }, 800);

    return () => clearTimeout(timer);
  }, [smartPasteText]);

  const commitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        designation: formData.designation,
        linkedin_url: formData.linkedin_url
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/hr-contacts/commit`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('HR Contact updated successfully!');
      setShowModal(false);
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['contact-today', tpoName] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', tpoName] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', tpoName] });
      
      // Also optionally sync immediately to google sheets if that's what user expects,
      // but usually the "Sync All" button handles sheet sync or we can trigger it directly.
      // Let's trigger branch sync directly since user said "sync with the database as well as the sheet".
      if (tpoType) {
        return axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sync/branch/${tpoType}`)
          .then(() => toast.success('Changes synced to Google Sheets'))
          .catch(() => toast.error('Saved to DB, but failed to sync to sheet'));
      }
      return null;
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update HR contact');
    }
  });

  if (is_verified_by_admin) {
    return (
      <div className="relative w-full group">
        <button
          disabled
          title="Company verified by Admin. Contact details cannot be edited."
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-sm bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
        >
          <Edit2 className="w-4 h-4" />
          Verified (Locked)
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full group">
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5"
        >
          <Edit2 className="w-4 h-4" />
          Change Details
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Edit HR Contact</h3>
              <p className="text-sm text-slate-500 mt-1">Update details manually and sync.</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                
                <div className="mb-5 pb-5 border-b border-indigo-100/50">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> Smart Paste
                  </label>
                  <textarea 
                    value={smartPasteText}
                    onChange={(e) => setSmartPasteText(e.target.value)}
                    placeholder="Paste details here to auto-fill..."
                    className="w-full h-16 p-3 text-sm bg-white border border-indigo-200 text-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none shadow-sm"
                  />
                  <p className="text-[10px] text-indigo-600 mt-1.5 leading-tight">Paste a block of text containing email, phone, and name. We'll extract them for you.</p>
                </div>

                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <input 
                      type="text" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">LinkedIn Profile URL</label>
                    <input 
                      type="url" 
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
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
                Save & Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
