import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { X, Search, Building2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Phone, Mail } from 'lucide-react';
import { EmailStatusTracker } from '@/components/ui/EmailStatusTracker';

export interface CompanyEntry {
  _id: string;
  company_name: string;
  drive_type: string | null;
  role: string | null;
  package: string | null;
  expected_month: string | null;
  expected_year: string | null;
  assignedBranch: string | null;
  hr: { name?: string; email?: string; mobile?: string } | null;
  isPreviousCompany?: boolean;
  emailDeliveryStatus?: 'pending' | 'sent' | 'failed' | null;
  emailFailureReason?: string | null;
  emailStatusUpdatedAt?: string | null;
}

export function CompanyCard({ company, showEmailTracker }: { company: CompanyEntry, showEmailTracker?: boolean }) {
  const driveLabel = company.drive_type === 'Pool' ? 'Pool Drive' : company.drive_type === 'In-Campus' ? 'In-Campus' : company.drive_type || 'Unknown';
  const driveColor = company.drive_type === 'Pool' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';
  const dateStr = [company.expected_month, company.expected_year].filter(Boolean).join(' ') || null;
  const initial = (company.company_name || 'C')[0].toUpperCase();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 focus-within:z-50 focus-within:relative">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{company.company_name}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {company.drive_type && !company.isPreviousCompany && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${driveColor}`}>{driveLabel}</span>
              )}
              {company.emailDeliveryStatus === 'sent' && (
                <div className="flex flex-col items-end">
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md shadow-sm">
                    <CheckCircle className="w-3.5 h-3.5" /> Brochure Sent
                  </span>
                  {company.emailStatusUpdatedAt && (
                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                      {new Date(company.emailStatusUpdatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
              {company.emailDeliveryStatus === 'failed' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-md shadow-sm cursor-help" title={company.emailFailureReason || 'Failed to send'}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Failed
                </span>
              )}
            </div>
          </div>
          {!company.isPreviousCompany && (
            <p className="text-sm text-slate-600 mt-0.5">{company.role || 'General Application'}</p>
          )}
          {!company.isPreviousCompany && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {dateStr && <span className="text-xs text-slate-500">{dateStr}</span>}
              {company.package && <span className="text-xs font-bold text-emerald-600">{company.package}</span>}
              {company.assignedBranch && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{company.assignedBranch}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            {company.hr ? (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1 truncate">HR: {company.hr.name || 'Unknown'}</p>
                <div className="flex flex-wrap gap-3">
                  {company.hr.mobile && (
                    <a href={`tel:${company.hr.mobile}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Phone className="w-3 h-3" />{company.hr.mobile}
                    </a>
                  )}
                  {company.hr.email && (
                    <a href={`mailto:${company.hr.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[200px]" title={company.hr.email}>
                      <Mail className="w-3 h-3" />{company.hr.email}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />HR details not available
              </p>
            )}
          </div>
          {showEmailTracker && (
            <div className="flex-shrink-0">
              <EmailStatusTracker
                companyId={company._id}
                companyName={company.company_name}
                hrEmail={company.hr?.email || ''}
                currentStatus={company.emailDeliveryStatus || 'pending'}
                failureReason={company.emailFailureReason || ''}
                endpointPrefix="companies"
                showBadge={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SlideOverPanel({
  open, onClose, year, title, branchId, isAdmin, branches, endpoint = 'confirmed-companies'
}: { open: boolean; onClose: () => void; year?: string; title: string; branchId?: string; isAdmin?: boolean; branches?: any[]; endpoint?: string; }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [driveFilter, setDriveFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');

  const selectedBranchId = branchFilter !== 'All' ? branchFilter : branchId;

  const { data, isLoading } = useQuery({
    queryKey: [endpoint, year, page, selectedBranchId],
    queryFn: async () => {
      const params: any = { page };
      if (year) params.year = year;
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/${endpoint}`, {
        params
      });
      return res.data;
    },
    enabled: open && (endpoint === 'brochure-jnf-requests' || endpoint === 'brochure-sent-companies' || !!year),
    staleTime: 5 * 60 * 1000,
  });

  const companies: CompanyEntry[] = data?.companies || [];
  const filtered = companies.filter(c => {
    const matchSearch = !search || c.company_name.toLowerCase().includes(search.toLowerCase());
    const matchDrive = driveFilter === 'All' || c.drive_type === driveFilter;
    return matchSearch && matchDrive;
  });

  useEffect(() => { if (!open) { setSearch(''); setPage(1); setDriveFilter('All'); } }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-250 ${open ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-250 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {year && <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">{year}</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-100 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={courseFilter}
                onChange={e => { setCourseFilter(e.target.value); setBranchFilter('All'); }}
              >
                <option value="All">All Courses</option>
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
                <option value="Dual Degree">Dual Degree</option>
              </select>
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="All">All Branches</option>
                {branches?.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          {!year?.includes('-') && (
            <div className="flex gap-2 flex-wrap">
              {['All', 'Pool', 'In-Campus'].map(f => (
                <button key={f} onClick={() => setDriveFilter(f)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${driveFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-sm z-10 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative w-16 h-16 mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                <Building2 className="absolute inset-0 m-auto w-7 h-7 text-blue-600 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">Fetching Companies</h3>
              <p className="text-slate-500 text-sm text-center">Loading institutional intelligence data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">No companies found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map(c => <CompanyCard key={c._id} company={c} showEmailTracker={endpoint === 'brochure-jnf-requests' && isAdmin} />)
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-sm text-slate-500">Page {page} of {data.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
