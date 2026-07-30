'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, CheckCircle2, Info, Loader2, Building2, Plus, AlertCircle, Filter, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { BranchCompanyDetailsModal } from '@/components/ui/BranchCompanyDetailsModal';
import { GlobalManualCompanyModal } from '@/components/ui/GlobalManualCompanyModal';

export function BranchCompaniesView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    program: '',
    branch: '',
    is_verified: '',
    call_today: false
  });
  const [activeFilters, setActiveFilters] = useState({
    program: '',
    branch: '',
    is_verified: '',
    call_today: false
  });
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all branches for the filter
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    }
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['companies-branch-overview', page, search, activeFilters],
    queryFn: async () => {
      const params: any = { page, limit: 10, search };
      if (activeFilters.branch) params.branch = activeFilters.branch;
      if (activeFilters.program) params.program = activeFilters.program;
      if (activeFilters.is_verified !== '') params.is_verified = activeFilters.is_verified;
      if (activeFilters.call_today) params.call_today = 'true';
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies/branch-overview`, { params, withCredentials: true });
      return res.data;
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Unified Branch Companies
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Global overview of all companies currently managed by branch TPRs.
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 bg-blue-600 text-white text-xs md:text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> 
              <span className="hidden sm:inline">Add Company</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2.5 text-xs md:text-sm font-semibold rounded-xl transition-colors shadow-sm border ${isFilterPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Filter className="w-3 h-3 md:w-4 md:h-4 shrink-0" /> 
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full pl-12 p-3.5 shadow-sm transition-all" 
            placeholder="Search companies by name..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Expandable Filter Panel */}
        {isFilterPanelOpen && (
          <div className="mt-2 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Course / Program Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Course / Program</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.program}
                  onChange={(e) => setTempFilters({ ...tempFilters, program: e.target.value })}
                >
                  <option value="">All Courses</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                  <option value="Open to all">Open to all</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.branch}
                  onChange={(e) => setTempFilters({ ...tempFilters, branch: e.target.value })}
                >
                  <option value="">All Branches</option>
                  {branches?.map((b: any) => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verification Status</label>
                <select 
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                  value={tempFilters.is_verified}
                  onChange={(e) => setTempFilters({ ...tempFilters, is_verified: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Verified Only</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>

              {/* Call Today / Contacted */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors shadow-sm group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-300 group-hover:border-indigo-500 transition-colors">
                    <input 
                      type="checkbox" 
                      className="opacity-0 absolute inset-0 cursor-pointer"
                      checked={tempFilters.call_today}
                      onChange={(e) => setTempFilters({ ...tempFilters, call_today: e.target.checked })}
                    />
                    {tempFilters.call_today && <CheckCircle2 className="w-4 h-4 text-indigo-600 absolute pointer-events-none" />}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 select-none">Call Today / Action Required</span>
                </label>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={() => {
                  const reset = { program: '', branch: '', is_verified: '', call_today: false };
                  setTempFilters(reset);
                  setActiveFilters(reset);
                  setPage(1);
                  setIsFilterPanelOpen(false);
                }}
                className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={() => {
                  setActiveFilters(tempFilters);
                  setPage(1);
                  setIsFilterPanelOpen(false);
                }}
                className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Apply Filters & Proceed
              </button>
            </div>
          </div>
        )}
      </div>

    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap lg:whitespace-normal">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company Details</th>
                <th className="px-6 py-4">Assigned Branch</th>
                <th className="px-6 py-4">HR Contact Info</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 bg-white">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 ml-auto"></div></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-red-500">
                    <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                    <span className="font-bold text-red-700 text-lg block">Error Loading Data</span>
                    <span className="text-sm text-red-400">{(error as any)?.response?.data?.error || (error as any)?.message || 'Failed to fetch companies'}</span>
                  </td>
                </tr>
              ) : (!data || !data.data || data.data.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <span className="font-bold text-slate-700 text-lg block">No companies found</span>
                    <span className="text-sm text-slate-400">Companies assigned to branches will appear here.</span>
                  </td>
                </tr>
              ) : (
                data?.data?.map((company: any) => {
                  const hr = company.hr_contacts?.[0]; // Get primary HR if exists
                  
                  return (
                    <tr key={company._id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-base">{company.companyName}</span>
                          {company.is_verified_by_admin ? (
                            <span title="Verified Master Company" className="flex items-center">
                              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          ) : ((company as any).primary_contact_verified || (company.additionalContacts && company.additionalContacts.some((c: any) => c.isVerified))) ? (
                            <span title="Contact Verified" className="flex items-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{company.academic_year || 'Current Year'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${company.assignedBranch === 'Pending Assignment' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                          {company.assignedBranch}
                        </span>
                        {company.contactOwner && company.contactOwner !== 'Unknown' ? (
                          <p className="text-xs text-slate-500 mt-1.5">
                            POC TPR: <span className="font-medium text-slate-700">{company.contactOwner}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1.5">
                            POC Branch: <span className="font-medium text-slate-700">
                              {company.assignedBranch === 'Pending Assignment' ? 'Pending' : company.assignedBranch}
                            </span>
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {hr ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800">{hr.name || 'Unknown Name'}</span>
                            {hr.mobile && <span className="text-xs text-slate-500">{hr.mobile}</span>}
                            {hr.email && <span className="text-xs text-slate-500">{hr.email}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No HR info</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {company.is_verified_by_admin ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <ShieldCheck className="w-6 h-6 text-green-500" />
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Verified</span>
                          </div>
                        ) : ((company as any).primary_contact_verified || (company.additionalContacts && company.additionalContacts.some((c: any) => c.isVerified))) ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Contact Verified</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedCompany(company)}
                          className="inline-flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white border border-slate-200 text-indigo-600 font-semibold text-xs md:text-sm rounded-lg md:rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                        >
                          <Info className="hidden md:block w-4 h-4 shrink-0" /> 
                          <span className="hidden md:inline">View More</span>
                          <span className="md:hidden flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && data?.pagination && data.pagination.pages > 1 && (
          <div className="p-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{data.pagination.page}</span> of <span className="font-semibold text-slate-900">{data.pagination.pages}</span> ({data.pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCompany && (
        <BranchCompanyDetailsModal 
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          company={selectedCompany}
          onAssignComplete={() => {
            setSelectedCompany(null);
            queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
          }}
        />
      )}

      {showAddModal && (
        <GlobalManualCompanyModal
          mode="current"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['companies-branch-overview'] });
          }}
        />
      )}
    </div>
  );
}
