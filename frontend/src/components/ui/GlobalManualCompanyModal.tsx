import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, Link, Calendar, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface GlobalManualCompanyModalProps {
  mode: 'current' | 'previous';
  onClose: () => void;
  onSuccess: () => void;
}

export function GlobalManualCompanyModal({ mode, onClose, onSuccess }: GlobalManualCompanyModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    hrName: '',
    hrPhone: '',
    hrEmail: '',
    linkedinProfile: '',
    website: '',
    academicYear: new Date().getFullYear().toString()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    },
    enabled: mode === 'current'
  });

  const getEndpoint = () => {
    return mode === 'current'
      ? `${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/manual-company`
      : `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/manual`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast.error('Company Name is required');
      return;
    }
    if (mode === 'current' && !selectedBranchId) {
      toast.error('Please select a branch first');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axios.post(getEndpoint(), formData, { withCredentials: true });
      toast.success('Company added successfully!');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to add company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            Add Manual {mode === 'current' ? 'Company' : 'Previous Company'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'current' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Branch *
                </label>
                <select
                  required
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">-- Select Branch --</option>
                  {branches?.map((b: any) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Company Name *
              </label>
              <input 
                type="text" 
                required
                placeholder="e.g. Google"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            
            {mode === 'previous' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> Academic Year *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 2023-2024"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                />
              </div>
            )}

            {mode === 'current' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Website URL
                </label>
                <input 
                  type="url" 
                  placeholder="e.g. https://google.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">HR Contact Information (Optional)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> HR Name
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.hrName}
                    onChange={(e) => setFormData({ ...formData, hrName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Phone
                  </label>
                  <input 
                    type="text" 
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.hrPhone}
                    onChange={(e) => setFormData({ ...formData, hrPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> Email
                </label>
                <input 
                  type="email" 
                  placeholder="hr@company.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.hrEmail}
                  onChange={(e) => setFormData({ ...formData, hrEmail: e.target.value })}
                />
              </div>

              {mode === 'current' && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                    <Link className="w-4 h-4 text-slate-400" /> LinkedIn Profile
                  </label>
                  <input 
                    type="url" 
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={formData.linkedinProfile}
                    onChange={(e) => setFormData({ ...formData, linkedinProfile: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="pt-6 flex gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !formData.companyName.trim() || (mode === 'current' && !selectedBranchId)}
                className="flex-[2] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Save Company
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
