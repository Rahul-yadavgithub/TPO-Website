import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Copy, FileText, Loader2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ResolveDuplicateModal } from './ResolveDuplicateModal';

interface DuplicateCompany {
  _id: string;
  originalCompanyId: {
    _id: string;
    companyName: string;
    hrName?: string;
    hrPhone?: string;
    hrEmail?: string;
    section: string;
    academicYear: string;
  };
  companyName: string;
  hrName?: string;
  hrPhone?: string;
  hrEmail?: string;
  section: string;
  academicYear: string;
  extraData?: Record<string, any>;
  createdAt: string;
}

export function DuplicateCompaniesTable({ searchQuery = '' }: { searchQuery?: string }) {
  const [page, setPage] = useState(1);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateCompany | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-companies', page, searchQuery],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/duplicates?page=${page}&limit=10&q=${searchQuery}`, { withCredentials: true });
      return res.data;
    }
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Original (Master) Details</th>
              <th className="px-6 py-4 border-l border-amber-100 bg-amber-50/30">Incoming Duplicate Details</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-200 bg-white">
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-1/2"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse w-8 ml-auto"></div></td>
                </tr>
              ))
            ) : data?.duplicates?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="w-12 h-12 text-emerald-300 mb-2" />
                    <span className="font-bold text-slate-700 text-lg">No Pending Duplicates</span>
                    <span className="text-sm text-slate-400">All duplicate companies have been resolved.</span>
                  </div>
                </td>
              </tr>
            ) : (
              data?.duplicates?.map((dup: DuplicateCompany) => (
                <tr key={dup._id} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col max-w-xs">
                      <span className="font-semibold text-slate-900 text-base">{dup.companyName}</span>
                      <span className="text-xs text-slate-500 mt-1">{new Date(dup.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-900">{dup.originalCompanyId?.hrName || 'N/A'}</span>
                      <span className="text-xs text-slate-500">{dup.originalCompanyId?.section || 'Unknown Section'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-l border-amber-50 bg-amber-50/10">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-amber-900">{dup.hrName || 'N/A'}</span>
                      <span className="text-xs text-amber-700">{dup.section}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedDuplicate(dup)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 hover:text-amber-800 transition-colors shadow-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Resolve
                    </button>
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

      {selectedDuplicate && (
        <ResolveDuplicateModal 
          isOpen={!!selectedDuplicate}
          onClose={() => setSelectedDuplicate(null)}
          duplicate={selectedDuplicate}
          onSuccess={() => {
            setSelectedDuplicate(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['past-companies'] });
          }}
        />
      )}
    </div>
  );
}
