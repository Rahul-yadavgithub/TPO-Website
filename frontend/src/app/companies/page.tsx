'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { Search, Globe, CheckCircle, XCircle, Info, Plus, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { CompanyDetailsModal } from '@/components/ui/CompanyDetailsModal';
import { GlobalBulkUploadModal } from '@/components/ui/GlobalBulkUploadModal';
import { GlobalManualCompanyModal } from '@/components/ui/GlobalManualCompanyModal';
import { BranchCompaniesView } from './BranchCompaniesView';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  _id: string;
  companyName: string;
  normalizedName: string;
  website?: string;
  category?: string;
  description?: string;
  fresherHiring?: boolean;
  internshipAvailable?: boolean;
  placementPriority?: string;
  placementScore: number;
  confidenceScore: number;
  status: string;
  discoveryDate: string;
  teamSize?: string;
  fundingStage?: string;
  foundedYear?: string;
  hiringType?: string;
  source?: {
    platform: string;
    sourceUrl: string;
    careersUrl?: string;
    discoveryMethod?: string;
    discoveredAt?: string;
  };
  assignedBranch?: string;
  syncStatus?: string;
}

export default function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const queryClient = useQueryClient();

  const { user: userProfile, status } = useAuth();
  const isUserLoading = status === 'checking';

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr';

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, search, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 10, search };
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/companies`, { params });
      return res.data;
    },
    enabled: !isAdmin // Only fetch scan db if not admin
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${id}/review`, {
        action,
        reviewed_by: 'Admin' // Hardcoded for now, will come from auth later
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  });

  if (isUserLoading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  if (isAdmin) {
    return <div className="p-2 md:p-8 max-w-7xl mx-auto"><BranchCompaniesView /></div>;
  }

  return (
    <div className="p-2 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Scan Database</h1>
          <p className="text-muted-foreground mt-1">
            Auto-discovered companies pending review and assignment. Sheet-synced companies are managed via the Sync Center.
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="DISCOVERED">Discovered</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              className="bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 shadow-sm" 
              placeholder="Search companies..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company Details</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Hiring Signals</th>
                <th className="px-6 py-4">Status & Score</th>
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
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="font-bold text-slate-700 text-lg">No discovered companies yet</span>
                      <span className="text-sm text-slate-400">New companies found by the scanner will appear here for review.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((company: Company) => (
                  <tr key={company._id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="font-semibold text-slate-900 text-base">{company.companyName}</span>
                        {company.website && (
                           <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1 truncate">
                             <Globe className="w-3 h-3 flex-shrink-0" /> {company.website}
                           </a>
                        )}
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2" title={company.description}>{company.description || 'No description available'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {company.category || 'Unknown'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        {company.fresherHiring && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-max">Freshers</span>}
                        {company.internshipAvailable && <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full w-max">Internships</span>}
                        {company.placementPriority === 'HIGH' && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-max">High Priority</span>}
                        {!company.fresherHiring && !company.internshipAvailable && company.placementPriority !== 'HIGH' && (
                          <span className="text-slate-400">None detected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border w-max
                          ${company.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 
                            company.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 
                            company.status === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'}`}
                        >
                          {company.status.replace('_', ' ')}
                        </span>
                        <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
                          <div>Confidence: <span className={company.confidenceScore >= 90 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>{company.confidenceScore}%</span></div>
                          <div>Placement: <span className="font-semibold text-slate-900">{company.placementScore}</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {company.status === 'PENDING_REVIEW' && (
                          <>
                            <button 
                              onClick={() => reviewMutation.mutate({ id: company._id, action: 'approve' })}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => reviewMutation.mutate({ id: company._id, action: 'reject' })}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setSelectedCompany(company)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                          title="View Details"
                        >
                          <Info className="w-5 h-5" />
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
          <div className="p-3 md:p-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
            <span className="hidden md:inline text-sm text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{data.pagination.page}</span> of <span className="font-semibold text-slate-900">{data.pagination.pages}</span> ({data.pagination.total} total)
            </span>
            <span className="md:hidden text-sm font-semibold text-slate-700 ml-1">
              {data.pagination.page} <span className="text-slate-400">...</span> {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 md:px-4 md:py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline">Previous</span>
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page === data.pagination.pages}
                className="p-2 md:px-4 md:py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline">Next</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CompanyDetailsModal 
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        company={selectedCompany}
        onUpdate={(updatedCompany) => setSelectedCompany(updatedCompany)}
      />

      {showManualModal && (
        <GlobalManualCompanyModal 
          mode="current"
          onClose={() => setShowManualModal(false)}
          onSuccess={() => {
            setShowManualModal(false);
            queryClient.invalidateQueries({ queryKey: ['companies'] });
          }}
        />
      )}

      {showBulkModal && (
        <GlobalBulkUploadModal 
          mode="current"
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            queryClient.invalidateQueries({ queryKey: ['companies'] });
          }}
        />
      )}
    </div>
  );
}
