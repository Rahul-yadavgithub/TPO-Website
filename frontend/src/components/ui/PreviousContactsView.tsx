import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Search, Building2, CheckCircle2, Save, Users, Calendar, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PreviousContactsViewProps {
  branchId: string;
  onBack: () => void;
}

export function PreviousContactsView({ branchId, onBack }: PreviousContactsViewProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'available' | 'my_requests' | 'others_requests'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [availablePage, setAvailablePage] = useState(1);
  const [myRequestedPage, setMyRequestedPage] = useState(1);
  const [othersRequestedPage, setOthersRequestedPage] = useState(1);
  
  // Edit State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ hrName: '', hrEmail: '', hrPhone: '' });
  
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
    queryKey: ['previous-my-requested', myRequestedPage, branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/list?status=my_requests&page=${myRequestedPage}&limit=10&branchId=${branchId}`, { withCredentials: true });
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
    queryKey: ['previous-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/search?q=${searchQuery}&status=not_contacted`, { withCredentials: true });
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

  const updateContactMutation = useMutation({
    mutationFn: async (companyId: string) => {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${companyId}/contact-info`, {
        ...editForm,
        branchId
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
        {activeTab === 'available' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search available previous companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
              />
              {searchLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />}
            </div>

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
                        <h4 className="font-bold text-slate-800 text-lg">{company.companyName}</h4>
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

          return (
            <div className="space-y-6 max-w-4xl mx-auto">
              {currentLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {currentData?.data?.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <p>No companies found in this section.</p>
                    </div>
                  ) : (
                    currentData?.data?.map((company: any) => {
                      const isMyRequest = company.contactedByBranchId === branchId;
                      const myReqDoc = userRequests?.find((r: any) => r.companyId === company._id);
                      const isApproved = isMyRequest && myReqDoc?.status === 'approved';
                    const isEditing = editingCompanyId === company._id;

                    return (
                      <div key={company._id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4">
                          <div className="w-full sm:w-auto">
                            <h4 className="font-bold text-slate-800 text-xl">{company.companyName}</h4>
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
                        {isEditing && (
                          <div className="bg-blue-50 p-5 rounded-xl mt-4 border border-blue-100">
                            <h5 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              Update Approved Contact Details
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">HR Name</label>
                                <input 
                                  type="text"
                                  value={editForm.hrName}
                                  onChange={e => setEditForm({...editForm, hrName: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                <input 
                                  type="email"
                                  value={editForm.hrEmail}
                                  onChange={e => setEditForm({...editForm, hrEmail: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                <input 
                                  type="text"
                                  value={editForm.hrPhone}
                                  onChange={e => setEditForm({...editForm, hrPhone: e.target.value})}
                                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={() => setEditingCompanyId(null)}
                                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => updateContactMutation.mutate(company._id)}
                                  disabled={updateContactMutation.isPending}
                                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                                >
                                  {updateContactMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  {company.existsInCurrentYear ? 'Replace & Sync' : 'Save & Sync'}
                                </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {currentData?.pagination && currentData.pagination.pages > 1 && (
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
