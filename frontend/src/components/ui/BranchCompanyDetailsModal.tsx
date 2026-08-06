import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { X, CheckCircle2, Loader2, Calendar, PhoneCall, Mail, User, History, GitMerge, ShieldAlert, Edit2, Save, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BranchCompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  pendingDuplicateData?: any;
  onAssignComplete?: () => void;
}

export function BranchCompanyDetailsModal({ isOpen, onClose, company, pendingDuplicateData, onAssignComplete }: BranchCompanyDetailsModalProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showInteractionPanel, setShowInteractionPanel] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(!!pendingDuplicateData);
  const [isEditingPlacement, setIsEditingPlacement] = useState(false);
  const [editDriveType, setEditDriveType] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('');

  const [localCompany, setLocalCompany] = useState(company);

  useEffect(() => {
    setLocalCompany(company);
  }, [company]);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${company._id}/verify`, {}, { withCredentials: true });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Company verified successfully!');
      queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to verify company');
    }
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    }
  });

  const { data: externalInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['external-insights', company?._id],
    queryFn: async () => {
      if (!company?._id) return null;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/${company._id}/external-insights`, { withCredentials: true });
      return res.data?.data;
    },
    enabled: isOpen && !!company?._id
  });

  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignProgram, setAssignProgram] = useState('');
  
  const [assignMode, setAssignMode] = useState<'branch' | 'tpo'>('branch');
  const [assignTpoType, setAssignTpoType] = useState<'Faculty' | 'Staff' | ''>('');
  const [assignTpoName, setAssignTpoName] = useState('');

  const { data: activeTpos } = useQuery({
    queryKey: ['active-tpos'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tpos/active`, { withCredentials: true });
      return res.data;
    }
  });

  const facultyTpos = activeTpos?.filter((t: any) => t.type === 'Faculty') || [];
  const staffTpos = activeTpos?.filter((t: any) => t.type === 'Staff') || [];

  const assignMutation = useMutation({
    mutationFn: async () => {
      const payload = assignMode === 'branch' 
        ? {
            branch_id: assignBranchId,
            program: assignProgram,
            extractedData: pendingDuplicateData || null
          }
        : {
            tpoType: assignTpoType,
            assignedTPO: assignTpoName,
            extractedData: pendingDuplicateData || null
          };
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/companies/${company._id}/override-assign`, payload, { withCredentials: true });
      return res.data;
    },
    onSuccess: () => {
      toast.success(pendingDuplicateData ? 'Company overridden and assigned successfully!' : 'Assignment updated successfully!');
      
      if (assignMode === 'branch') {
        const branchName = branches?.find((b: any) => b._id === assignBranchId)?.name;
        if (branchName) {
          setLocalCompany({ ...localCompany, assignedBranch: branchName, program: assignProgram || localCompany.program });
        }
      } else {
        setLocalCompany({ ...localCompany, assignedTPO: assignTpoName, tpoType: assignTpoType });
      }

      queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
      
      if (pendingDuplicateData && onAssignComplete) {
        onAssignComplete();
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to assign branch');
    }
  });

  const updatePlacementDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${company._id}/placement-details`, {
        drive_type: editDriveType,
        academic_year: editAcademicYear
      }, { withCredentials: true });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Placement details updated!');
      setIsEditingPlacement(false);
      queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
    },
    onError: () => {
      toast.error('Failed to update placement details');
    }
  });

  if (!isOpen || !company) return null;

  const hrContacts = [
    ...(company.hr_contacts || []),
    ...(company.additionalContacts || []).map((ac: any, idx: number) => ({
      _id: ac._id || `addl-${idx}`,
      name: ac.hrName || 'Unknown Name',
      email: ac.hrEmail,
      mobile: ac.hrPhone,
      designation: 'Additional HR (From Sheet)',
      is_additional: true,
      is_verified: ac.isVerified,
      is_incorrect: ac.isFlagged
    }))
  ];
  const contactLogs = company.contact_logs || [];
  
  const latestLog = contactLogs.length > 0 ? contactLogs.reduce((latest: any, current: any) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  }, contactLogs[0]) : null;
  const callingStatus = latestLog?.outcome;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start sm:items-center justify-between bg-slate-50 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                <span className="truncate">{company.companyName}</span>
                {company.is_verified_by_admin && (
                  <span title="Verified by Admin" className="flex">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </span>
                )}
                {callingStatus && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider
                    ${callingStatus === 'call_again' ? 'bg-amber-100 text-amber-800' : 
                      callingStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                      callingStatus === 'rejected' ? 'bg-red-100 text-red-800' : 
                      callingStatus === 'brochure_jnf' ? (company.emailDeliveryStatus === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800') :
                      callingStatus === 'tpo_talk' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-slate-100 text-slate-800'}`}
                  >
                    {callingStatus === 'brochure_jnf' && company.emailDeliveryStatus === 'sent' ? <CheckCircle2 className="w-3 h-3" /> : <PhoneCall className="w-3 h-3" />}
                    {callingStatus === 'brochure_jnf' ? (company.emailDeliveryStatus === 'sent' ? 'Brochure Sent' : 'Brochure + JNF') :
                     callingStatus === 'tpo_talk' ? 'TPO Talk' :
                     callingStatus === 'call_again' ? 'Call Again' :
                     callingStatus === 'rejected' ? 'Rejected' :
                     callingStatus === 'accepted' ? 'Accepted' :
                     callingStatus}
                  </span>
                )}
                {pendingDuplicateData && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    <ShieldAlert className="w-3 h-3" /> Duplicate Found
                  </span>
                )}
              </h2>
              {company.academic_year && (
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    <Calendar className="w-3.5 h-3.5" /> Visited: {company.academic_year}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">Branch: <span className="font-semibold text-slate-700">{company.assignedBranch}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0 self-start sm:self-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Assignment & Routing Section (Fold-in/Fold-out) */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${pendingDuplicateData ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'} ${isAssignOpen ? 'space-y-4' : ''}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${pendingDuplicateData ? 'text-amber-800' : 'text-indigo-800'}`}>
                  {pendingDuplicateData ? <ShieldAlert className="w-4 h-4" /> : <GitMerge className="w-4 h-4" />}
                  {pendingDuplicateData ? 'Resolve Duplicate & Assign' : 'Assignment & Routing'}
                </h3>
                {isAssignOpen && (
                  <p className={`text-xs mt-1 transition-opacity duration-300 ${pendingDuplicateData ? 'text-amber-700' : 'text-indigo-600'}`}>
                    {pendingDuplicateData 
                      ? 'This company already exists. Select a branch or TPO and click Override to update its HR details with your new AI extraction and assign it.'
                      : 'Assign this company to a Branch TPR or a TPO (Faculty/Staff). A company can be assigned to both simultaneously for shared outreach.'}
                  </p>
                )}
              </div>
              <button 
                onClick={() => setIsAssignOpen(!isAssignOpen)}
                className={`shrink-0 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 ${
                  isAssignOpen 
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600'
                }`}
              >
                {isAssignOpen ? 'Close' : 'Assign'}
              </button>
            </div>
            
            {isAssignOpen && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 pt-2">
                <div className="flex gap-2 bg-white/50 p-1 rounded-lg border border-slate-200 mb-1 w-fit">
              <button
                onClick={() => setAssignMode('branch')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${assignMode === 'branch' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Assign to Branch
              </button>
              <button
                onClick={() => setAssignMode('tpo')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${assignMode === 'tpo' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Assign to TPO
              </button>
            </div>

            {assignMode === 'branch' ? (
              <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
                <select 
                  value={assignProgram}
                  onChange={(e) => {
                    setAssignProgram(e.target.value);
                    setAssignBranchId('');
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[140px]"
                >
                  <option value="" disabled>Select Course...</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                </select>
                <select 
                  value={assignBranchId}
                  onChange={(e) => setAssignBranchId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[140px]"
                >
                  <option value="" disabled>Select Branch...</option>
                  {assignProgram === 'M.Tech' ? (
                    ['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE'].map(name => {
                      const branch = branches?.find((b: any) => b.name === name);
                      if (branch) return <option key={branch._id} value={branch._id}>{branch.name}</option>;
                      return null;
                    })
                  ) : (
                    branches
                      ?.filter((b: any) => b.name !== 'Central Admin')
                      .filter((b: any) => {
                        if (assignProgram === 'B.Tech') {
                          return !b.name.toLowerCase().includes('m.tech') && !b.name.toLowerCase().includes('mtech');
                        }
                        return true;
                      })
                      .map((b: any) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))
                  )}
                </select>
                <button
                  onClick={() => assignMutation.mutate()}
                  disabled={!assignBranchId || !assignProgram || assignMutation.isPending}
                  className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                    pendingDuplicateData 
                      ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300' 
                      : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
                  }`}
                >
                  {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {pendingDuplicateData ? 'Override & Assign' : 'Assign Now'}
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
                <select
                  value={assignTpoType}
                  onChange={(e) => {
                    setAssignTpoType(e.target.value as 'Faculty' | 'Staff');
                    setAssignTpoName('');
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[140px]"
                >
                  <option value="" disabled>Select Category...</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Staff">Staff</option>
                </select>
                <select
                  value={assignTpoName}
                  onChange={(e) => setAssignTpoName(e.target.value)}
                  disabled={!assignTpoType}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[140px] disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="" disabled>Select Name...</option>
                  {assignTpoType === 'Faculty' && facultyTpos.map((t: any) => <option key={t._id} value={t.name}>{t.name}</option>)}
                  {assignTpoType === 'Staff' && staffTpos.map((t: any) => <option key={t._id} value={t.name}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => assignMutation.mutate()}
                  disabled={!assignTpoType || !assignTpoName || assignMutation.isPending}
                  className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                    pendingDuplicateData 
                      ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300' 
                      : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300'
                  }`}
                >
                  {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {pendingDuplicateData ? 'Override & Assign' : 'Assign Now'}
                </button>
              </div>
            )}
              </div>
            )}
          </div>

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" /> 
                TPR Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">POC TPR:</span>
                  <span className="font-semibold text-slate-900">{localCompany.contactOwner && localCompany.contactOwner !== 'Unknown' ? localCompany.contactOwner : 'N/A'}</span>
                </div>
                {(localCompany.assignedTPO || localCompany.tpoType) && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">POC TPO:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{localCompany.assignedTPO || 'N/A'} {localCompany.tpoType ? `(${localCompany.tpoType})` : ''}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-500">Assigned Branch:</span>
                  <span className="font-semibold text-slate-900">{localCompany.assignedBranch}</span>
                </div>
                {localCompany.program && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Course / Program:</span>
                    <span className="font-semibold text-slate-900">{localCompany.program}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm relative group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" /> 
                  Placement Details
                </h3>
                {isEditingPlacement ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditingPlacement(false)}
                      className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => updatePlacementDetailsMutation.mutate()}
                      disabled={updatePlacementDetailsMutation.isPending}
                      className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 px-2 py-1 rounded-md font-bold transition-colors"
                    >
                      {updatePlacementDetailsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsEditingPlacement(true);
                      setEditDriveType(company.drive_type || '');
                      setEditAcademicYear(company.academic_year || '');
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-100 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 px-2 py-1 rounded shadow-sm transition-all"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Academic Year:</span>
                  {isEditingPlacement ? (
                    <input
                      type="text"
                      value={editAcademicYear}
                      onChange={(e) => setEditAcademicYear(e.target.value)}
                      placeholder="e.g. 2024-25"
                      className="bg-white border border-indigo-300 text-sm font-semibold text-slate-800 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-sm w-32 text-right"
                    />
                  ) : (
                    <span className="font-semibold text-slate-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">{company.academic_year || 'Not Specified'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Drive Type:</span>
                  {isEditingPlacement ? (
                    <select 
                      value={editDriveType}
                      onChange={(e) => setEditDriveType(e.target.value)}
                      className="bg-white border border-indigo-300 text-sm font-semibold text-slate-800 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-sm"
                    >
                      <option value="">Not Specified</option>
                      <option value="Internship">Internship</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Internship + Full-time">Internship + Full-time</option>
                    </select>
                  ) : (
                    <span className="font-semibold text-slate-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">{company.drive_type || 'Not Specified'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Platform Insights */}
          {(loadingInsights || externalInsights?.currentYear || externalInsights?.pastYear) && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-indigo-600" /> Platform Insights
              </h3>
              {loadingInsights ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">External Drive Status:</span>
                    <span className="font-bold text-slate-900 bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">{externalInsights?.driveStatus || 'Unknown'}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {/* Current Year (Dynamic) */}
                    {(externalInsights?.currentYear || externalInsights?.rawExternalData) && (
                      <div className="bg-white border border-indigo-200 p-3 rounded-lg shadow-sm">
                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider">Current Year (Platform)</h4>
                        <div className="space-y-1 text-sm">
                          {externalInsights.currentYear && (
                            <>
                              {externalInsights.currentYear.ctc && <p className="flex justify-between"><span className="text-slate-500">CTC:</span> <span className="font-semibold text-slate-800">{externalInsights.currentYear.ctc}</span></p>}
                              {externalInsights.currentYear.eligibleBranches?.length > 0 && <p className="flex justify-between"><span className="text-slate-500">Branches:</span> <span className="font-semibold text-slate-800 text-right">{externalInsights.currentYear.eligibleBranches.join(', ')}</span></p>}
                            </>
                          )}
                          {externalInsights.rawExternalData && Object.entries(externalInsights.rawExternalData).map(([key, value]) => {
                            // Format key (e.g., 'drive_type' -> 'Drive Type', 'onCampus' -> 'On Campus')
                            const formattedKey = key
                              .replace(/([A-Z])/g, ' $1') // insert a space before all caps
                              .replace(/_/g, ' ') // replace underscores with spaces
                              .replace(/^./, str => str.toUpperCase()) // capitalize the first letter
                              .trim();
                            
                            // Format value
                            let formattedValue = String(value);
                            if (Array.isArray(value)) formattedValue = value.join(', ');
                            else if (typeof value === 'boolean') formattedValue = value ? 'Yes' : 'No';
                            else if (typeof value === 'object' && value !== null) formattedValue = JSON.stringify(value);

                            return (
                              <p key={key} className="flex justify-between gap-4">
                                <span className="text-slate-500 shrink-0">{formattedKey}:</span> 
                                <span className="font-semibold text-slate-800 text-right break-words">{formattedValue}</span>
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Past Year */}
                    {externalInsights?.pastYear && (
                      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm opacity-90">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">Past Year (Local DB)</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex justify-between"><span className="text-slate-500">CTC:</span> <span className="font-semibold text-slate-800">{externalInsights.pastYear.ctc || 'N/A'}</span></p>
                          <p className="flex justify-between gap-4"><span className="text-slate-500 shrink-0">Branches:</span> <span className="font-semibold text-slate-800 text-right">{externalInsights.pastYear.eligibleBranches?.join(', ') || 'N/A'}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Information (from Extra Data) */}
          {company.extraData && Object.keys(company.extraData).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Additional Information</h3>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {Object.entries(company.extraData)
                  .filter(([k]) => {
                    const isHrContact = /^OTHER HR NAME\s*(\d*)$/i.test(k) || 
                                        /^OTHER HR EMAIL\s*(\d*)$/i.test(k) || /^OTHER HR MAIL\s*(\d*)$/i.test(k) || 
                                        /^OTHER HR MOBILE\s*(\d*)$/i.test(k) || /^OTHER HR PHONE\s*(\d*)$/i.test(k) || /^OTHER HR NUMBER\s*(\d*)$/i.test(k) || 
                                        /^OTHER HR VERIFIED\s*(\d*)$/i.test(k) || 
                                        /^OTHER HR FLAGGED\s*(\d*)$/i.test(k);
                    return !isHrContact;
                  })
                  .map(([key, value], idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-1 sm:gap-4 p-4 hover:bg-slate-50/30 transition-colors">
                    <div className="w-full sm:w-1/3 font-medium text-slate-600 text-sm">
                      {key}
                    </div>
                    <div className="w-full sm:flex-1 text-slate-900 text-sm whitespace-pre-wrap break-words bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border border-slate-100 sm:border-transparent">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HR Contacts */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-indigo-600" /> HR Contacts
            </h3>
            {hrContacts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hrContacts.map((hr: any) => (
                  <div key={hr._id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                    <div className="flex flex-wrap items-center gap-2 mb-2 justify-end w-full">
                      {(hr.is_additional && !hr.is_incorrect) && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-blue-200">
                          Additional Contact
                        </div>
                      )}
                      {(hr.is_verified && !hr.is_incorrect) && (
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </div>
                      )}
                      {hr.is_incorrect && (
                        <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-red-200">
                          <ShieldAlert className="w-3 h-3" /> Incorrect
                        </div>
                      )}
                    </div>
                    <div className="pr-12 sm:pr-24 min-w-0">
                      <p className="font-bold text-slate-900 truncate min-w-0">{hr.name || 'Unknown'}</p>
                      <p className="text-xs text-indigo-600 font-medium mb-2 truncate min-w-0">{hr.designation || 'HR'}</p>
                    </div>
                    {!hr.is_incorrect ? (
                      <div className="space-y-1 mt-1">
                        {hr.mobile && <p className="text-sm text-slate-600 flex items-center gap-2 min-w-0"><PhoneCall className="w-3 h-3 shrink-0" /> <span className="truncate w-full">{hr.mobile}</span></p>}
                        {hr.email && <p className="text-sm text-slate-600 flex items-center gap-2 min-w-0"><Mail className="w-3 h-3 shrink-0" /> <span className="truncate w-full" title={hr.email}>{hr.email}</span></p>}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-900 font-medium">
                        Contact details not correct
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No HR contacts available.</p>
            )}
          </div>

          {/* View Interactions Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowInteractionPanel(true)}
              className="w-full py-3.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <History className="w-5 h-5" /> View Interaction History ({contactLogs.length})
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          {!company.is_verified_by_admin && (
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {verifyMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Verify Now
            </button>
          )}
        </div>
      </div>

      {/* Slide-over Panel for Interaction History */}
      {showInteractionPanel && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/20 z-[60] backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setShowInteractionPanel(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> Interactions
              </h2>
              <button onClick={() => setShowInteractionPanel(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {contactLogs.length > 0 ? (
                // Sort logs by newest first
                [...contactLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((log: any) => {
                  const isTpoLog = !!log.tpo_name;
                  const canViewFullLog = !isTpoLog || log.show_to_tpr;

                  return (
                  <div key={log._id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    {canViewFullLog ? (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{log.created_by}</p>
                            <p className="text-xs font-medium text-slate-500">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</p>
                          </div>
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
                        <div className="mt-3">
                          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{log.notes || 'No notes provided.'}</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <p className="text-xs font-medium text-slate-500 mb-2">{format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}</p>
                          <p className="text-sm text-slate-800">
                            This company was called by TPO Staff <span className="font-semibold text-indigo-600">{log.tpo_name}</span>.
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                          TPO Call
                        </span>
                      </div>
                    )}
                  </div>
                )})
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <History className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No interaction history found.</p>
                  <p className="text-xs text-slate-400 mt-1">Be the first to log a contact!</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              <button 
                onClick={() => {
                  const url = `/branch-portal?branchName=${encodeURIComponent(company.assignedBranch)}&companyId=${company._id}&view=single_contact&returnTo=unified`;
                  router.push(url);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                + Add New Log
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
