'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight, X, Search, ChevronLeft, ChevronRight,
  Mail, Phone, AlertTriangle, Users, Briefcase,
  Building2, RefreshCw, Loader2, CheckCircle, Clock, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardSummary {
  pending_review_count: number;
  confirmed_this_year: {
    academic_year: string;
    total: number;
    by_drive_type: Record<string, number>;
    by_role: { role: string; count: number }[];
  };
  confirmed_last_year: {
    academic_year: string;
    total: number;
    by_drive_type: Record<string, number>;
    by_role: { role: string; count: number }[];
  };
}

interface CompanyEntry {
  _id: string;
  company_name: string;
  drive_type: string | null;
  role: string | null;
  package: string | null;
  expected_month: string | null;
  expected_year: string | null;
  assignedBranch: string | null;
  hr: { name?: string; email?: string; mobile?: string } | null;
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 600 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) return;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{count}</>;
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-pulse">
      <div className="flex justify-between mb-4">
        <div>
          <div className="h-5 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-64" />
        </div>
        <div className="h-6 bg-slate-200 rounded-full w-20" />
      </div>
      <div className="h-14 bg-slate-200 rounded w-24 my-6" />
      <div className="flex gap-3 mb-6">
        <div className="h-6 bg-blue-100 rounded-full w-24" />
        <div className="h-6 bg-green-100 rounded-full w-28" />
      </div>
      <div className="h-8 bg-slate-100 rounded-lg mb-4" />
      <div className="space-y-2">
        {[80, 55].map(w => (
          <div key={w} className="flex items-center gap-3">
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className={`h-5 bg-slate-200 rounded-full`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart Row ────────────────────────────────────────────────────────────
function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-slate-900 w-8 text-right">{value}</span>
      <span className="text-xs text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────
function CompanyCard({ company }: { company: CompanyEntry }) {
  const driveLabel = company.drive_type === 'Pool' ? 'Pool Drive' : company.drive_type === 'In-Campus' ? 'In-Campus' : company.drive_type || 'Unknown';
  const driveColor = company.drive_type === 'Pool' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700';
  const dateStr = [company.expected_month, company.expected_year].filter(Boolean).join(' ') || null;
  const initial = (company.company_name || 'C')[0].toUpperCase();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{company.company_name}</h3>
            {company.drive_type && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${driveColor}`}>{driveLabel}</span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{company.role || 'General Application'}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {dateStr && <span className="text-xs text-slate-500">{dateStr}</span>}
            {company.package && <span className="text-xs font-bold text-emerald-600">{company.package}</span>}
            {company.assignedBranch && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{company.assignedBranch}</span>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        {company.hr ? (
          <div>
            <p className="text-xs font-bold text-slate-700 mb-1">HR: {company.hr.name || 'Unknown'}</p>
            <div className="flex flex-wrap gap-3">
              {company.hr.mobile && (
                <a href={`tel:${company.hr.mobile}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Phone className="w-3 h-3" />{company.hr.mobile}
                </a>
              )}
              {company.hr.email && (
                <a href={`mailto:${company.hr.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
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
    </div>
  );
}

// ─── Slide-Over Panel ─────────────────────────────────────────────────────────
function SlideOverPanel({
  open, onClose, year, title
}: { open: boolean; onClose: () => void; year: string; title: string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [driveFilter, setDriveFilter] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['confirmed-companies', year, page],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/confirmed-companies`, {
        params: { year, page }
      });
      return res.data;
    },
    enabled: open && !!year,
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
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">{year}</span>
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
          <div className="flex gap-2 flex-wrap">
            {['All', 'Pool', 'In-Campus'].map(f => (
              <button key={f} onClick={() => setDriveFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${driveFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">No companies found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map(c => <CompanyCard key={c._id} company={c} />)
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title, description, data, isCurrentYear
}: {
  title: string;
  description: string;
  data: DashboardSummary['confirmed_this_year'] | null;
  isCurrentYear: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'drive' | 'role'>('drive');
  const [panelOpen, setPanelOpen] = useState(false);

  const poolCount = data?.by_drive_type?.['Pool'] || 0;
  const campusCount = data?.by_drive_type?.['In-Campus'] || 0;
  const maxDrive = Math.max(poolCount, campusCount, 1);
  const topRoles = (data?.by_role || []).slice(0, 6);
  const maxRole = topRoles[0]?.count || 1;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>
            </div>
            {data?.academic_year && (
              <span className="shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white">{data.academic_year}</span>
            )}
          </div>

          {/* Hero Number */}
          <div className="mt-4 mb-3">
            <span className="text-[56px] font-extrabold text-slate-900 leading-none">
              {data ? <AnimatedCounter target={data.total} /> : '0'}
            </span>
          </div>

          {/* Drive Pills */}
          <div className="flex gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Pool: {poolCount}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />In-Campus: {campusCount}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pb-2">
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            {(['drive', 'role'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'drive' ? 'By Drive Type' : 'By Role'}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="px-6 py-4 flex-1 min-h-[140px]">
          {!data || data.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Users className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-sm font-medium">No confirmed companies yet for {data?.academic_year}</p>
              <p className="text-xs mt-0.5 text-slate-400">Companies appear once coordinators confirm them</p>
            </div>
          ) : activeTab === 'drive' ? (
            <div className="space-y-3">
              <BarRow label="Pool" value={poolCount} max={maxDrive} color="bg-blue-500" />
              <BarRow label="In-Campus" value={campusCount} max={maxDrive} color="bg-emerald-500" />
              {Object.entries(data.by_drive_type).filter(([k]) => k !== 'Pool' && k !== 'In-Campus').map(([k, v]) => (
                <BarRow key={k} label={k} value={v} max={maxDrive} color="bg-slate-400" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {topRoles.map(({ role, count }) => (
                <BarRow key={role} label={role} value={count} max={maxRole} color="bg-indigo-400" />
              ))}
              {(data.by_role?.length || 0) > 6 && (
                <p className="text-xs text-slate-400 pl-1">+{data.by_role.length - 6} more roles</p>
              )}
            </div>
          )}
        </div>

        {/* View List Button */}
        <button
          onClick={() => setPanelOpen(true)}
          className="mx-6 mb-6 mt-2 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          View Company List <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <SlideOverPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        year={data?.academic_year || ''}
        title={title}
      />
    </>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [lastUpdated] = useState(new Date());

  const { data: summary, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/summary`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`);
      return res.data.data;
    }
  });

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr';

  const { data: adminRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/requests`);
      return res.data.data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const approveTpr = async (id: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/approve-tpr/${id}`);
      toast.success('TPR Approved successfully');
      refetchRequests();
    } catch (err) {
      toast.error('Failed to approve TPR');
    }
  };

  const approveContact = async (id: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/approve-contact/${id}`);
      toast.success('Contact Request Approved & Sent to TPR');
      refetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve contact request');
    }
  };

  const { data: allTprs, refetch: refetchTprs } = useQuery({
    queryKey: ['admin-all-tprs'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/tprs`);
      return res.data.data;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const upgradeTpr = async (id: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/upgrade-tpr/${id}`);
      toast.success('TPR upgraded to Admin successfully!');
      refetchTprs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade TPR');
    }
  };

  const pendingCount = summary?.pending_review_count || 0;
  const timeAgo = Math.round((Date.now() - lastUpdated.getTime()) / 60000);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Discovery Dashboard</h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Institution-wide placement intelligence at a glance.</p>
          </div>
          <button onClick={() => { refetch(); refetchRequests(); refetchTprs(); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin Pending Requests Queue */}
      {isAdmin && adminRequests && (adminRequests.tprs.length > 0 || adminRequests.contacts.length > 0) && (
        <div className="mb-8 bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" /> Pending Admin Approvals
            </h2>
          </div>
          <div className="p-0">
            {/* Pending TPRs */}
            {adminRequests.tprs.length > 0 && (
              <div className="border-b border-slate-100 last:border-0">
                <div className="bg-slate-50 px-5 py-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">TPR Registrations ({adminRequests.tprs.length})</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {adminRequests.tprs.map((tpr: any) => (
                    <div key={tpr._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{tpr.name}</p>
                        <p className="text-sm text-slate-500">{tpr.email} • {tpr.branchId?.name}</p>
                      </div>
                      <button 
                        onClick={() => approveTpr(tpr._id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Contacts */}
            {adminRequests.contacts.length > 0 && (
              <div className="border-b border-slate-100 last:border-0">
                <div className="bg-slate-50 px-5 py-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Requests ({adminRequests.contacts.length})</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {adminRequests.contacts.map((contact: any) => (
                    <div key={contact._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{contact.companyName}</p>
                        <p className="text-sm text-slate-500">Requested by: {contact.requestedBy?.name} ({contact.branchId?.name})</p>
                      </div>
                      <button 
                        onClick={() => approveContact(contact._id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve & Send Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TPR Directory & Access Management (Admin Only) */}
      {isAdmin && allTprs && allTprs.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" /> TPR Directory & Access Management
            </h2>
            <span className="text-sm font-medium text-slate-500">{allTprs.length} Registered TPRs</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {allTprs.map((tpr: any) => (
              <div key={tpr._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-900">{tpr.name}</p>
                    {tpr.role === 'admin' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">Admin</span>
                    ) : tpr.role === 'communication_tpr' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">Comm TPR</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">Standard</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{tpr.email} • {tpr.branchId?.name}</p>
                </div>
                {tpr.role !== 'admin' && (
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to upgrade ${tpr.name} to an Admin? They will have full access.`)) {
                        upgradeTpr(tpr._id);
                      }
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-sm font-bold rounded-lg shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors shrink-0"
                  >
                    Upgrade to Admin
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Approval Queue Banner */}
      {!isLoading && (
        <div className={`mb-8 bg-white rounded-2xl border shadow-sm p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${pendingCount > 0 ? 'border-l-4 border-l-amber-400 border-slate-200' : 'border-slate-200'}`}>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <span className="relative flex-shrink-0">
                <span className="w-3 h-3 rounded-full bg-amber-400 flex" />
                <span className="animate-ping absolute inset-0 rounded-full bg-amber-400 opacity-60" />
              </span>
            )}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-500">{pendingCount}</span>
                <span className="text-slate-600 font-medium">companies awaiting review</span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">Review before they are added to the placement database</p>
            </div>
          </div>
          <Link
            href="/companies?status=PENDING_REVIEW"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            Review Queue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          Unable to load dashboard data.
          <button onClick={() => refetch()} className="ml-auto font-semibold hover:underline flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {isLoading ? (
          <><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <StatCard
              title="Target Companies This Year"
              description="Companies expected to visit for placement drives this academic year."
              data={summary?.confirmed_this_year || null}
              isCurrentYear={true}
            />
            <StatCard
              title="Confirmed Placements Last Year"
              description="Companies confirmed to have hired students in the previous academic year."
              data={summary?.confirmed_last_year || null}
              isCurrentYear={false}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-right text-xs text-slate-400">
        Last updated: {timeAgo === 0 ? 'just now' : `${timeAgo} min ago`}
        {isFetching && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
      </div>
    </div>
  );
}
