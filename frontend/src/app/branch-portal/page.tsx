'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Users, PhoneCall, Calendar, Mail, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, X, Clock, AlertCircle, Trash2, RefreshCw, CloudUpload, Key, FileSpreadsheet, History, Search, ShieldAlert, Edit2, Save, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import ApiKeyConfig from './ApiKeyConfig';
import ValidateContactButton from './ValidateContactButton';
import ChangeContactDetailsButton from './ChangeContactDetailsButton';
import { BulkUploadModal } from '@/components/ui/BulkUploadModal';
import { PreviousContactsView } from '@/components/ui/PreviousContactsView';

export default function BranchPortalPage() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [activeView, setActiveView] = useState<'dashboard' | 'contact' | 'single_contact' | 'confirmed' | 'not_confirmed' | 'previous_requests'>('dashboard');
  const [previousView, setPreviousView] = useState<'dashboard' | 'contact' | 'confirmed' | 'not_confirmed' | 'previous_requests'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<'companies' | 'api'>('companies');
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [lastVisitedCompanyId, setLastVisitedCompanyId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'not_contacted' | 'call_again' | 'pending' | null>(null);
  
  // Fast Client-Side List Search
  const [listSearchQuery, setListSearchQuery] = useState('');
  
  // Manual Add Form State
  const [manualForm, setManualForm] = useState({ companyName: '', hrName: '', hrPhone: '', hrEmail: '', linkedinProfile: '' });
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isConflict, setIsConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [checkingName, setCheckingName] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showPreviousCompanyModal, setShowPreviousCompanyModal] = useState(false);
  const [historyPanelCompany, setHistoryPanelCompany] = useState<any>(null);
  
  // Form State
  const [outcome, setOutcome] = useState<string>('');
  const [channel, setChannel] = useState<string>('Phone');
  const [notes, setNotes] = useState<string>('');
  const [nextContactDate, setNextContactDate] = useState<string>('');
  const [returnToUnified, setReturnToUnified] = useState(false);
  
  // Placement Details Edit State
  const [editingPlacementCompanyId, setEditingPlacementCompanyId] = useState<string | null>(null);
  const [editDriveType, setEditDriveType] = useState<string>('');
  const [editAcademicYear, setEditAcademicYear] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'previous_requests' || view === 'contact' || view === 'confirmed' || view === 'not_confirmed' || view === 'single_contact') {
        setActiveView(view as any);
      }
      
      const companyId = params.get('companyId');
      if (companyId) {
        setActiveCompanyId(companyId);
      }

      if (params.get('returnTo') === 'unified') {
        setReturnToUnified(true);
      }
    }
  }, []);

  const { data: userProfile, isLoading: userLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`);
      return res.data.data;
    }
  });

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr';

  // Auto-select branch if standard TPR
  useEffect(() => {
    if (userProfile && !isAdmin && userProfile.branchId && !selectedBranchId) {
      setSelectedBranchId(userProfile.branchId._id || userProfile.branchId);
    }
  }, [userProfile, isAdmin, selectedBranchId]);

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`);
      return res.data;
    }
  });

  // Auto-select branch from deep link if branches are loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && branches?.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const branchName = params.get('branchName');
      if (branchName && !selectedBranchId) {
        const foundBranch = branches.find((b: any) => b.name === branchName);
        if (foundBranch) {
          setSelectedBranchId(foundBranch._id);
        }
      }
    }
  }, [branches, selectedBranchId]);

  const { data: contactTodayList, isLoading: listLoading } = useQuery({
    queryKey: ['contact-today', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/contact-today`);
      return res.data;
    },
    enabled: !!selectedBranchId
  });

  const { data: confirmedList, isLoading: confirmedLoading } = useQuery({
    queryKey: ['confirmed', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/confirmed`);
      return res.data;
    },
    enabled: !!selectedBranchId
  });

  const { data: notConfirmedList, isLoading: notConfirmedLoading } = useQuery({
    queryKey: ['not-confirmed', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/not-confirmed`);
      return res.data;
    },
    enabled: !!selectedBranchId
  });

  const { data: pastRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['previous-requests', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/requests/${selectedBranchId}`);
      return res.data.data;
    },
    enabled: !!selectedBranchId
  });

  const markDeleteMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/mark-delete`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] })
  });

  const syncDeletionsMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/sync-deletions`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] })
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const branch = branches?.find((b: any) => b._id === selectedBranchId);
      if (!branch) throw new Error('Branch not found');
      // Pass branch.name since our backend sync endpoint expects the branch identifier
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sync/branch/${branch.name}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Branch synced to Google Sheets successfully!');
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to sync branch');
    }
  });

  const acknowledgeUpdateMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/acknowledge-hr-update`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
    }
  });

  const approvePendingMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/hr-contacts/approve-pending`);
    },
    onSuccess: () => {
      toast.success('HR Contact updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update HR contact');
    }
  });

  const discardPendingMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/hr-contacts/discard-pending`);
    },
    onSuccess: () => {
      toast.info('Pending update discarded.');
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to discard update');
    }
  });

  const updatePlacementDetailsMutation = useMutation({
    mutationFn: async ({ companyId, driveType, academicYear }: { companyId: string, driveType: string, academicYear: string }) => {
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/placement-details`, {
        drive_type: driveType,
        academic_year: academicYear
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Placement details updated!');
      setEditingPlacementCompanyId(null);
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
    },
    onError: () => {
      toast.error('Failed to update placement details');
    }
  });

  // Duplicate Check Effect
  useEffect(() => {
    if (!manualForm.companyName || manualForm.companyName.trim().length < 2) {
      setIsDuplicate(false);
      setIsConflict(false);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/check-name?name=${encodeURIComponent(manualForm.companyName)}`);
        if (res.data.exists) {
          const comp = res.data.company;
          const currentBranch = branches?.find((b: any) => b._id === selectedBranchId);
          if (comp.assignedBranch && currentBranch && comp.assignedBranch !== currentBranch.name) {
            setIsConflict(true);
            setConflictMessage(`This company is already owned by the ${comp.assignedBranch} branch. You cannot duplicate outreach.`);
            setIsDuplicate(false);
          } else {
            setIsConflict(false);
            setIsDuplicate(true);
            setManualForm(prev => ({
              ...prev,
              hrName: res.data.hrContact?.name || prev.hrName,
              hrPhone: res.data.hrContact?.mobile || prev.hrPhone,
              hrEmail: res.data.hrContact?.email || prev.hrEmail,
              linkedinProfile: res.data.hrContact?.linkedin_url || prev.linkedinProfile
            }));
            toast.info('Company exists. Switched to Update Mode.', { icon: '🔄' });
          }
        } else {
          setIsConflict(false);
          setIsDuplicate(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingName(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [manualForm.companyName]);

  const addManualCompanyMutation = useMutation({
    mutationFn: async () => {
      return axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branch/${selectedBranchId}/manual-company`, manualForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
      toast.success(isDuplicate ? 'Company updated successfully & queued for sync!' : 'Company added successfully & queued for sync!');
      setShowManualModal(false);
      setManualForm({ companyName: '', hrName: '', hrPhone: '', hrEmail: '', linkedinProfile: '' });
      setIsDuplicate(false);
      setIsConflict(false);
    },
    onError: () => toast.error('Failed to save company')
  });

  const logMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const payload = {
        company_id: companyId,
        branch_id: selectedBranchId,
        channel,
        outcome,
        notes,
        created_by: userProfile?.name || 'TPR', // Dynamically set TPR name
        next_contact_date: outcome === 'call_again' ? nextContactDate : undefined
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/contact-logs`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Contact log saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['contact-today', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', selectedBranchId] });
      queryClient.invalidateQueries({ queryKey: ['confirmed', selectedBranchId] });
      setOutcome('');
      setChannel('Phone');
      setNotes('');
      setNextContactDate('');
      setActiveCompanyId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save contact log');
    }
  });

  return (
    <div className={`p-8 max-w-7xl mx-auto space-y-8 ${returnToUnified ? 'mt-12' : ''}`}>
      {returnToUnified && (
        <div className="fixed top-0 left-0 w-full bg-blue-600 shadow-md z-[60] px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <p className="text-white font-medium text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> You are in Deep-Link Mode logging a specific company interaction.
          </p>
          <button 
            onClick={() => router.push('/companies')}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-white/20"
          >
            <X className="w-4 h-4" /> Return to Unified Companies
          </button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Branch Portal</h1>
        <p className="text-slate-500 mt-2">Manage daily outreach and track communications with assigned companies.</p>
      </div>

      {/* Branch Selector & Sync */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div className="w-full max-w-md">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Your Branch</label>
          {branchesLoading || userLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading branches...
            </div>
          ) : (
            <select 
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setActiveView('dashboard');
              }}
              disabled={!isAdmin}
            >
              <option value="">-- Choose Branch --</option>
              {branches?.map((b: any) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
        
        {selectedBranchId && (
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm"
          >
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            Sync All
          </button>
        )}
      </div>

      {/* Dashboard View */}
      {selectedBranchId && activeView === 'dashboard' && (
        <div className="mt-8 space-y-6">
          {/* Dashboard Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-md">
            <button
              onClick={() => setDashboardTab('companies')}
              className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                dashboardTab === 'companies' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Company Operations
            </button>
            <button
              onClick={() => setDashboardTab('api')}
              className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
                dashboardTab === 'api' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              API Configuration
            </button>
          </div>

          {dashboardTab === 'companies' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <PhoneCall className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Contact Today</h3>
                  <p className="text-slate-500 text-sm">Companies scheduled for outreach today or overdue.</p>
                  
                  <div className="mt-6 flex items-baseline gap-2">
                    {listLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">{contactTodayList?.length || 0}</span>
                        <span className="text-slate-500 font-medium">pending</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <button 
                    onClick={() => setActiveView('contact')}
                    disabled={!contactTodayList?.length}
                    className="w-full flex items-center justify-center gap-2 text-blue-600 font-medium hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Confirmed Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Confirmed</h3>
                  <p className="text-slate-500 text-sm">Companies committed to a placement drive.</p>
                  
                  <div className="mt-6 flex items-baseline gap-2">
                    {confirmedLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">{confirmedList?.length || 0}</span>
                        <span className="text-slate-500 font-medium">secured</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <button 
                    onClick={() => setActiveView('confirmed')}
                    disabled={!confirmedList?.length}
                    className="w-full flex items-center justify-center gap-2 text-green-600 font-medium hover:text-green-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Not Confirmed Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Not Confirmed</h3>
                  <p className="text-slate-500 text-sm">Companies that have not committed yet.</p>
                  
                  <div className="mt-6 flex items-baseline gap-2">
                    {notConfirmedLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">{notConfirmedList?.length || 0}</span>
                        <span className="text-slate-500 font-medium">pending</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <button 
                    onClick={() => setActiveView('not_confirmed')}
                    disabled={!notConfirmedList?.length}
                    className="w-full flex items-center justify-center gap-2 text-amber-600 font-medium hover:text-amber-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add New Company Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:col-span-1">
                <div className="p-6 flex-1">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                    <CloudUpload className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Add / Edit Company</h3>
                  <p className="text-slate-500 text-sm">Manually add, update, or bulk import companies into the queue.</p>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 p-4 flex gap-3">
                  <button 
                    onClick={() => setShowManualModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 bg-white border border-indigo-200 rounded-lg py-2 transition-colors shadow-sm"
                  >
                    Manual <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setShowBulkModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 text-white font-medium hover:bg-indigo-700 bg-indigo-600 rounded-lg py-2 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Bulk Excel
                  </button>
                </div>
              </div>

              {/* Previous Year Contact Request Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:col-span-1">
                <div className="p-6 flex-1 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-xl pointer-events-none" />
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4 relative z-10">
                    <History className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1 relative z-10">Previous Year Contacts</h3>
                  <p className="text-slate-500 text-sm relative z-10">Request contact info for past companies.</p>
                  
                  <div className="mt-4 flex flex-col gap-1 relative z-10">
                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Requests Made</span>
                      <span className="text-sm font-bold text-slate-900">{pastRequests?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-xs font-semibold text-emerald-700 uppercase">Contacts Provided</span>
                      <span className="text-sm font-bold text-emerald-700">{pastRequests?.filter((r: any) => r.status === 'approved').length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center bg-red-50 p-2 rounded-lg border border-red-100">
                      <span className="text-xs font-semibold text-red-700 uppercase">Requests Rejected</span>
                      <span className="text-sm font-bold text-red-700">{pastRequests?.filter((r: any) => r.status === 'rejected').length || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <button 
                    onClick={() => setActiveView('previous_requests')}
                    className="w-full flex items-center justify-center gap-2 text-purple-600 font-medium hover:text-purple-800 transition-colors"
                  >
                    Make Request <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <ApiKeyConfig branchId={selectedBranchId} />
            </div>
          )}
        </div>
      )}

      {/* Manual Add Modal */}
      {selectedBranchId && showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <CloudUpload className="w-6 h-6 text-indigo-600" />
                {isDuplicate ? 'Update Company Details' : 'Add New Company'}
              </h2>
              <button 
                onClick={() => {
                  setShowManualModal(false);
                  setManualForm({ companyName: '', hrName: '', hrPhone: '', hrEmail: '', linkedinProfile: '' });
                  setIsDuplicate(false);
                  setIsConflict(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {isConflict && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{conflictMessage}</p>
                </div>
              )}
              {isDuplicate && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">This company is already in your database. Updating the form will overwrite the existing HR details and queue it for syncing.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g. Cloudera"
                    className={`w-full bg-slate-50 border ${isConflict ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : isDuplicate ? 'border-amber-300 focus:ring-amber-500 focus:border-amber-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'} text-slate-900 text-sm rounded-xl p-3.5 transition-all shadow-sm`}
                    value={manualForm.companyName}
                    onChange={(e) => setManualForm({ ...manualForm, companyName: e.target.value })}
                  />
                  {checkingName && <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-slate-400" />}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HR Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={manualForm.hrName}
                    onChange={(e) => setManualForm({ ...manualForm, hrName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HR Phone</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={manualForm.hrPhone}
                    onChange={(e) => setManualForm({ ...manualForm, hrPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HR Email</label>
                <input 
                  type="email" 
                  placeholder="e.g. hr@company.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={manualForm.hrEmail}
                  onChange={(e) => setManualForm({ ...manualForm, hrEmail: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">LinkedIn Profile URL</label>
                <input 
                  type="url" 
                  placeholder="e.g. https://linkedin.com/in/..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl p-3.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  value={manualForm.linkedinProfile}
                  onChange={(e) => setManualForm({ ...manualForm, linkedinProfile: e.target.value })}
                />
                <p className="text-xs text-slate-400 mt-2">LinkedIn profile will be saved securely but will NOT be synced to Google Sheets.</p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => addManualCompanyMutation.mutate()}
                  disabled={!manualForm.companyName || isConflict || addManualCompanyMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {addManualCompanyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                  {isDuplicate ? 'Update & Queue for Sync' : 'Save & Queue for Sync'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBranchId && showBulkModal && (
        <BulkUploadModal 
          branchId={selectedBranchId}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            syncMutation.mutate();
          }}
        />
      )}

      {selectedBranchId && activeView === 'previous_requests' && (
        <PreviousContactsView 
          branchId={selectedBranchId} 
          onBack={() => setActiveView('dashboard')}
        />
      )}

      {/* Contact Details View */}
      {selectedBranchId && (activeView === 'contact' || activeView === 'single_contact') && (
        <div className="mt-8">
          <div className="relative flex items-center justify-center mb-8">
            <button 
              onClick={() => {
                setActiveView(previousView || 'dashboard');
                setActiveCompanyId(null);
              }}
              className="absolute left-0 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow"
            >
              <ArrowLeft className="w-4 h-4" /> 
              Back {previousView === 'dashboard' ? 'to Dashboard' : previousView === 'not_confirmed' ? 'to List' : ''}
            </button>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <PhoneCall className="w-6 h-6 text-blue-600" />
              {activeView === 'single_contact' ? 'Company Contact Details' : 'Contact Action List'}
            </h2>
          </div>

          {activeView !== 'single_contact' && (
            <div className="mb-6 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search companies in this list..." 
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
          )}

          <div className="space-y-6">
            {(() => {
              if (activeView === 'single_contact' && activeCompanyId) {
                const company = [...(contactTodayList||[]), ...(confirmedList||[]), ...(notConfirmedList||[])]
                                 .find(c => c._id === activeCompanyId);
                return company ? [company] : [];
              }
              const list = contactTodayList || [];
              if (!listSearchQuery.trim()) return list;
              return list.filter((c: any) => c.companyName.toLowerCase().includes(listSearchQuery.toLowerCase()));
            })()?.map((company: any) => (
              <div key={company._id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                {/* Company Info & HR */}
                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-900">{company.companyName}</h3>
                  {/* Placement Details Card */}
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Placement Details
                      </h4>
                      {editingPlacementCompanyId === company._id ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingPlacementCompanyId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updatePlacementDetailsMutation.mutate({ companyId: company._id, driveType: editDriveType, academicYear: editAcademicYear })}
                            disabled={updatePlacementDetailsMutation.isPending}
                            className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 px-2.5 py-1.5 rounded-md font-bold transition-colors shadow-sm"
                          >
                            {updatePlacementDetailsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingPlacementCompanyId(company._id);
                            setEditDriveType(company.drive_type || '');
                            setEditAcademicYear(company.academic_year || '');
                          }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-100 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 px-2 py-1 rounded shadow-sm transition-all"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">Academic Year</span>
                        {editingPlacementCompanyId === company._id ? (
                          <input 
                            type="text"
                            value={editAcademicYear}
                            onChange={(e) => setEditAcademicYear(e.target.value)}
                            placeholder="e.g. 2024-25"
                            className="bg-white border border-blue-300 text-sm font-semibold text-slate-800 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm w-full sm:w-32 sm:text-right"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md inline-block">
                            {company.academic_year || 'Not Specified'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">Drive Type</span>
                        {editingPlacementCompanyId === company._id ? (
                          <select 
                            value={editDriveType}
                            onChange={(e) => setEditDriveType(e.target.value)}
                            className="bg-white border border-blue-300 text-sm font-semibold text-slate-800 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm w-full sm:w-auto"
                          >
                            <option value="">Not Specified</option>
                            <option value="Internship">Internship</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Internship + Full-time">Internship + Full-time</option>
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md inline-block">
                            {company.drive_type || 'Not Specified'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">Status</span>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1.5 inline-flex ${
                          company.confirmation_status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' : 
                          company.confirmation_status === 'not_confirmed' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {company.confirmation_status === 'confirmed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {company.confirmation_status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">HR Contacts</h4>
                    <div className="mb-6">
                      {company.hr_contacts?.length > 0 ? (
                        <div className="space-y-4">
                          {company.hr_contacts.map((hr: any) => (
                            <div key={hr._id} className="space-y-3">
                              {hr.pending_update && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                        Background Scan: New Contact Found
                                      </h4>
                                      <p className="text-xs text-indigo-700 mb-3">Review the newly discovered HR contact before updating your database.</p>
                                      
                                      <div className="bg-white/60 rounded-lg p-3 text-xs space-y-1">
                                        <p className="font-semibold text-indigo-900 truncate">{hr.pending_update.name || 'Unknown Name'} <span className="font-normal text-indigo-700 ml-1">({hr.pending_update.designation || 'HR'})</span></p>
                                        {hr.pending_update.email && <p className="text-indigo-800 truncate">📧 {hr.pending_update.email}</p>}
                                        {hr.pending_update.mobile && <p className="text-indigo-800 truncate">📱 {hr.pending_update.mobile}</p>}
                                        {hr.pending_update.linkedin_url && <a href={hr.pending_update.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-block mt-1 truncate max-w-full">🔗 View LinkedIn</a>}
                                      </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                                      <button 
                                        onClick={() => approvePendingMutation.mutate(company._id)}
                                        disabled={approvePendingMutation.isPending}
                                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 text-center"
                                      >
                                        {approvePendingMutation.isPending ? 'Updating...' : 'Accept & Update'}
                                      </button>
                                      <button 
                                        onClick={() => discardPendingMutation.mutate(company._id)}
                                        disabled={discardPendingMutation.isPending}
                                        className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 text-center"
                                      >
                                        Discard
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow relative group">
                                {hr.is_auto_updated && (
                                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-amber-200">
                                    Auto-Updated
                                    <button onClick={() => acknowledgeUpdateMutation.mutate(company._id)} className="hover:bg-amber-200 rounded p-0.5 transition-colors" title="Acknowledge & clear">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0 border border-indigo-100">
                                    {(hr.name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 truncate pr-20 text-base">{hr.name || 'Unknown Name'}</p>
                                    <p className="text-indigo-600 font-medium text-xs mb-3 truncate">{hr.designation || 'Human Resources'}</p>
                                    
                                    <div className="space-y-2 mt-1">
                                      {hr.mobile && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                          <PhoneCall className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                          <div className="flex flex-col gap-0.5">
                                            {hr.mobile.split(',').map((phone: string, i: number) => (
                                              <a key={i} href={`tel:${phone.trim()}`} className="hover:text-indigo-600 transition-colors block truncate">{phone.trim()}</a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {hr.email && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                          <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                          <div className="flex flex-col gap-0.5 min-w-0">
                                            {hr.email.split(',').map((em: string, i: number) => (
                                              <a key={i} href={`mailto:${em.trim()}`} className="hover:text-indigo-600 transition-colors block truncate" title={em.trim()}>{em.trim()}</a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {hr.linkedin_url && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                          <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                          <a href={hr.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate" title={hr.linkedin_url}>
                                            View LinkedIn Profile
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {hr.last_check_status === 'no_changes' && hr.last_checked_at && (
                                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        Last background scan on {new Date(hr.last_checked_at).toLocaleDateString()} found no new updates.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* History Section */}
                              {hr.history && hr.history.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Previous Contacts
                                  </h5>
                                  <div className="space-y-2">
                                    {hr.history.slice().reverse().map((hist: any, index: number) => (
                                      <div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs relative">
                                        <div className="absolute top-2 right-2 text-slate-400 italic" title="Date Replaced">
                                          {new Date(hist.replaced_at).toLocaleDateString()}
                                        </div>
                                        <p className="font-bold text-slate-700">{hist.name || 'Unknown Name'}</p>
                                        <p className="text-slate-500 mb-1">{hist.designation || 'HR'}</p>
                                        {(hist.mobile || hist.email || hist.linkedin_url) && (
                                          <div className="mt-1 space-y-0.5 text-slate-500">
                                            {hist.mobile && <p>📱 {hist.mobile}</p>}
                                            {hist.email && <p>📧 {hist.email}</p>}
                                            {hist.linkedin_url && <a href={hist.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">🔗 LinkedIn</a>}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                          <p className="text-sm text-slate-500 mb-1">No HR contacts found.</p>
                          <p className="text-xs text-slate-400">Click validate below to find contacts.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <ValidateContactButton companyId={company._id} branchId={selectedBranchId} />
                      </div>
                      <div className="flex-1">
                        <ChangeContactDetailsButton 
                          companyId={company._id} 
                          branchId={selectedBranchId}
                          branchName={branches?.find((b: any) => b._id === selectedBranchId)?.name}
                          currentHr={company.hr_contacts?.[0]} 
                          is_verified_by_admin={company.is_verified_by_admin}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline & Actions */}
                <div className="p-6 md:w-2/3 flex flex-col">
                  {/* Log Action Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
                    {activeCompanyId === company._id ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Channel</label>
                            <select 
                              className="w-full bg-white shadow-sm border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition-all" 
                              value={channel} 
                              onChange={(e) => setChannel(e.target.value)}
                            >
                              <option>Phone</option>
                              <option>Email</option>
                              <option>LinkedIn</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Outcome</label>
                            <select 
                              className="w-full bg-white shadow-sm border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition-all" 
                              value={outcome} 
                              onChange={(e) => setOutcome(e.target.value as any)}
                            >
                              <option value="">-- Select --</option>
                              <option value="call_again">Call Again (Reschedule)</option>
                              <option value="brochure_jnf">Brochure + JNF Sent</option>
                              <option value="tpo_talk">Want to talk to TPO</option>
                              <option value="rejected">Rejected / Not Interested</option>
                              <option value="accepted">Accepted / Confirmed</option>
                            </select>
                          </div>
                        </div>

                        {outcome === 'call_again' && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Next Contact Date</label>
                            <input 
                              type="date" 
                              className="w-full bg-white shadow-sm border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition-all" 
                              value={nextContactDate}
                              onChange={(e) => setNextContactDate(e.target.value)}
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                          <textarea 
                            className="w-full bg-white shadow-sm border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition-all placeholder:text-slate-400" 
                            rows={3} 
                            placeholder="Add interaction details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                          <button 
                            onClick={() => {
                              setActiveCompanyId(null);
                              setOutcome('');
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          
                          <div className="flex w-full sm:w-auto gap-3">
                            <button 
                              onClick={() => logMutation.mutate(company._id)}
                              disabled={logMutation.isPending || !outcome || (outcome === 'call_again' && !nextContactDate)}
                              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-500/20 hover:shadow-blue-500/40"
                            >
                              {logMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                              <span className="hidden sm:inline">Save Contact Log</span>
                              <span className="sm:hidden">Save</span>
                            </button>
                            <button 
                              onClick={() => syncMutation.mutate()}
                              disabled={syncMutation.isPending}
                              className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                              {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <CloudUpload className="w-4 h-4 text-slate-400" />}
                              <span className="hidden sm:inline">Sync to Sheet</span>
                              <span className="sm:hidden">Sync</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setActiveCompanyId(company._id);
                          setOutcome('');
                          setNotes('');
                          setNextContactDate('');
                        }}
                        className="w-full bg-white border-2 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 font-medium py-3 rounded-lg transition-colors"
                      >
                        + Add New Contact Log
                      </button>
                    )}
                  </div>
                  
                  {/* View History Button */}
                  <div className="mt-auto pt-4 flex justify-end border-t border-slate-100">
                    <button
                      onClick={() => setHistoryPanelCompany(company)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <History className="w-4 h-4" /> View History ({company.contact_logs?.length || 0})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed List View */}
      {selectedBranchId && activeView === 'confirmed' && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Confirmed Placements
            </h2>
            <button 
              onClick={() => setActiveView('dashboard')}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search confirmed companies..." 
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Drive Type</th>
                  <th className="px-6 py-4">Expected Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(confirmedList || [])
                  .filter((c: any) => !listSearchQuery.trim() || c.companyName.toLowerCase().includes(listSearchQuery.toLowerCase()))
                  .map((company: any) => (
                  <tr key={company._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{company.companyName}</td>
                    <td className="px-6 py-4 text-slate-700">{company.role || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{company.drive_type || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">
                      {company.expected_month || company.expected_year ? 
                        `${company.expected_month || ''} ${company.expected_year || ''}`.trim() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not Confirmed View */}
      {selectedBranchId && activeView === 'not_confirmed' && (
        <div className="mt-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              Not Confirmed Placements
            </h2>
            <button 
              onClick={() => {
                setActiveView('dashboard');
                setActiveCategory(null);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Premium Folder/Nested Category View */}
          {(() => {
            const notContacted = notConfirmedList?.filter((c: any) => !c.contact_status || c.contact_status === 'not_contacted') || [];
            const callAgain = notConfirmedList?.filter((c: any) => c.contact_outcome === 'call_again') || [];
            const pendingResponse = notConfirmedList?.filter((c: any) => c.contact_status === 'contacted' && c.contact_outcome !== 'call_again' && c.contact_outcome !== 'rejected' && c.contact_outcome !== 'accepted') || [];

            if (activeCategory === null) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Not Contacted */}
                  <div 
                    onClick={() => setActiveCategory('not_contacted')}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 w-full h-1 bg-slate-300"></div>
                    <div className="w-16 h-16 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-slate-100">
                      <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide mt-2">Not Contacted</h3>
                    <p className="text-5xl font-black text-slate-900">{notContacted.length}</p>
                    <p className="text-sm text-slate-500 font-semibold flex items-center gap-1 mt-2 group-hover:text-slate-800 transition-colors">View Queue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></p>
                  </div>

                  {/* Card 2: Call Again */}
                  <div 
                    onClick={() => setActiveCategory('call_again')}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-blue-100">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900 uppercase tracking-wide mt-2">Call Again</h3>
                    <p className="text-5xl font-black text-blue-600">{callAgain.length}</p>
                    <p className="text-sm text-blue-500 font-semibold flex items-center gap-1 mt-2 group-hover:text-blue-700 transition-colors">View Queue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></p>
                  </div>

                  {/* Card 3: Pending Response */}
                  <div 
                    onClick={() => setActiveCategory('pending')}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 w-full h-1 bg-amber-500"></div>
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-amber-100">
                      <Clock className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-amber-900 uppercase tracking-wide mt-2">Pending Response</h3>
                    <p className="text-5xl font-black text-amber-600">{pendingResponse.length}</p>
                    <p className="text-sm text-amber-500 font-semibold flex items-center gap-1 mt-2 group-hover:text-amber-700 transition-colors">View Queue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></p>
                  </div>
                </div>
              );
            }

            // Expanded List View
            const activeDataRaw = activeCategory === 'not_contacted' ? notContacted : activeCategory === 'call_again' ? callAgain : pendingResponse;
            const activeData = listSearchQuery.trim() 
              ? activeDataRaw.filter((c: any) => c.companyName.toLowerCase().includes(listSearchQuery.toLowerCase()))
              : activeDataRaw;
            const title = activeCategory === 'not_contacted' ? 'Not Contacted' : activeCategory === 'call_again' ? 'Call Again' : 'Pending Response';

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`p-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  activeCategory === 'not_contacted' ? 'bg-slate-50 border-slate-200' :
                  activeCategory === 'call_again' ? 'bg-blue-50 border-blue-100' :
                  'bg-amber-50 border-amber-100'
                }`}>
                  <h3 className={`text-xl font-bold flex items-center gap-2.5 ${
                    activeCategory === 'not_contacted' ? 'text-slate-800' :
                    activeCategory === 'call_again' ? 'text-blue-900' :
                    'text-amber-900'
                  }`}>
                    {activeCategory === 'not_contacted' && <Users className="w-6 h-6 text-slate-500" />}
                    {activeCategory === 'call_again' && <Calendar className="w-6 h-6 text-blue-600" />}
                    {activeCategory === 'pending' && <Clock className="w-6 h-6 text-amber-600" />}
                    {title} Queue
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border bg-white shadow-sm ${
                      activeCategory === 'not_contacted' ? 'text-slate-600 border-slate-200' :
                      activeCategory === 'call_again' ? 'text-blue-700 border-blue-200' :
                      'text-amber-700 border-amber-200'
                    }`}>
                      {activeData.length} Companies
                    </span>
                  </h3>
                  <button 
                    onClick={() => setActiveCategory(null)}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Categories
                  </button>
                </div>

                <div className="p-4 bg-white border-b border-slate-100">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder={`Search ${title.toLowerCase()} companies...`}
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50/30">
                  <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
                    {activeData.map((company: any) => (
                      <div 
                        key={company._id} 
                        className={`bg-white border rounded-xl p-5 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md ${
                          lastVisitedCompanyId === company._id ? (
                            activeCategory === 'not_contacted' ? 'border-slate-400 ring-4 ring-slate-500/10' :
                            activeCategory === 'call_again' ? 'border-blue-400 ring-4 ring-blue-500/10' :
                            'border-amber-400 ring-4 ring-amber-500/10'
                          ) : (
                            activeCategory === 'not_contacted' ? 'border-slate-200 hover:border-slate-300' :
                            activeCategory === 'call_again' ? 'border-blue-100 hover:border-blue-300' :
                            'border-amber-100 hover:border-amber-300'
                          )
                        }`}
                      >
                        <div className="mb-6">
                          <h4 className="font-bold text-slate-900 text-lg">{company.companyName}</h4>
                          {activeCategory === 'not_contacted' && <p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Priority: {company.placementPriority || 'Standard'}</p>}
                          {activeCategory === 'call_again' && <p className="text-xs text-blue-600 mt-2 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Follow-up: {company.nextFollowupDate ? format(new Date(company.nextFollowupDate), 'MMM d, yyyy') : 'Overdue'}</p>}
                          {activeCategory === 'pending' && <p className="text-xs text-amber-600 mt-2 uppercase tracking-wider font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Status: Awaiting Reply</p>}
                        </div>
                        <button 
                          onClick={() => {
                            setPreviousView(activeView);
                            setLastVisitedCompanyId(company._id);
                            setActiveView('single_contact');
                            setActiveCompanyId(company._id);
                          }}
                          className={`w-full font-semibold py-2.5 rounded-lg transition-colors text-sm border flex items-center justify-center gap-2 ${
                            activeCategory === 'not_contacted' ? 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200' :
                            activeCategory === 'call_again' ? 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-100' :
                            'text-amber-700 bg-amber-50/80 hover:bg-amber-100 border-amber-100'
                          }`}
                        >
                          Contact Details <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {activeData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      {activeCategory === 'not_contacted' && <Users className="w-12 h-12 mb-3 text-slate-300" />}
                      {activeCategory === 'call_again' && <Calendar className="w-12 h-12 mb-3 text-slate-300" />}
                      {activeCategory === 'pending' && <Clock className="w-12 h-12 mb-3 text-slate-300" />}
                      <p className="text-sm font-medium">No companies in this queue.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {/* Slide-over History Panel */}
      {historyPanelCompany && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setHistoryPanelCompany(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{historyPanelCompany.companyName}</h2>
                <p className="text-sm text-slate-500 mt-1">Communication History</p>
              </div>
              <button 
                onClick={() => setHistoryPanelCompany(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {historyPanelCompany.contact_logs?.length > 0 ? (
                <div className="space-y-6">
                  {historyPanelCompany.contact_logs.map((log: any) => (
                    <div key={log._id} className="relative pl-6 pb-6 border-l-2 border-slate-200 last:pb-0 last:border-transparent">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative -top-1">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{format(new Date(log.contact_date), 'MMM d, yyyy h:mm a')}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                            ${log.outcome === 'call_again' ? 'bg-amber-100 text-amber-800' : 
                              log.outcome === 'accepted' ? 'bg-green-100 text-green-800' :
                              log.outcome === 'rejected' ? 'bg-red-100 text-red-800' : 
                              log.outcome === 'brochure_jnf' ? 'bg-purple-100 text-purple-800' :
                              log.outcome === 'tpo_talk' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-slate-100 text-slate-800'}`}
                          >
                            {log.outcome === 'brochure_jnf' ? 'Brochure + JNF' :
                             log.outcome === 'tpo_talk' ? 'TPO Talk' :
                             log.outcome === 'call_again' ? 'Call Again' :
                             log.outcome === 'rejected' ? 'Rejected' :
                             log.outcome === 'accepted' ? 'Accepted' :
                             log.outcome || 'Logged'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 mb-2">
                          <span className="font-semibold text-indigo-600">{log.created_by}</span> logged a <span className="font-semibold">{log.channel}</span> interaction.
                        </p>
                        {log.notes && (
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-600">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <History className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-lg font-bold text-slate-700">No History Yet</p>
                  <p className="text-sm text-slate-500 mt-1">There are no contact logs for this company.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
