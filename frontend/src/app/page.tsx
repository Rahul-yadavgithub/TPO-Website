'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowRight, X, Search, ChevronLeft, ChevronRight,
  Mail, Phone, AlertTriangle, Users, Briefcase,
  Building2, RefreshCw, Loader2, CheckCircle, Clock, ShieldCheck, Activity, Bell
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DashboardSummary {
  pending_review_count: number;
  contact_today_count: number;
  confirmed_this_year: {
    academic_year: string;
    total: number;
  };
  confirmed_last_year: {
    academic_year: string;
    total: number;
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
  isPreviousCompany?: boolean;
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
            {company.drive_type && !company.isPreviousCompany && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${driveColor}`}>{driveLabel}</span>
            )}
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

// ─── Quick Overview Card ───────────────────────────────────────────────────────
function ActionCard({
  icon: Icon, title, value, subtitle, onClick, colorClass, bgClass, iconColor, loading
}: {
  icon: any; title: string; value: number | string; subtitle: string; onClick: () => void;
  colorClass: string; bgClass: string; iconColor: string; loading?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={`${bgClass} border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between`}
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        </div>
        <div className="flex items-end gap-2">
          <span className={`text-3xl font-black ${colorClass} leading-none`}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin my-1" /> : <AnimatedCounter target={Number(value) || 0} />}
          </span>
          <span className="text-xs text-slate-500 font-medium mb-1">{subtitle}</span>
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 transition-colors" />
      </div>
    </div>
  );
}

// ─── Activity Log Card ────────────────────────────────────────────────────────
function ActivityLogCard({ log }: { log: any }) {
  const companyName = log.company_id?.companyName || 'Unknown Company';
  const branchName = log.branch_id?.name || log.company_id?.assignedBranch || 'Unknown Branch';
  const tprName = log.created_by || 'TPR';
    const timeStr = new Date(log.contact_date || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(log.contact_date || log.createdAt).toLocaleDateString();

  const outcomeMap: Record<string, string> = {
    'call_again': 'Call Again (Reschedule)',
    'brochure_jnf': 'Brochure + JNF Sent',
    'tpo_talk': 'Want to talk to TPO',
    'rejected': 'Rejected / Not Interested',
    'accepted': 'Accepted / Confirmed'
  };
  const displayOutcome = outcomeMap[log.outcome] || log.outcome || 'Logged Call';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all duration-150 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600"></div>
      <div className="flex justify-between items-start mb-2 pl-2">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <h3 className="font-bold text-slate-900 text-sm truncate">{companyName}</h3>
          {log.outcome === 'accepted' && (
            <span className="shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" /> Confirmed
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
          <Clock className="w-3 h-3" /> {timeStr}
        </span>
      </div>
      <div className="pl-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Outcome:</span>
          <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{displayOutcome}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Logged By:</span>
          <span className="font-medium text-slate-900 flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" /> {tprName}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Branch:</span>
          <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{branchName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Slide-Over Panel ────────────────────────────────────────────────
function ActivitySlideOverPanel({
  open, onClose, branchId, isAdmin, branches
}: { open: boolean; onClose: () => void; branchId?: string; isAdmin?: boolean; branches?: any[]; }) {
  const [courseFilter, setCourseFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['recent-activity', branchId],
    queryFn: async () => {
      const params: any = {};
      if (branchId) params.branchId = branchId;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/recent-activity`, { params });
      return res.data.data;
    },
    enabled: open,
    refetchInterval: open ? 15000 : false, // Poll every 15s when open
  });

  const logs = data || [];

  const filtered = logs.filter((log: any) => {
    const isStandard = ['call_again', 'brochure_jnf', 'tpo_talk', 'rejected', 'accepted'].includes(log.outcome);
    let matchStatus = false;
    
    if (statusFilter === 'All') {
      matchStatus = true;
    } else if (statusFilter === 'custom') {
      matchStatus = !isStandard; // If it's custom, it's not a standard predefined outcome
    } else {
      matchStatus = log.outcome === statusFilter;
    }

    const branchName = log.branch_id?.name || log.company_id?.assignedBranch || '';
    
    let matchCourse = true;
    if (courseFilter === 'M.Tech') {
      matchCourse = branchName.includes('M.Tech');
    } else if (courseFilter === 'B.Tech') {
      matchCourse = !branchName.includes('M.Tech');
    }
    
    const matchBranch = branchFilter === 'All' || log.branch_id?._id === branchFilter;
    
    return matchStatus && matchCourse && matchBranch;
  });

  const outcomeOptions = [
    { label: 'Call Again (Reschedule)', value: 'call_again' },
    { label: 'Brochure + JNF Sent', value: 'brochure_jnf' },
    { label: 'Want to talk to TPO', value: 'tpo_talk' },
    { label: 'Rejected / Not Interested', value: 'rejected' },
    { label: 'Accepted / Confirmed', value: 'accepted' },
    { label: 'Custom (Type your own)', value: 'custom' }
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-250 ${open ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[400px] bg-slate-50 shadow-2xl flex flex-col transition-transform duration-250 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" /> Today's Activity
            </h2>
            <span className="text-xs text-slate-500 mt-0.5 block">Live feed of TPR contact logs</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 bg-white border-b border-slate-200 shrink-0 space-y-3 z-10 shadow-sm">
          {isAdmin && (
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={courseFilter}
                onChange={e => { setCourseFilter(e.target.value); setBranchFilter('All'); }}
              >
                <option value="All">All Courses</option>
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
              </select>
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="All">All Branches</option>
                {courseFilter === 'M.Tech' ? (
                  ['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE'].map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))
                ) : (
                  branches?.filter((b: any) => b.name !== 'Central Admin' && !b.name.includes('M.Tech')).map(b => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))
                )}
              </select>
            </div>
          )}
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Outcomes</option>
            {outcomeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 mt-10">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Fetching live activity...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">No activity yet today</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            filtered.map((log: any) => <ActivityLogCard key={log._id} log={log} />)
          )}
        </div>
      </div>
    </>
  );
}

// ─── Slide-Over Panel ─────────────────────────────────────────────────────────
function SlideOverPanel({
  open, onClose, year, title, branchId, isAdmin, branches
}: { open: boolean; onClose: () => void; year: string; title: string; branchId?: string; isAdmin?: boolean; branches?: any[]; }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [driveFilter, setDriveFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');

  const selectedBranchId = branchFilter !== 'All' ? branchFilter : branchId;

  const { data, isLoading } = useQuery({
    queryKey: ['confirmed-companies', year, page, selectedBranchId],
    queryFn: async () => {
      const params: any = { year, page };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/confirmed-companies`, {
        params
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
  title, description, summaryData, isCurrentYear, branchId, isAdmin, branches
}: {
  title: string;
  description: string;
  summaryData: DashboardSummary | null;
  isCurrentYear: boolean;
  branchId?: string;
  isAdmin?: boolean;
  branches?: any[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const data = isCurrentYear ? summaryData?.confirmed_this_year : summaryData?.confirmed_last_year;

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

          {/* Stats Area */}
          <div className="mt-4 mb-2">
            {isCurrentYear ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm font-medium text-slate-500 mb-1">Contact Today</p>
                  <span className="text-3xl font-extrabold text-blue-600 leading-none">
                    {summaryData ? <AnimatedCounter target={summaryData.contact_today_count} /> : '0'}
                  </span>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-700 mb-1">Confirmed</p>
                  <span className="text-3xl font-extrabold text-emerald-600 leading-none">
                    {data ? <AnimatedCounter target={data.total} /> : '0'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center">
                <p className="text-sm font-medium text-slate-500 mb-2">Total Companies</p>
                <span className="text-5xl font-extrabold text-slate-800 leading-none">
                  {data ? <AnimatedCounter target={data.total} /> : '0'}
                </span>
              </div>
            )}
          </div>
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
        year={isCurrentYear ? (summaryData?.confirmed_this_year?.academic_year || '') : (summaryData?.confirmed_last_year?.academic_year || '')}
        title={title}
        branchId={branchId}
        isAdmin={isAdmin}
        branches={branches}
      />
    </>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [lastUpdated] = useState(new Date());

  const { data: userProfile } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`);
      return res.data.data;
    }
  });

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'communication_tpr';

  const { data: summary, isLoading, error, refetch, isFetching } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', isAdmin ? 'all' : userProfile?.branchId],
    queryFn: async () => {
      let branchId = '';
      if (!isAdmin && userProfile?.branchId) {
        branchId = typeof userProfile.branchId === 'object' ? userProfile.branchId._id : userProfile.branchId;
      }
      const params = branchId ? { branchId } : {};
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/summary`, { params });
      return res.data;
    },
    enabled: !!userProfile,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const branchId = (!isAdmin && userProfile?.branchId) ? (typeof userProfile.branchId === 'object' ? userProfile.branchId._id : userProfile.branchId) : '';


  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`, { withCredentials: true });
      return res.data;
    },
    enabled: isAdmin
  });

  const { data: requestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/requests`, { withCredentials: true });
      return res.data.data;
    },
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['recent-activity', branchId],
    queryFn: async () => {
      const params = branchId ? { branchId } : {};
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/dashboard/recent-activity`, { params });
      return res.data.data;
    },
    enabled: !!userProfile,
    refetchInterval: 60000,
  });

  const totalPendingRequests = (requestsData?.tprs?.length || 0) + (requestsData?.contacts?.length || 0);
  const totalActivityToday = activityData?.length || 0;
  
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);



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
          <button onClick={() => { refetch(); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6 mb-8">
        {isAdmin && (
          <ActionCard
            icon={Bell}
            title="Action Required"
            value={totalPendingRequests}
            subtitle="Pending Requests"
            onClick={() => window.location.href = '/requests'}
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
            iconColor="text-amber-600"
            loading={isLoadingRequests}
          />
        )}
        <ActionCard
          icon={Activity}
          title="Live Tracking"
          value={totalActivityToday}
          subtitle="Companies Contacted Today"
          onClick={() => setActivityPanelOpen(true)}
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
          iconColor="text-indigo-600"
          loading={isLoadingActivity}
        />
      </div>





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
          <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin shadow-[0_0_15px_rgba(37,99,235,0.2)]"></div>
              <ShieldCheck className="absolute inset-0 m-auto w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="font-bold text-2xl text-slate-900 mb-3 tracking-tight">Loading Intelligence Data</h3>
            <p className="text-slate-500 font-medium">Aggregating real-time placement statistics...</p>
          </div>
        ) : (
          <>
            <StatCard
              title="Target Companies This Year"
              description="Companies expected to visit for placement drives this academic year."
              summaryData={summary || null}
              isCurrentYear={true}
              branchId={branchId}
            />
            <StatCard
              title="Confirmed Placements Last Year"
              description="Companies confirmed to have hired students in the previous academic year."
              summaryData={summary || null}
              isCurrentYear={false}
              branchId={branchId}
            />
          </>
        )}
      </div>
      
      <ActivitySlideOverPanel
        open={activityPanelOpen}
        onClose={() => setActivityPanelOpen(false)}
        branchId={branchId}
        isAdmin={isAdmin}
        branches={branchesData}
      />

      {/* Footer */}
      <div className="text-right text-xs text-slate-400">
        Last updated: {timeAgo === 0 ? 'just now' : `${timeAgo} min ago`}
        {isFetching && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
      </div>
    </div>
  );
}
