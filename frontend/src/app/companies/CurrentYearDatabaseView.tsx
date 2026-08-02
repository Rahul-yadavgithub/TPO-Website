'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Building2, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  RefreshCcw,
  Loader2,
  PhoneCall,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function CurrentYearDatabaseView() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [programFilter, setProgramFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [tprFilter, setTprFilter] = useState('');
  const [tpoTypeFilter, setTpoTypeFilter] = useState('');
  const [tpoNameFilter, setTpoNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch Branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    }
  });

  // Fetch Active TPRs
  const { data: tprs = [] } = useQuery({
    queryKey: ['active-tprs'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tprs/active`, { withCredentials: true });
      return res.data;
    }
  });

  // Fetch Active TPOs
  const { data: tpos = [] } = useQuery({
    queryKey: ['active-tpos'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tpos/active`, { withCredentials: true });
      return res.data;
    }
  });

  // Fetch Companies
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tpr-current-year-db', page, search, programFilter, branchFilter, tprFilter, tpoTypeFilter, tpoNameFilter, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 20 };
      
      if (search) params.search = search;
      if (programFilter) params.program = programFilter;
      if (branchFilter) {
        const b = branches.find((br: any) => br._id === branchFilter);
        if (b) params.branch = b.name;
      }
      if (tprFilter) params.contactOwner = tprFilter;
      if (tpoTypeFilter) params.tpoType = tpoTypeFilter;
      if (tpoNameFilter) params.assignedTPO = tpoNameFilter;
      if (statusFilter) params.contact_outcome = statusFilter;

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/branch-overview`, { 
        params,
        withCredentials: true 
      });
      return res.data;
    }
  });

  // Dependent Filter Logic
  const filteredBranches = branches.filter((b: any) => {
    if (b.name === 'Central Admin') return false;
    if (programFilter === 'B.Tech') return !b.name.toLowerCase().includes('m.tech') && !b.name.toLowerCase().includes('mtech');
    if (programFilter === 'M.Tech') return b.name.toLowerCase().includes('m.tech') || b.name.toLowerCase().includes('mtech');
    return true;
  });

  const filteredTprs = tprs.filter((tpr: any) => {
    if (branchFilter) {
      return tpr.branchId && (tpr.branchId._id === branchFilter || tpr.branchId === branchFilter);
    }
    if (programFilter) {
      return tpr.course === programFilter;
    }
    return true;
  });

  const filteredTpos = tpos.filter((tpo: any) => {
    if (!tpoTypeFilter) return true;
    return tpo.type === tpoTypeFilter;
  });

  const handleResetFilters = () => {
    setProgramFilter('');
    setBranchFilter('');
    setTprFilter('');
    setTpoTypeFilter('');
    setTpoNameFilter('');
    setStatusFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" /> Current Year Database
          </h2>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search companies..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                showFilters || programFilter || branchFilter || tprFilter || tpoTypeFilter || tpoNameFilter || statusFilter
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(programFilter || branchFilter || tprFilter || tpoTypeFilter || tpoNameFilter || statusFilter) && (
                <span className="flex items-center justify-center w-5 h-5 bg-emerald-500 text-white text-[10px] rounded-full ml-1">
                  !
                </span>
              )}
            </button>
          </div>
        </div>

        <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select 
            value={programFilter} 
            onChange={(e) => { setProgramFilter(e.target.value); setBranchFilter(''); setTprFilter(''); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Course (All)</option>
            <option value="B.Tech">B.Tech</option>
            <option value="M.Tech">M.Tech</option>
          </select>

          <select 
            value={branchFilter} 
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={!programFilter && branches.length > 0}
          >
            <option value="">Branch (All)</option>
            {filteredBranches.map((b: any) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

          <select 
            value={tprFilter} 
            onChange={(e) => { setTprFilter(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">POC TPR (All)</option>
            {filteredTprs.map((tpr: any) => (
              <option key={tpr._id} value={tpr.name}>{tpr.name} {tpr.course ? `(${tpr.course})` : ''}</option>
            ))}
          </select>

          <select 
            value={tpoTypeFilter} 
            onChange={(e) => { setTpoTypeFilter(e.target.value); setTpoNameFilter(''); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">TPO Type (All)</option>
            <option value="Faculty">Faculty</option>
            <option value="Staff">Staff</option>
          </select>

          <select 
            value={tpoNameFilter} 
            onChange={(e) => { setTpoNameFilter(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={!tpoTypeFilter}
          >
            <option value="">POC TPO (All)</option>
            {filteredTpos.map((tpo: any) => (
              <option key={tpo._id} value={tpo.name}>{tpo.name}</option>
            ))}
          </select>

            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Status (All)</option>
              <option value="not_contacted">Not Contacted</option>
              <option value="call_today">Call Today</option>
              <option value="call_again">Call Again</option>
              <option value="brochure_jnf">Brochure + JNF</option>
              <option value="tpo_talk">TPO Talk</option>
              <option value="rejected">Rejected</option>
              <option value="accepted">Accepted</option>
            </select>
          </div>
          
          {(programFilter || branchFilter || tprFilter || tpoTypeFilter || tpoNameFilter || statusFilter) && (
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCcw className="w-3 h-3" /> Reset Filters
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative min-h-[400px]">
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Company Details</th>
                <th className="px-6 py-4 hidden md:table-cell">Company Verified</th>
                <th className="px-6 py-4 hidden md:table-cell">Contact Verified</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">POC TPR</th>
                <th className="px-6 py-4">POC TPO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-lg text-slate-700">No companies found</p>
                    <p className="text-sm mt-1">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                data?.data?.map((company: any) => {
                  const status = company.contact_outcome || 'not_contacted';
                  
                  return (
                    <tr key={company._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 text-base">{company.companyName}</div>
                          <div className="flex gap-1 md:hidden">
                            {company.is_verified_by_admin ? (
                              <span title="Company Verified" className="inline-flex bg-emerald-50 text-emerald-600 rounded p-0.5 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            ) : (company.primary_contact_verified || company.additionalContacts?.some((c: any) => c.isVerified)) ? (
                              <span title="Contact Verified" className="inline-flex bg-blue-50 text-blue-600 rounded p-0.5 border border-blue-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{company.assignedBranch}</div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {company.is_verified_by_admin ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {(company.primary_contact_verified || company.additionalContacts?.some((c: any) => c.isVerified)) ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border
                          ${status === 'call_again' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                            status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                            status === 'brochure_jnf' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            status === 'tpo_talk' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          {status === 'brochure_jnf' && company.emailDeliveryStatus === 'sent' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                           status === 'brochure_jnf' && company.emailDeliveryStatus === 'failed' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> :
                           status !== 'not_contacted' ? <PhoneCall className="w-3.5 h-3.5" /> : null}
                          
                          {status === 'not_contacted' ? 'Not Contacted' :
                           status === 'brochure_jnf' ? 'Brochure + JNF' :
                           status === 'tpo_talk' ? 'TPO Talk' :
                           status === 'call_again' ? 'Call Again' :
                           status === 'rejected' ? 'Rejected' :
                           status === 'accepted' ? 'Accepted' :
                           status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {company.contactOwner && company.contactOwner !== 'Unknown' ? (
                          <span className="font-medium text-slate-800">{company.contactOwner}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {company.assignedTPO ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-indigo-700">{company.assignedTPO}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{company.tpoType}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="p-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{data.pagination.page}</span> of <span className="font-semibold text-slate-900">{data.pagination.pages}</span> ({data.pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
