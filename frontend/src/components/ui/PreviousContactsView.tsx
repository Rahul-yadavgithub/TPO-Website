import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Search, Building2, CheckCircle2, Save, Users, Calendar, XCircle, ShieldCheck, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface ExtractedContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  isVerified: boolean;
}

function extractAllContacts(company: any): ExtractedContact[] {
  const contacts: ExtractedContact[] = [];
  
  if (company.hrName || company.hrEmail || company.hrPhone) {
    contacts.push({
      id: 'primary',
      name: company.hrName || '',
      email: company.hrEmail || '',
      phone: company.hrPhone || '',
      source: 'Primary Contact',
      isVerified: company.primary_contact_verified || false,
    });
  }
  
  if (company.additionalContacts && Array.isArray(company.additionalContacts)) {
    company.additionalContacts.forEach((ac: any, idx: number) => {
      contacts.push({
        id: `additional-${idx}`,
        name: ac.hrName || '',
        email: ac.hrEmail || '',
        phone: ac.hrPhone || '',
        source: ac.sourceSheet || 'Additional',
        isVerified: ac.isVerified || false,
      });
    });
  }
  
  if (company.extraData) {
    const keys = Object.keys(company.extraData);
    const nameRegex = /^OTHER HR NAME\s*(\d*)$/i;
    
    keys.forEach(key => {
      const match = key.match(nameRegex);
      if (match) {
        const idxStr = match[1] || '';
        const name = company.extraData[key];
        let phone = '';
        let email = '';
        
        const possiblePhoneKeys = [
          `OTHER HR MOBILE ${idxStr}`.trim(),
          `OTHER HR PHONE ${idxStr}`.trim(),
          `OTHER HR NUMBER ${idxStr}`.trim(),
          `OTHER HR CONTACT ${idxStr}`.trim()
        ];
        
        const possibleEmailKeys = [
          `OTHER HR EMAIL ${idxStr}`.trim(),
          `OTHER HR MAIL ${idxStr}`.trim()
        ];
        
        const possibleVerifiedKeys = [
          `OTHER HR VERIFIED ${idxStr}`.trim()
        ];
        
        for (const pk of possiblePhoneKeys) {
          const actualPk = keys.find(k => k.toLowerCase() === pk.toLowerCase());
          if (actualPk) {
            phone = company.extraData[actualPk];
            break;
          }
        }
        
        for (const ek of possibleEmailKeys) {
          const actualEk = keys.find(k => k.toLowerCase() === ek.toLowerCase());
          if (actualEk) {
            email = company.extraData[actualEk];
            break;
          }
        }
        
        let isVerified = false;
        for (const vk of possibleVerifiedKeys) {
          const actualVk = keys.find(k => k.toLowerCase() === vk.toLowerCase());
          if (actualVk) {
            isVerified = String(company.extraData[actualVk]).toLowerCase() === 'true';
            break;
          }
        }
        
        if (name || phone || email) {
          contacts.push({
            id: `extra-${idxStr || '0'}`,
            name: String(name || ''),
            email: String(email || ''),
            phone: String(phone || ''),
            source: 'Extra Data',
            isVerified: isVerified
          });
        }
      }
    });
  }
  
  const uniqueContacts: ExtractedContact[] = [];
  const seen = new Set();
  for (const c of contacts) {
    const key = `${c.name?.trim().toLowerCase()}|${c.email?.trim().toLowerCase()}|${c.phone?.trim().toLowerCase()}`;
    if (!seen.has(key) && (c.name || c.email || c.phone)) {
      seen.add(key);
      uniqueContacts.push(c);
    }
  }
  
  return uniqueContacts;
}

interface PreviousContactsViewProps {
  branchId: string;
  onBack: () => void;
}

export function PreviousContactsView({ branchId, onBack }: PreviousContactsViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'available' | 'my_requests' | 'others_requests'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsSubTab, setMyRequestsSubTab] = useState<'new' | 'existing'>('new');
  
  // Pagination
  const [availablePage, setAvailablePage] = useState(1);
  const [myRequestedPage, setMyRequestedPage] = useState(1);
  const [othersRequestedPage, setOthersRequestedPage] = useState(1);
  
  // Edit State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ hrName: '', hrEmail: '', hrPhone: '' });
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContactIsVerified, setSelectedContactIsVerified] = useState(false);
  const [manualVerifyToggle, setManualVerifyToggle] = useState(false);
  
  // Requesting State
  const [requestingCompanyId, setRequestingCompanyId] = useState<string | null>(null);

  // 1. Fetch Status Counts
  const { data: counts } = useQuery({
    queryKey: ['previous-counts', branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/status-counts?branchId=${branchId}`, { withCredentials: true });
      return res.data.data;
    },
    enabled: !!branchId
  });

  // 2. Fetch Available Companies (Paginated)
  const { data: availableData, isLoading: availableLoading } = useQuery({
    queryKey: ['previous-available', availablePage],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/list?status=not_contacted&page=${availablePage}&limit=10`, { withCredentials: true });
      return res.data;
    }
  });

  // 3. Fetch My Requested Companies (Paginated)
  const { data: myRequestedData, isLoading: myRequestedLoading } = useQuery({
    queryKey: ['previous-my-requested', myRequestedPage, branchId, myRequestsSubTab],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/list?status=my_requests&page=${myRequestedPage}&limit=10&branchId=${branchId}&subTab=${myRequestsSubTab}`, { withCredentials: true });
      return res.data;
    },
    enabled: !!branchId
  });

  // 4. Fetch Others Requested Companies (Paginated)
  const { data: othersRequestedData, isLoading: othersRequestedLoading } = useQuery({
    queryKey: ['previous-others-requested', othersRequestedPage, branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/list?status=others_requests&page=${othersRequestedPage}&limit=10&branchId=${branchId}`, { withCredentials: true });
      return res.data;
    },
    enabled: !!branchId
  });

  // 4. Fetch User's Requests (To check if approved)
  const { data: userRequests } = useQuery({
    queryKey: ['previous-user-requests', branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/requests/${branchId}`, { withCredentials: true });
      return res.data.data; // Array of PreviousCompanyContactRequest
    },
    enabled: !!branchId
  });

  // 5. Search
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['previous-search', searchQuery, activeTab, branchId],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/search?q=${searchQuery}&status=${activeTab}&branchId=${branchId}`, { withCredentials: true });
      return res.data.data;
    },
    enabled: searchQuery.length >= 2
  });

  // Mutations
  const requestContactMutation = useMutation({
    mutationFn: async ({ companyId, companyName }: { companyId: string, companyName: string }) => {
      setRequestingCompanyId(companyId);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/request`, {
        companyId, companyName, branchId
      }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Contact request submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['previous-counts'] });
      queryClient.invalidateQueries({ queryKey: ['previous-available'] });
      queryClient.invalidateQueries({ queryKey: ['previous-my-requested'] });
      queryClient.invalidateQueries({ queryKey: ['previous-others-requested'] });
      queryClient.invalidateQueries({ queryKey: ['previous-user-requests'] });
      setSearchQuery('');
      setRequestingCompanyId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit request');
      setRequestingCompanyId(null);
    }
  });

  
  const { data: currentCompanyDetails, isLoading: isLoadingCurrentCompany } = useQuery({
    queryKey: ['current-company-details', editingCompanyId, branchId],
    queryFn: async () => {
      const company = myRequestedData?.data.find((c: any) => c._id === editingCompanyId);
      if (!company) return null;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/check-name?name=${encodeURIComponent(company.companyName)}&branchId=${branchId}`, { withCredentials: true });
      return res.data;
    },
    enabled: !!editingCompanyId && !!branchId
  });

  const [selectedDataSource, setSelectedDataSource] = useState<'current' | 'previous'>('previous');

  const updateContactMutation = useMutation({
    mutationFn: async ({ companyId, isVerified }: { companyId: string, isVerified: boolean }) => {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${companyId}/contact-info`, {
        ...editForm,
        branchId,
        isVerified
      }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('Contact updated and synced to Current Year!');
      setEditingCompanyId(null);
      queryClient.invalidateQueries({ queryKey: ['previous-my-requested'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update contact');
    }
  });

  const displayAvailable = searchQuery.length >= 2 ? searchResults : availableData?.data;
  const isSearchActive = searchQuery.length >= 2;

  const startEdit = (company: any) => {
    setEditingCompanyId(company._id);
    setEditForm({
      hrName: company.hrName || '',
      hrEmail: company.hrEmail || '',
      hrPhone: company.hrPhone || ''
    });
    setSelectedContactId('primary');
    setSelectedContactIsVerified(company.is_verified_by_admin || false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Previous Contacts</h2>
            <p className="text-sm text-slate-500">Search and request previous year companies.</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('available')}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            activeTab === 'available' ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-slate-200 bg-white hover:border-purple-300'
          }`}
        >
          <div className="text-left">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Available</div>
            <div className="text-xs text-slate-400 mt-0.5">Not Requested Yet</div>
          </div>
          <div className="text-2xl font-black text-slate-800">{counts?.availableCount || 0}</div>
        </button>
        <button 
          onClick={() => setActiveTab('my_requests')}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            activeTab === 'my_requests' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className="text-left">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">My Requests</div>
            <div className="text-xs text-slate-400 mt-0.5">Your Claimed Companies</div>
          </div>
          <div className="text-2xl font-black text-slate-800">{counts?.myCount || 0}</div>
        </button>
        <button 
          onClick={() => setActiveTab('others_requests')}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            activeTab === 'others_requests' ? 'border-slate-500 bg-slate-100 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-left">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Claimed By Others</div>
            <div className="text-xs text-slate-400 mt-0.5">Assigned Elsewhere</div>
          </div>
          <div className="text-2xl font-black text-slate-800">{counts?.othersCount || 0}</div>
        </button>
      </div>

      <div className="p-6 flex-1 bg-white">
        {/* Shared Search Bar */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder={`Search ${activeTab.replace('_', ' ')}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
            />
            {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />}
          </div>
        </div>

        {activeTab === 'available' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search (moved up outside of tab content so it's shared) */}

            {/* List */}
            {availableLoading && !isSearchActive ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {displayAvailable?.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p>No available companies found.</p>
                  </div>
                ) : (
                  displayAvailable?.map((company: any) => (
                    <div key={company._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-300 transition-colors">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {company.companyName}
                          {company.is_verified_by_admin && (
                            <ShieldCheck className="w-5 h-5 text-emerald-500" title="Verified by Admin" />
                          )}
                        </h4>
                      </div>
                      <button 
                        onClick={() => requestContactMutation.mutate({ companyId: company._id, companyName: company.companyName })}
                        disabled={requestContactMutation.isPending}
                        className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {requestContactMutation.isPending && requestingCompanyId === company._id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {!isSearchActive && availableData?.pagination && availableData.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-slate-100">
                <button 
                  disabled={availablePage === 1}
                  onClick={() => setAvailablePage(p => p - 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Page {availablePage} of {availableData.pagination.pages}
                </span>
                <button 
                  disabled={availablePage === availableData.pagination.pages}
                  onClick={() => setAvailablePage(p => p + 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {(activeTab === 'my_requests' || activeTab === 'others_requests') && (() => {
          const isMyTab = activeTab === 'my_requests';
          const currentLoading = isMyTab ? myRequestedLoading : othersRequestedLoading;
          const currentData = isMyTab ? myRequestedData : othersRequestedData;
          const currentPage = isMyTab ? myRequestedPage : othersRequestedPage;
          const setPage = isMyTab ? setMyRequestedPage : setOthersRequestedPage;

          
          let displayData = isSearchActive ? searchResults : currentData?.data;
          // Filtering is now handled on the backend so pagination works correctly


          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {currentLoading && !isSearchActive ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
              ) : (
                <div className="flex flex-col w-full">
                  {isMyTab && (
                    <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
                      <button 
                        onClick={() => {
                          setMyRequestsSubTab('new');
                          setMyRequestedPage(1);
                        }}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${myRequestsSubTab === 'new' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        New Companies
                      </button>
                      <button 
                        onClick={() => {
                          setMyRequestsSubTab('existing');
                          setMyRequestedPage(1);
                        }}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${myRequestsSubTab === 'existing' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Existing Companies
                      </button>
                    </div>
                  )}
                  <div className="space-y-4">
                  {displayData?.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <p>No companies found in this section.</p>
                    </div>
                  ) : (
                    displayData?.map((company: any) => {
                      const isMyRequest = company.contactedByBranchId === branchId;
                      const myReqDoc = userRequests?.find((r: any) => r.companyId === company._id);
                      const isApproved = isMyRequest && myReqDoc?.status === 'approved';
                    const isEditing = editingCompanyId === company._id;

                    return (
                      <div key={company._id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4">
                          <div className="w-full sm:w-auto">
                            <h4 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                              {company.companyName}
                              {company.is_verified_by_admin && (
                                <ShieldCheck className="w-6 h-6 text-emerald-500" title="Verified by Admin" />
                              )}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                isMyRequest ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                Requested by: {company.contactedByTprName || company.contactedByBranchName}
                              </span>
                              {company.updatedByTprName && (
                                <span className="text-xs font-semibold px-2 py-1 rounded-md bg-purple-100 text-purple-700">
                                  Last updated by: {company.updatedByTprName}
                                </span>
                              )}
                              {isMyRequest && myReqDoc && (
                                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                                  myReqDoc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  myReqDoc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  Status: {myReqDoc.status.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {isApproved && !isEditing && (
                            <button 
                              onClick={() => startEdit(company)}
                              className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-sm text-center"
                            >
                              Update & Sync
                            </button>
                          )}
                        </div>

                        {/* View Mode Details */}
                        {!isEditing && (company.hrName || company.hrEmail || company.hrPhone) && (
                          <div className="bg-slate-50 p-4 rounded-lg mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">HR Name</p>
                              <p className="text-sm font-medium text-slate-900">{company.hrName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                              <p className="text-sm font-medium text-slate-900">{company.hrEmail || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                              <p className="text-sm font-medium text-slate-900">{company.hrPhone || 'N/A'}</p>
                            </div>
                          </div>
                        )}

                        {/* Rejection Reason block */}
                        {isMyRequest && myReqDoc?.status === 'rejected' && myReqDoc.rejectionReason && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-red-900 mb-1">Request Rejected</p>
                              <p className="text-sm text-red-700">{myReqDoc.rejectionReason}</p>
                            </div>
                          </div>
                        )}

                        {/* Edit Mode Form */}
                        {isEditing && (() => {
                          const availableContacts = extractAllContacts(company).sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0));
                          
                          return (
                          <div className="bg-blue-50 p-5 rounded-xl mt-4 border border-blue-100">
                            <h5 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              Select & Update Contact Details
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                              {availableContacts.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setSelectedContactId(c.id);
                                    setSelectedContactIsVerified(c.isVerified);
                                    setEditForm({ hrName: c.name, hrEmail: c.email, hrPhone: c.phone });
                                  }}
                                  className={`p-3 rounded-lg border text-left transition-all ${selectedContactId === c.id ? 'border-blue-500 bg-blue-100/50 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{c.name || 'No Name'}</span>
                                    {c.isVerified && (
                                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3" /> Verified
                                      </span>
                                    )}
                                  </div>
                                  {c.phone && <div className="text-xs text-slate-600 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {c.phone}</div>}
                                  {c.email && <div className="text-xs text-slate-600 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {c.email}</div>}
                                  <div className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">Source: {c.source}</div>
                                </button>
                              ))}
                              
                              <button
                                onClick={() => {
                                  setSelectedContactId('custom');
                                  setSelectedDataSource('previous');
                                  setEditForm({ hrName: '', hrEmail: '', hrPhone: '' });
                                }}
                                className={`p-3 rounded-lg border text-left flex flex-col items-center justify-center transition-all min-h-[100px] ${selectedContactId === 'custom' ? 'border-blue-500 bg-blue-100/50 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                              >
                                <span className="font-semibold text-slate-700 text-sm mb-1">+ Custom Entry</span>
                                <span className="text-xs text-slate-500 text-center">Enter new contact details manually</span>
                              </button>
                            </div>

                            {company.existsInCurrentYear && !selectedContactIsVerified && currentCompanyDetails?.hrContact ? (
                              <div className="mb-6 space-y-4">
                                <h6 className="text-sm font-bold text-slate-700">Compare Contact Details</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  
                                  {/* Current Database Data */}
                                  <div 
                                    onClick={() => {
                                      setSelectedDataSource('current');
                                      setEditForm({ hrName: currentCompanyDetails.hrContact.name || '', hrEmail: currentCompanyDetails.hrContact.email || '', hrPhone: currentCompanyDetails.hrContact.mobile || '' });
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedDataSource === 'current' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-200 bg-white'}`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <input type="radio" checked={selectedDataSource === 'current'} onChange={() => {}} className="text-emerald-600 focus:ring-emerald-500" />
                                      <span className="font-bold text-slate-800 text-sm">Your Database Data</span>
                                    </div>
                                    <div className="space-y-1 ml-6 text-sm text-slate-600">
                                      <p><span className="font-semibold text-slate-700">Name:</span> {currentCompanyDetails.hrContact.name || 'N/A'}</p>
                                      <p><span className="font-semibold text-slate-700">Email:</span> {currentCompanyDetails.hrContact.email || 'N/A'}</p>
                                      <p><span className="font-semibold text-slate-700">Phone:</span> {currentCompanyDetails.hrContact.mobile || 'N/A'}</p>
                                    </div>
                                  </div>

                                  {/* Previous Year Data */}
                                  <div 
                                    onClick={() => {
                                      setSelectedDataSource('previous');
                                      const prevContact = availableContacts.find(c => c.id === selectedContactId);
                                      if (prevContact) {
                                        setEditForm({ hrName: prevContact.name, hrEmail: prevContact.email, hrPhone: prevContact.phone });
                                      }
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedDataSource === 'previous' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-200 bg-white'}`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <input type="radio" checked={selectedDataSource === 'previous'} onChange={() => {}} className="text-blue-600 focus:ring-blue-500" />
                                      <span className="font-bold text-slate-800 text-sm">Upcoming Data</span>
                                    </div>
                                    <div className="space-y-1 ml-6 text-sm text-slate-600">
                                      {(() => {
                                        const pc = availableContacts.find(c => c.id === selectedContactId);
                                        return (
                                          <>
                                            <p><span className="font-semibold text-slate-700">Name:</span> {pc?.name || 'N/A'}</p>
                                            <p><span className="font-semibold text-slate-700">Email:</span> {pc?.email || 'N/A'}</p>
                                            <p><span className="font-semibold text-slate-700">Phone:</span> {pc?.phone || 'N/A'}</p>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                </div>
                              </div>
                            ) : (
                              <div className="bg-white p-4 rounded-xl border border-blue-100">
                                <h6 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
                                  Final Details to Save
                                  {selectedContactIsVerified && <span className="ml-2 text-emerald-600 lowercase normal-case font-normal">(Verified - Cannot edit)</span>}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">HR Name</label>
                                    <input 
                                      type="text"
                                      value={editForm.hrName}
                                      onChange={e => setEditForm({...editForm, hrName: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={`w-full p-2 border border-slate-300 rounded-lg text-sm ${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                    <input 
                                      type="email"
                                      value={editForm.hrEmail}
                                      onChange={e => setEditForm({...editForm, hrEmail: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={`w-full p-2 border border-slate-300 rounded-lg text-sm ${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                    <input 
                                      type="text"
                                      value={editForm.hrPhone}
                                      onChange={e => setEditForm({...editForm, hrPhone: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={`w-full p-2 border border-slate-300 rounded-lg text-sm ${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}`}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                                  {!selectedContactIsVerified && (
                                    <div className="flex items-center">
                                      <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors">
                                        <input 
                                          type="checkbox"
                                          checked={manualVerifyToggle}
                                          onChange={e => setManualVerifyToggle(e.target.checked)}
                                          className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-emerald-800">Mark contact as verified</span>
                                      </label>
                                    </div>
                                  )}
                                  <div className="flex gap-2 ml-auto">
                                  <button 
                                    onClick={() => setEditingCompanyId(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => updateContactMutation.mutate({ companyId: company._id, isVerified: selectedContactIsVerified || manualVerifyToggle })}
                                    disabled={updateContactMutation.isPending}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    {updateContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {company.existsInCurrentYear ? 'Replace & Sync' : 'Save & Sync'}
                                  </button>
                              </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>
                </div>
            )}

            {/* Pagination Controls */}
            {!isSearchActive && currentData?.pagination && currentData.pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-slate-100">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Page {currentPage} of {currentData.pagination.pages}
                </span>
                <button 
                  disabled={currentPage === currentData.pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        );
      })()}
      </div>
    </div>
  );
}
