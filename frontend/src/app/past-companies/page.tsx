'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { toast } from 'sonner';
import { Search, Archive, Info, Trash2, ShieldCheck, Filter } from 'lucide-react';
import { PastCompanyDetailsModal } from '@/components/ui/PastCompanyDetailsModal';
import { DuplicateCompaniesTable } from '@/components/ui/DuplicateCompaniesTable';

interface AdditionalContact {
  hrName: string;
  hrEmail: string;
  hrPhone: string;
  sourceSheet: string;
  academicYear: string;
}

interface PastCompany {
  _id: string;
  companyName: string;
  normalizedName: string;
  academicYear: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  notes?: string;
  contactStatus?: string;
  contactedByBranchName?: string;
  section: string;
  additionalContacts?: AdditionalContact[];
  is_verified_by_admin?: boolean;
}

export default function PastCompaniesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<PastCompany | null>(null);
  const [activeTab, setActiveTab] = useState<'master' | 'duplicates'>('master');
  
  const [tempFilters, setTempFilters] = useState({
    section: 'All',
    verified: 'All',
    branch: 'All'
  });
  const [activeFilters, setActiveFilters] = useState({
    section: 'All',
    verified: 'All',
    branch: 'All'
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: userProfile, isLoading: isUserLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`);
      return res.data.data;
    }
  });

  const { data: sections } = useQuery({
    queryKey: ['previous-sections'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/sections`, { withCredentials: true });
      return res.data.data || [];
    },
    enabled: userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr'
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data || [];
    },
    enabled: userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['past-companies', page, search, activeFilters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 10, q: search };
      if (activeFilters.section !== 'All') params.section = activeFilters.section;
      if (activeFilters.verified !== 'All') params.verified = activeFilters.verified === 'Verified' ? 'true' : 'false';
      if (activeFilters.branch !== 'All') params.branch = activeFilters.branch;

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/all`, { params, withCredentials: true });
      return res.data;
    },
    enabled: activeTab === 'master' && (userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr')
  });

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to completely delete "${companyName}" from the database AND Google Sheets? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/${companyId}`, { withCredentials: true });
      toast.success('Company deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['past-companies'] });
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to delete company');
      } else {
        toast.error('Failed to delete company');
      }
    }
  };

  if (isUserLoading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr';
  
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm text-center">
          <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to view the Past Companies master database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-6 h-6 text-indigo-600" />
              Past Companies Master List
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Global overview of all past year companies. Duplicates are merged to show all available HR contacts.
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            {activeTab === 'master' && (
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm w-full md:w-auto border ${isFilterPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <Filter className="w-4 h-4" /> Filters
              </button>
            )}
          </div>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full pl-12 p-3.5 shadow-sm transition-all" 
            placeholder="Search past companies by name..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Expandable Filter Panel */}
        {activeTab === 'master' && isFilterPanelOpen && (
          <div className="mt-2 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Section</label>
                <select 
                  value={tempFilters.section}
                  onChange={(e) => setTempFilters({ ...tempFilters, section: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                >
                  <option value="All">All Sections</option>
                  {sections?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verification Status</label>
                <select
                  value={tempFilters.verified}
                  onChange={(e) => setTempFilters({ ...tempFilters, verified: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="Verified">Verified Master</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Branch</label>
                <select
                  value={tempFilters.branch}
                  onChange={(e) => setTempFilters({ ...tempFilters, branch: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
                >
                  <option value="All">All Branches</option>
                  {branches?.map((b: { _id: string; name: string }) => <option key={b._id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={() => {
                  const reset = { section: 'All', verified: 'All', branch: 'All' };
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
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('master')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'master'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Master Companies
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'duplicates'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Duplicate Pending Queue
        </button>
      </div>

      {activeTab === 'master' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Primary Contact</th>
                <th className="px-6 py-4">Extra Contacts</th>
                <th className="px-6 py-4">Academic Year</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-200 bg-white">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive className="w-12 h-12 text-slate-300 mb-2" />
                      <span className="font-bold text-slate-700 text-lg">No past companies found</span>
                      <span className="text-sm text-slate-400">Sync or import from the past year master sheet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((company: PastCompany) => (
                  <tr key={company._id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 text-base">{company.companyName}</span>
                          {company.is_verified_by_admin && (
                            <span title="Verified Master Company" className="flex items-center">
                              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 mt-1">{company.section}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-900">{company.hrName || 'N/A'}</span>
                        {company.hrPhone && <span className="text-xs text-slate-500">{company.hrPhone}</span>}
                        {company.hrEmail && <span className="text-xs text-slate-500 truncate max-w-[200px]" title={company.hrEmail}>{company.hrEmail}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company.additionalContacts && company.additionalContacts.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          +{company.additionalContacts.length} Contacts
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        {company.academicYear}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedCompany(company)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                          Details
                        </button>
                        <button 
                          onClick={() => handleDeleteCompany(company._id, company.companyName)}
                          className="inline-flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
                          title="Delete from DB & Google Sheet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      ) : (
        <DuplicateCompaniesTable searchQuery={search} />
      )}

      <PastCompanyDetailsModal 
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        company={selectedCompany}
      />
    </div>
  );
}
