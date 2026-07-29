import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, FileText, ArrowRightLeft, ShieldCheck, UserPlus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface ResolveDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicate: any; // Contains the duplicate details + populated originalCompanyId
  onSuccess: () => void;
}

export function ResolveDuplicateModal({ isOpen, onClose, duplicate, onSuccess }: ResolveDuplicateModalProps) {
  const [submittingAction, setSubmittingAction] = useState<'replace_primary' | 'add_extra' | 'discard' | null>(null);

  if (!isOpen || !duplicate) return null;

  const original = duplicate.originalCompanyId;

  const handleResolve = async (action: 'replace_primary' | 'add_extra' | 'discard') => {
    setSubmittingAction(action);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/previous-companies/duplicates/${duplicate._id}/resolve`,
        { action },
        { withCredentials: true }
      );
      toast.success('Duplicate resolved successfully!');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Failed to resolve duplicate');
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-amber-50/50">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <ArrowRightLeft className="w-6 h-6 text-amber-600" />
            Resolve Duplicate: {duplicate.companyName}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-50/30">
          
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold mb-1">Duplicate Intercepted</p>
              <p>A new import or manual entry tried to add <strong>{duplicate.companyName}</strong>, but it already exists in the master list. Compare the details below and decide how to merge them.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Divider Icon */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm z-10 text-slate-400">
              VS
            </div>

            {/* Current Master */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Current Master</h3>
              </div>
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="text-xs text-slate-500 uppercase">HR Name</label>
                  <p className="font-medium text-slate-900 mt-0.5">{original.hrName || <span className="text-slate-400 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Phone</label>
                  <p className="text-slate-900 mt-0.5">{original.hrPhone || <span className="text-slate-400 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Email</label>
                  <p className="text-slate-900 mt-0.5">{original.hrEmail || <span className="text-slate-400 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Source Section</label>
                  <p className="text-slate-900 mt-0.5">{original.section}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase">Academic Year</label>
                  <p className="text-slate-900 mt-0.5">{original.academicYear}</p>
                </div>
              </div>
            </div>

            {/* Incoming Duplicate */}
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-sm uppercase tracking-wider">Incoming Duplicate</h3>
              </div>
              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="text-xs text-amber-700 uppercase">HR Name</label>
                  <p className="font-medium text-amber-900 mt-0.5">{duplicate.hrName || <span className="text-amber-700/50 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-amber-700 uppercase">Phone</label>
                  <p className="text-amber-900 mt-0.5">{duplicate.hrPhone || <span className="text-amber-700/50 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-amber-700 uppercase">Email</label>
                  <p className="text-amber-900 mt-0.5">{duplicate.hrEmail || <span className="text-amber-700/50 italic">None</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-amber-700 uppercase">Source Section</label>
                  <p className="text-amber-900 mt-0.5">{duplicate.section}</p>
                </div>
                <div>
                  <label className="text-xs text-amber-700 uppercase">Academic Year</label>
                  <p className="text-amber-900 mt-0.5">{duplicate.academicYear}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 mb-4 text-center">How would you like to resolve this?</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleResolve('discard')}
                disabled={!!submittingAction}
                className="flex-1 px-4 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submittingAction === 'discard' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Discard Duplicate
              </button>
              
              <button 
                onClick={() => handleResolve('add_extra')}
                disabled={!!submittingAction}
                className="flex-[1.5] px-4 py-3 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submittingAction === 'add_extra' ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Keep Both (Add as Extra Contact)
              </button>

              <button 
                onClick={() => handleResolve('replace_primary')}
                disabled={!!submittingAction}
                className="flex-1 px-4 py-3 bg-blue-600 border border-transparent text-white hover:bg-blue-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submittingAction === 'replace_primary' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                Overwrite Master
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
