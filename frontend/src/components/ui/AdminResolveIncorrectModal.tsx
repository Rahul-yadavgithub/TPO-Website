import React, { useState, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, Link, AlertCircle, Loader2, CheckCircle2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface AdminResolveIncorrectModalProps {
  company: any;
  onClose: () => void;
}

export function AdminResolveIncorrectModal({ company, onClose }: AdminResolveIncorrectModalProps) {
  const queryClient = useQueryClient();
  
  // Extract all flagged contacts
  const extractFlaggedContacts = (company: any) => {
    const contacts: any[] = [];
    if (company.primary_contact_flagged) {
      contacts.push({
        id: 'primary',
        name: company.hrName || '',
        phone: company.hrPhone || '',
        email: company.hrEmail || '',
        source: 'Primary Contact',
        isVerified: company.primary_contact_verified || false
      });
    }
    
    if (company.additionalContacts && company.additionalContacts.length > 0) {
      company.additionalContacts.forEach((c: any, index: number) => {
        if (c.isFlagged) {
          contacts.push({
            id: `additional-${index}`,
            name: c.hrName || '',
            phone: c.hrPhone || '',
            email: c.hrEmail || '',
            source: c.sourceSheet || 'Additional Contact',
            isVerified: c.isVerified || false
          });
        }
      });
    }

    if (company.extraData) {
      Object.keys(company.extraData).forEach(k => {
        const match = k.match(/^OTHER HR FLAGGED\s*(\d*)$/i);
        if (match) {
          const suffix = match[1] || '';
          const isFlagged = String(company.extraData[k]).toLowerCase() === 'true';
          
          if (isFlagged) {
            const keys = Object.keys(company.extraData);
            const nameKey = keys.find(key => key.toLowerCase() === `OTHER HR NAME ${suffix}`.toLowerCase().trim());
            const phoneKey = keys.find(key => key.toLowerCase().match(new RegExp(`OTHER HR (MOBILE|PHONE|NUMBER|CONTACT) ${suffix}`, 'i')));
            const emailKey = keys.find(key => key.toLowerCase().match(new RegExp(`OTHER HR (EMAIL|MAIL) ${suffix}`, 'i')));
            const verifiedKey = keys.find(key => key.toLowerCase() === `OTHER HR VERIFIED ${suffix}`.toLowerCase().trim());
            
            contacts.push({
              id: `extra-${suffix || Math.random().toString(36).substring(7)}`,
              name: nameKey ? company.extraData[nameKey] : '',
              phone: phoneKey ? company.extraData[phoneKey] : '',
              email: emailKey ? company.extraData[emailKey] : '',
              source: `Extra Contact ${suffix}`.trim(),
              isVerified: verifiedKey ? String(company.extraData[verifiedKey]).toLowerCase() === 'true' : false
            });
          }
        }
      });
    }
    return contacts;
  };

  const [flaggedContacts, setFlaggedContacts] = useState<any[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [smartPasteText, setSmartPasteText] = useState('');
  
  const [editForm, setEditForm] = useState({
    hrName: '',
    hrEmail: '',
    hrPhone: '',
    isVerified: true
  });

  useEffect(() => {
    if (company) {
      const contacts = extractFlaggedContacts(company);
      setFlaggedContacts(contacts);
      if (contacts.length > 0) {
        setSelectedContactId(contacts[0].id);
      }
    }
  }, [company]);

  const selectedContact = flaggedContacts.find(c => c.id === selectedContactId);

  useEffect(() => {
    if (selectedContact) {
      setEditForm({
        hrName: selectedContact.name || '',
        hrEmail: selectedContact.email || '',
        hrPhone: selectedContact.phone || '',
        isVerified: true
      });
      setSmartPasteText('');
    }
  }, [selectedContactId, selectedContact]);

  // Smart Paste Logic
  useEffect(() => {
    if (!smartPasteText.trim()) return;

    const timer = setTimeout(() => {
      const text = smartPasteText;
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
      const phoneRegex = /(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}|(\d{3}[-\.\s]\d{3}[-\.\s]\d{4}|\(\d{3}\)\s*\d{3}[-\.\s]\d{4}|\d{3}[-\.\s]\d{4})/g;

      const emailMatch = text.match(emailRegex);
      const phoneMatches = text.match(phoneRegex);

      setEditForm(prev => {
        const newData = { ...prev };
        if (emailMatch && !prev.hrEmail) newData.hrEmail = emailMatch[0];
        if (phoneMatches && !prev.hrPhone) newData.hrPhone = phoneMatches[0].replace(/[\s\-\(\)]/g, '');

        let cleanText = text;
        if (emailMatch) cleanText = cleanText.replace(emailMatch[0], '');
        if (phoneMatches) {
          phoneMatches.forEach(match => {
            cleanText = cleanText.replace(match, '');
          });
        }
        cleanText = cleanText.replace(/Phone|Email|Mobile|Contact|Name/gi, '');
        cleanText = cleanText.replace(/[:|+]/g, '');

        const words = cleanText.split(/[\s,]+/).filter(w => w.length > 2);
        if (words.length > 0 && !prev.hrName) {
          newData.hrName = words.slice(0, 2).join(' ');
        }
        return newData;
      });

      toast.success('Smart Paste extracted information.');
      setSmartPasteText('');
    }, 800);

    return () => clearTimeout(timer);
  }, [smartPasteText]);

  const resolveContactMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${company._id}/admin-resolve-contact`, {
        contactId: selectedContactId,
        ...editForm
      }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Contact resolved successfully and synced!');
      
      // Invalidate on every success to keep background list up to date
      queryClient.invalidateQueries({ queryKey: ['past-companies'] });

      // Remove the resolved contact from the local flaggedContacts list
      const remainingContacts = flaggedContacts.filter(c => c.id !== selectedContactId);
      setFlaggedContacts(remainingContacts);
      
      if (remainingContacts.length > 0) {
        setSelectedContactId(remainingContacts[0].id);
      } else {
        // All done
        onClose();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve contact');
    }
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Resolve Incorrect Company
            </h2>
            <p className="text-sm text-slate-500 mt-1">Select an incorrect contact below, update its details, and sync to resolve the flag.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Company Context */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                {company.companyName}
              </h3>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Source: {company.section || 'Uncategorized'} | {flaggedContacts.length} Incorrect Contact(s) remaining
              </p>
            </div>
          </div>

          {flaggedContacts.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">All Contacts Resolved</h3>
              <p className="text-slate-500 mt-2">There are no more flagged contacts for this company.</p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Contact Selection */}
              <div className="lg:col-span-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Select Contact</h4>
                {flaggedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative ${
                      selectedContactId === contact.id 
                        ? 'border-red-500 bg-red-50 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="pr-4">
                        <p className="font-bold text-slate-900 truncate">{contact.name || 'Unknown Name'}</p>
                        <div className="text-xs text-slate-500 mt-2 space-y-1">
                          {contact.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {contact.phone}</p>}
                          {contact.email && <p className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" /> {contact.email}</p>}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3">
                        {selectedContactId === contact.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source: {contact.source}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Column: Edit Form */}
              <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <label className="block text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    SMART PASTE 
                    <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Paste info to auto-fill below</span>
                  </label>
                  <textarea 
                    value={smartPasteText}
                    onChange={(e) => setSmartPasteText(e.target.value)}
                    placeholder="e.g. John Doe john@example.com +91 9876543210"
                    className="w-full h-24 p-3 text-sm bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none shadow-sm"
                  />
                </div>
                
                <div className="p-6">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Final Details to Save
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">HR Name</label>
                      <input 
                        type="text" 
                        value={editForm.hrName}
                        onChange={(e) => setEditForm({...editForm, hrName: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                      <input 
                        type="text" 
                        value={editForm.hrPhone}
                        onChange={(e) => setEditForm({...editForm, hrPhone: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                      <input 
                        type="email" 
                        value={editForm.hrEmail}
                        onChange={(e) => setEditForm({...editForm, hrEmail: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors w-full sm:w-auto">
                      <input 
                        type="checkbox" 
                        checked={editForm.isVerified}
                        onChange={(e) => setEditForm({...editForm, isVerified: e.target.checked})}
                        className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Mark contact as verified
                      </span>
                    </label>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={onClose}
                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => resolveContactMutation.mutate()}
                        disabled={resolveContactMutation.isPending || (!editForm.hrName && !editForm.hrEmail && !editForm.hrPhone)}
                        className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        {resolveContactMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                          'Save & Sync'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
