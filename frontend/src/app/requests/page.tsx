'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Inbox, 
  Users, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  Mail,
  User as UserIcon,
  X
} from 'lucide-react';

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tpr' | 'company'>('tpr');
  
  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectType, setRejectType] = useState<'tpr' | 'contact' | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/requests`, {
        withCredentials: true
      });
      return res.data.data;
    }
  });

  const approveTprMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/approve-tpr/${id}`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPR Registration Approved');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve TPR')
  });

  const rejectTprMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/reject-tpr/${id}`, { reason }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPR Registration Rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      closeRejectModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject TPR')
  });

  const approveContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/approve-contact/${id}`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Company Contact Request Approved');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve request')
  });

  const rejectContactMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/reject-contact/${id}`, { reason }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Company Contact Request Rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      closeRejectModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject request')
  });

  const openRejectModal = (type: 'tpr' | 'contact', id: string) => {
    setRejectType(type);
    setRejectId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectType(null);
    setRejectId(null);
    setRejectReason('');
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    if (rejectType === 'tpr' && rejectId) {
      rejectTprMutation.mutate({ id: rejectId, reason: rejectReason });
    } else if (rejectType === 'contact' && rejectId) {
      rejectContactMutation.mutate({ id: rejectId, reason: rejectReason });
    }
  };

  const tprs = requests?.tprs || [];
  const contacts = requests?.contacts || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Inbox className="w-8 h-8 text-blue-600" />
          Action Center & Requests
        </h1>
        <p className="text-slate-500 mt-2">Manage pending TPR registrations and company contact requests.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('tpr')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'tpr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          TPR Verifications
          {tprs.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{tprs.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'company' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Company Requests
          {contacts.length > 0 && (
            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">{contacts.length}</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'tpr' && (
            tprs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                <p className="text-slate-500">No pending TPR registrations.</p>
              </div>
            ) : (
              tprs.map((tpr: any) => (
                <div key={tpr._id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{tpr.name}</h3>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">Pending Approval</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-slate-400" /> {tpr.rollNumber}</p>
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {tpr.email}</p>
                      <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> Branch: <span className="font-semibold text-slate-900">{tpr.branchId?.name}</span></p>
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Registered: {new Date(tpr.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex w-full md:w-auto gap-3 shrink-0">
                    <button
                      onClick={() => openRejectModal('tpr', tpr._id)}
                      className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveTprMutation.mutate(tpr._id)}
                      disabled={approveTprMutation.isPending}
                      className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {approveTprMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'company' && (
            contacts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                <p className="text-slate-500">No pending company contact requests.</p>
              </div>
            ) : (
              contacts.map((contact: any) => (
                <div key={contact._id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{contact.companyName}</h3>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">Pending Contact</span>
                    </div>
                    <div className="mt-3 bg-slate-50 border border-slate-100 p-4 rounded-lg">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Requested By</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                        <p><span className="text-slate-500">TPR:</span> <span className="font-semibold">{contact.requestedBy?.name}</span></p>
                        <p><span className="text-slate-500">Email:</span> {contact.requestedBy?.email}</p>
                        <p><span className="text-slate-500">Branch:</span> <span className="font-semibold">{contact.branchId?.name}</span></p>
                        <p className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> {new Date(contact.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full md:w-auto gap-3 shrink-0">
                    <button
                      onClick={() => openRejectModal('contact', contact._id)}
                      className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveContactMutation.mutate(contact._id)}
                      disabled={approveContactMutation.isPending}
                      className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {approveContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve & Send
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject {rejectType === 'tpr' ? 'TPR Registration' : 'Contact Request'}
              </h3>
              <button onClick={closeRejectModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">
                  Please provide a reason for rejecting this {rejectType === 'tpr' ? 'registration' : 'request'}. 
                  This reason will be visible to the TPR.
                </p>
                <textarea
                  autoFocus
                  required
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                  placeholder="Enter rejection reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectTprMutation.isPending || rejectContactMutation.isPending}
                  className="flex-1 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {(rejectTprMutation.isPending || rejectContactMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
