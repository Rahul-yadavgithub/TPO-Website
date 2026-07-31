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
  X,
  ShieldCheck
} from 'lucide-react';

const getCourseFromEmail = (email: string) => {
  if (!email) return 'Other';
  const match = email.match(/^\d{2}([a-z])/i);
  if (!match) return 'Other';
  const char = match[1].toLowerCase();
  if (char === 'b') return 'B.Tech';
  if (char === 'm') return 'M.Tech';
  if (char === 'd') return 'Dual Degree';
  if (char === 'a') return 'B.Arch';
  return 'Other';
};

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tpr' | 'company' | 'directory'>('tpr');
  const [tprCourseFilter, setTprCourseFilter] = useState('All');
  const [tprBranchFilter, setTprBranchFilter] = useState('All');
  
  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectType, setRejectType] = useState<'tpr' | 'contact' | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Replace modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetNewUserId, setTargetNewUserId] = useState<string | null>(null);
  const [targetBranchId, setTargetBranchId] = useState<string | null>(null);
  const [selectedOldUserId, setSelectedOldUserId] = useState('');

  // Details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<any>(null);

  // Role change modal state
  const [roleChangeModalOpen, setRoleChangeModalOpen] = useState(false);
  const [roleChangeAction, setRoleChangeAction] = useState<'upgrade' | 'revoke' | null>(null);
  const [selectedTprForRole, setSelectedTprForRole] = useState<any>(null);

  const openRoleChangeModal = (action: 'upgrade' | 'revoke', tpr: any) => {
    setRoleChangeAction(action);
    setSelectedTprForRole(tpr);
    setRoleChangeModalOpen(true);
  };

  const closeRoleChangeModal = () => {
    setRoleChangeModalOpen(false);
    setRoleChangeAction(null);
    setSelectedTprForRole(null);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedTprForRole) return;
    if (roleChangeAction === 'upgrade') {
      upgradeTprMutation.mutate(selectedTprForRole._id, {
        onSuccess: () => {
          closeRoleChangeModal();
        }
      });
    } else if (roleChangeAction === 'revoke') {
      revokeAdminMutation.mutate(selectedTprForRole._id, {
        onSuccess: () => {
          closeRoleChangeModal();
        }
      });
    }
  };

  const openDetailsModal = (companyData: any) => {
    setSelectedCompanyDetails(companyData);
    setDetailsModalOpen(true);
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/requests`, {
        withCredentials: true
      });
      return res.data.data;
    }
  });

  const { data: allTprs } = useQuery({
    queryKey: ['admin-all-tprs'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/tprs`, { withCredentials: true });
      return res.data.data;
    },
    refetchInterval: 60000,
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
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

  const { data: activeTprs, isLoading: loadingActiveTprs } = useQuery({
    queryKey: ['active-tprs', targetBranchId],
    queryFn: async () => {
      if (!targetBranchId) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/active-tprs/${targetBranchId}`, { withCredentials: true });
      return res.data.data;
    },
    enabled: !!targetBranchId && replaceModalOpen
  });

  const replaceTprMutation = useMutation({
    mutationFn: async ({ newUserId, oldUserId }: { newUserId: string, oldUserId: string }) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/replace-tpr/${newUserId}`, { replaceUserId: oldUserId }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPR Replaced and Work Handed Over successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      closeReplaceModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to replace TPR')
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

  const upgradeTprMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/upgrade-tpr/${id}`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPR upgraded to Admin successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-all-tprs'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to upgrade TPR')
  });

  const revokeAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/revoke-admin/${id}`, {}, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Admin access revoked successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-all-tprs'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to revoke admin access')
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

  const openReplaceModal = (userId: string, branchId: string) => {
    setTargetNewUserId(userId);
    setTargetBranchId(branchId);
    setSelectedOldUserId('');
    setReplaceModalOpen(true);
  };

  const closeReplaceModal = () => {
    setReplaceModalOpen(false);
    setTargetNewUserId(null);
    setTargetBranchId(null);
    setSelectedOldUserId('');
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

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap pb-1">
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
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'directory' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Our TPRs
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
                      <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /> Branch: <span className="font-semibold text-slate-900">{tpr.branchId?.name} {tpr.course && `(${tpr.course})`}</span></p>
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Registered: {new Date(tpr.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 shrink-0 mt-4 md:mt-0">
                    <button
                      onClick={() => openRejectModal('tpr', tpr._id)}
                      className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => openReplaceModal(tpr._id, tpr.branchId?._id)}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Replace TPR
                    </button>
                    <button
                      onClick={() => approveTprMutation.mutate(tpr._id)}
                      disabled={approveTprMutation.isPending}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {approveTprMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve as New
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
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        {contact.companyName}
                          <div title="Verified by Admin">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          </div>
                      </h3>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">Pending Contact</span>
                      {contact.companyId?.section && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                          Tab: {contact.companyId.section}
                        </span>
                      )}
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
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 shrink-0 mt-4 md:mt-0">
                    <button
                      onClick={() => openDetailsModal(contact.companyId)}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openRejectModal('contact', contact._id)}
                      className="w-full sm:w-auto px-4 py-2 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveContactMutation.mutate(contact._id)}
                      disabled={approveContactMutation.isPending}
                      className="w-full sm:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {approveContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve & Send
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'directory' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" /> TPR Directory & Access Management
                </h2>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <select 
                    className="w-full sm:w-auto bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tprCourseFilter}
                    onChange={e => { setTprCourseFilter(e.target.value); setTprBranchFilter('All'); }}
                  >
                    <option value="All">All Courses</option>
                    <option value="B.Tech">B.Tech</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="Dual Degree">Dual Degree</option>
                    <option value="B.Arch">B.Arch</option>
                  </select>
                  <select 
                    className="w-full sm:w-auto bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tprBranchFilter}
                    onChange={e => setTprBranchFilter(e.target.value)}
                  >
                    <option value="All">All Branches</option>
                    {tprCourseFilter === 'M.Tech' ? (
                      ['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE'].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))
                    ) : branchesData
                      ?.filter((b: any) => b.name !== 'Central Admin' && !b.name.toLowerCase().includes('m.tech') && !b.name.toLowerCase().includes('mtech'))
                      .map((b: any) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                  <span className="text-sm font-medium text-slate-500 whitespace-nowrap shrink-0 ml-1">
                    {allTprs?.filter((tpr: any) => {
                      const courseMatch = tprCourseFilter === 'All' || getCourseFromEmail(tpr.email) === tprCourseFilter;
                      const branchMatch = tprBranchFilter === 'All' || tpr.branchId?._id === tprBranchFilter || tpr.branchId?.name === tprBranchFilter;
                      return courseMatch && branchMatch;
                    }).length || 0} TPRs
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {allTprs?.filter((tpr: any) => {
                  const courseMatch = tprCourseFilter === 'All' || getCourseFromEmail(tpr.email) === tprCourseFilter;
                  const branchMatch = tprBranchFilter === 'All' || tpr.branchId?._id === tprBranchFilter || tpr.branchId?.name === tprBranchFilter;
                  return courseMatch && branchMatch;
                }).map((tpr: any) => (
                  <div key={tpr._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-slate-900">{tpr.name}</p>
                        {tpr.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">Admin</span>
                        ) : tpr.role === 'communication_tpr' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">Comm TPR</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">Standard</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{tpr.email} • {tpr.branchId?.name} {tpr.course && `(${tpr.course})`}</p>
                    </div>
                    {tpr.role !== 'admin' && (
                      <button 
                        onClick={() => openRoleChangeModal('upgrade', tpr)}
                        disabled={upgradeTprMutation.isPending}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-sm font-bold rounded-lg shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors shrink-0 flex items-center justify-center gap-2"
                      >
                        {upgradeTprMutation.isPending && upgradeTprMutation.variables === tpr._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade to Admin'}
                      </button>
                    )}
                    {tpr.role === 'admin' && (
                      <button 
                        onClick={() => openRoleChangeModal('revoke', tpr)}
                        disabled={revokeAdminMutation.isPending}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-sm font-bold rounded-lg shadow-sm border border-slate-200 hover:border-red-200 transition-colors shrink-0 flex items-center justify-center gap-2"
                      >
                        {revokeAdminMutation.isPending && revokeAdminMutation.variables === tpr._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke Admin'}
                      </button>
                    )}
                  </div>
                ))}
                
                {allTprs?.filter((tpr: any) => {
                  const courseMatch = tprCourseFilter === 'All' || getCourseFromEmail(tpr.email) === tprCourseFilter;
                  const branchMatch = tprBranchFilter === 'All' || tpr.branchId?._id === tprBranchFilter || tpr.branchId?.name === tprBranchFilter;
                  return courseMatch && branchMatch;
                }).length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No TPRs found matching the selected filters.
                  </div>
                )}
              </div>
            </div>
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

      {/* Replace TPR Modal */}
      {replaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Handover & Replace TPR
              </h3>
              <button onClick={closeReplaceModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Select an existing TPR to replace. All of their currently assigned companies and contact requests will be automatically transferred to this new TPR. The old TPR's account will be deactivated.
              </p>
              
              {loadingActiveTprs ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : activeTprs && activeTprs.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Select Old TPR to Replace:</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={selectedOldUserId}
                    onChange={(e) => setSelectedOldUserId(e.target.value)}
                  >
                    <option value="">-- Select TPR --</option>
                    {activeTprs.map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name} ({t.rollNumber}) - {t.email}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-100">
                  No active TPRs found in this branch to replace. You can only approve as a new TPR.
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                type="button"
                onClick={closeReplaceModal}
                className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => targetNewUserId && selectedOldUserId && replaceTprMutation.mutate({ newUserId: targetNewUserId, oldUserId: selectedOldUserId })}
                disabled={!selectedOldUserId || replaceTprMutation.isPending}
                className="flex-1 py-2.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {replaceTprMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Handover
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Company Details Modal */}
      {detailsModalOpen && selectedCompanyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {selectedCompanyDetails.companyName} Details
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Source Tab / Section</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedCompanyDetails.section || 'Unknown'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Academic Year</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedCompanyDetails.academicYear || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">HR Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">HR Name</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompanyDetails.hrName || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">HR Phone</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompanyDetails.hrPhone || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 sm:col-span-2">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">HR Email</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedCompanyDetails.hrEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {selectedCompanyDetails.extraData && Object.keys(selectedCompanyDetails.extraData).length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Additional Information</h4>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                    {Object.entries(selectedCompanyDetails.extraData).map(([key, value]: any) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start p-3 sm:p-4 hover:bg-slate-50">
                        <span className="w-1/3 text-xs font-bold text-slate-500 uppercase shrink-0 mb-1 sm:mb-0">{key}</span>
                        <span className="flex-1 text-sm text-slate-900 whitespace-pre-wrap">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 pt-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-6 py-2.5 font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Role Change Modal */}
      {roleChangeModalOpen && selectedTprForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${roleChangeAction === 'upgrade' ? 'text-indigo-600' : 'text-red-600'}`} />
                {roleChangeAction === 'upgrade' ? 'Upgrade to Admin' : 'Revoke Admin Access'}
              </h3>
              <button onClick={closeRoleChangeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                {roleChangeAction === 'upgrade' ? (
                  <>Are you sure you want to upgrade <strong>{selectedTprForRole.name}</strong> to an Admin? They will have full administrative access to the platform.</>
                ) : (
                  <>Are you sure you want to revoke Admin access for <strong>{selectedTprForRole.name}</strong>? They will become a standard TPR.</>
                )}
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                type="button"
                onClick={closeRoleChangeModal}
                className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={upgradeTprMutation.isPending || revokeAdminMutation.isPending}
                className={`flex-1 py-2.5 font-semibold text-white rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  roleChangeAction === 'upgrade' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-slate-300`}
              >
                {(upgradeTprMutation.isPending || revokeAdminMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
