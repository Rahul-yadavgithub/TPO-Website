'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { CloudUpload, History, CheckCircle2, Loader2, DownloadCloud, Settings2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function SyncCenterPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'communication_tpr';
  const userBranchName = user?.branchId?.name;

  const queryClient = useQueryClient();
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedBulkBranch, setSelectedBulkBranch] = useState<string>('');
  const [selectedInboundCourse, setSelectedInboundCourse] = useState<string>('All');
  const [selectedInboundBranch, setSelectedInboundBranch] = useState<string>('');
  const [expandedBranches, setExpandedBranches] = useState<string[]>([]);

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['sync-pending'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sync/pending`);
      return res.data;
    }
  });

  const filteredPending = isAdmin ? pending : pending?.filter((item: any) => item.branch_name === userBranchName);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['sync-history'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sync/history`);
      return res.data;
    }
  });

  const filteredHistory = isAdmin ? history : history?.filter((item: any) => item.branch_name === userBranchName);

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches`);
      return res.data;
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/settings`);
      return res.data;
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sync/branch/${branchId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      toast.success('Branch synced successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to sync branch');
    }
  });

  const bulkSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sync/bulk-sync`, { companyIds: selectedCompanies });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      setSelectedCompanies([]);
      toast.success('Bulk sync successful!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Bulk sync failed');
    }
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (branch_id: string) => {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/companies/bulk-assign`, {
        companyIds: selectedCompanies,
        branch_id
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-pending'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      setSelectedCompanies([]);
      setSelectedBulkBranch('');
      toast.success('Bulk assignment successful!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Bulk assignment failed');
    }
  });

  const inboundSyncMutation = useMutation({
    mutationFn: async (branchId?: string) => {
      const payload = branchId ? { branch_id: branchId } : {};
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sync/inbound`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Inbound Sync Complete!', {
        description: `Updated ${data.totalUpdated} companies. Conflicts: ${data.conflicts.length}`
      });
    },
    onError: () => {
      toast.error('Inbound sync failed.');
    }
  });

  const toggleSelection = (id: string) => {
    setSelectedCompanies(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleBranch = (branchName: string) => {
    setExpandedBranches(prev =>
      prev.includes(branchName)
        ? prev.filter(b => b !== branchName)
        : [...prev, branchName]
    );
  };

  const renderBranchTable = (item: any, isHistory: boolean = false) => {
    const isExpanded = expandedBranches.includes(item.branch_name);
    const shouldCollapse = item.count > 10;
    const showCompanies = !shouldCollapse || isExpanded;

    return (
      <div key={item.branch_name} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 flex flex-col">
        <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="text-lg font-bold text-slate-900">{item.branch_name} {isHistory ? `(${item.count} Synced)` : `(${item.count} Pending)`}</h4>
            {isHistory && (
              <p className="text-sm text-slate-500 mt-1">Last Synced: {format(new Date(item.lastSynced), 'MMM d, h:mm a')}</p>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            {shouldCollapse && (
              <button
                onClick={() => toggleBranch(item.branch_name)}
                className="w-full sm:w-auto text-sm bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium py-2.5 px-5 rounded-lg transition-colors shadow-sm"
              >
                {isExpanded ? 'Hide Details' : 'View Details'}
              </button>
            )}
            {!isHistory && (
              <button
                onClick={() => syncMutation.mutate(item.branch_name)}
                disabled={syncMutation.isPending}
                className="w-full sm:w-auto text-sm bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {syncMutation.isPending && syncMutation.variables === item.branch_name ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                Sync Entire Branch
              </button>
            )}
          </div>
        </div>

        {showCompanies && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 bg-slate-50/30">
            {item.companies?.map((company: any) => (
              <div key={company._id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow relative">
                <div className="flex items-start gap-3 mb-6">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={selectedCompanies.includes(company._id)}
                    onChange={() => toggleSelection(company._id)}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-800 block truncate text-base" title={company.companyName}>{company.companyName}</span>
                    <span className={`inline-block mt-2 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${isHistory ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                      {isHistory ? 'Synced' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <Link href={`/companies/${company._id}`} className="flex items-center justify-center text-sm text-slate-700 hover:text-blue-700 font-semibold py-2 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 hover:border-blue-200 shadow-sm">
                    Details
                  </Link>
                  {!isHistory ? (
                    <button
                      onClick={() => {
                        if (selectedCompanies.includes(company._id)) {
                          bulkSyncMutation.mutate();
                        } else {
                          setSelectedCompanies([company._id]);
                          setTimeout(() => bulkSyncMutation.mutate(), 0);
                        }
                      }}
                      disabled={bulkSyncMutation.isPending}
                      className="flex items-center justify-center text-sm text-blue-700 hover:text-blue-800 font-semibold py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 hover:border-blue-300 shadow-sm disabled:opacity-50"
                    >
                      Sync
                    </button>
                  ) : (
                    <div className="flex items-center justify-center text-sm text-green-700 font-semibold py-2 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 mb-4 lg:mb-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-xs border border-indigo-100 mb-3">
            <CloudUpload className="w-3.5 h-3.5" />
            <span>Master Synchronization</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Sync Center</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 sm:flex-none w-full sm:w-auto">
            {isAdmin ? (
              <>
                <select 
                  value={selectedInboundCourse}
                  onChange={(e) => {
                    setSelectedInboundCourse(e.target.value);
                    setSelectedInboundBranch('');
                  }}
                  className="w-full sm:w-auto text-sm border border-slate-200 bg-slate-50 rounded-lg py-2.5 px-4 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                >
                  <option value="All">All Courses</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                </select>
                <select
                  value={selectedInboundBranch}
                  onChange={(e) => setSelectedInboundBranch(e.target.value)}
                  className="w-full sm:w-auto text-sm border border-slate-200 bg-slate-50 rounded-lg py-2.5 px-4 text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">All Branches</option>
                  {selectedInboundCourse === 'M.Tech' ? (
                    ['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE'].map(name => {
                      const branch = branches?.find((b: any) => b.name === name);
                      if (branch) return <option key={branch._id} value={branch._id}>{branch.name}</option>;
                      return null;
                    })
                  ) : (
                    branches
                      ?.filter((b: any) => b.name !== 'Central Admin')
                      .filter((b: any) => {
                        if (selectedInboundCourse === 'B.Tech') {
                          return !b.name.toLowerCase().includes('m.tech') && !b.name.toLowerCase().includes('mtech');
                        }
                        return true;
                      })
                      .map((b: any) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))
                  )}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {userBranchName || 'Your Branch'}
              </div>
            )}
            <button
              onClick={() => inboundSyncMutation.mutate(isAdmin ? selectedInboundBranch : user?.branchId?._id)}
              disabled={inboundSyncMutation.isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {inboundSyncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              Pull Updates
            </button>
          </div>
        </div>
      </div>

      {selectedCompanies.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-4 z-10 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 text-white font-bold px-3.5 py-1.5 rounded-full text-sm shadow-sm">{selectedCompanies.length}</span>
            <span className="font-semibold text-indigo-900">Companies Selected</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            <div className="flex flex-1 sm:flex-none items-center gap-2 bg-white p-1.5 rounded-lg border border-indigo-200 shadow-sm">
              <select
                value={selectedBulkBranch}
                onChange={(e) => setSelectedBulkBranch(e.target.value)}
                className="flex-1 text-sm border-none bg-transparent rounded-md py-1.5 px-2 text-slate-700 focus:ring-0 outline-none min-w-[130px]"
              >
                <option value="">Select Branch...</option>
                {branches?.map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name} ({b.category})</option>
                ))}
              </select>
              <button
                onClick={() => bulkAssignMutation.mutate(selectedBulkBranch)}
                disabled={!selectedBulkBranch || bulkAssignMutation.isPending}
                className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold py-1.5 px-4 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {bulkAssignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bulk Assign'}
              </button>
            </div>
            <div className="hidden sm:block w-px h-8 bg-indigo-200 mx-1"></div>
            <button
              onClick={() => bulkSyncMutation.mutate()}
              disabled={bulkSyncMutation.isPending}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md disabled:opacity-50"
            >
              {bulkSyncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bulk Sync Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Pending Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-4">
          <CloudUpload className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-800">Pending Sync</h2>
        </div>

        {pendingLoading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading pending items...
          </div>
        ) : filteredPending?.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
            No pending assignments to sync.
          </div>
        ) : (
          <div className="space-y-10">
            {isAdmin ? (
              <>
                {/* Pending: Circuital */}
                {filteredPending?.filter((item: any) => item.branch_category === 'Circuital').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      Circuital Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredPending.filter((item: any) => item.branch_category === 'Circuital').map((item: any) => renderBranchTable(item))}
                    </div>
                  </div>
                )}

                {/* Pending: Core */}
                {filteredPending?.filter((item: any) => item.branch_category === 'Core').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2 mt-8">
                      <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                      Core Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredPending.filter((item: any) => item.branch_category === 'Core').map((item: any) => renderBranchTable(item))}
                    </div>
                  </div>
                )}

                {/* Pending: Other */}
                {filteredPending?.filter((item: any) => item.branch_category !== 'Circuital' && item.branch_category !== 'Core').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2 mt-8">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      Other Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredPending.filter((item: any) => item.branch_category !== 'Circuital' && item.branch_category !== 'Core').map((item: any) => renderBranchTable(item))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {filteredPending?.map((item: any) => renderBranchTable(item))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* History Section */}
      <section className="space-y-6 pt-8 border-t border-slate-200">
        <div className="flex items-center gap-2 border-b pb-4">
          <History className="w-6 h-6 text-slate-600" />
          <h2 className="text-2xl font-bold text-slate-800">Sync History</h2>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-2 text-slate-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading history...
          </div>
        ) : filteredHistory?.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
            No sync history available yet.
          </div>
        ) : (
          <div className="space-y-10">
            {isAdmin ? (
              <>
                {/* History: Circuital */}
                {filteredHistory?.filter((item: any) => item.branch_category === 'Circuital').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      Circuital Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredHistory.filter((item: any) => item.branch_category === 'Circuital').map((item: any) => renderBranchTable(item, true))}
                    </div>
                  </div>
                )}

                {/* History: Core */}
                {filteredHistory?.filter((item: any) => item.branch_category === 'Core').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2 mt-8">
                      <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                      Core Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredHistory.filter((item: any) => item.branch_category === 'Core').map((item: any) => renderBranchTable(item, true))}
                    </div>
                  </div>
                )}

                {/* History: Other */}
                {filteredHistory?.filter((item: any) => item.branch_category !== 'Circuital' && item.branch_category !== 'Core').length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2 mt-8">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      Other Branches
                    </h3>
                    <div className="space-y-2">
                      {filteredHistory.filter((item: any) => item.branch_category !== 'Circuital' && item.branch_category !== 'Core').map((item: any) => renderBranchTable(item, true))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {filteredHistory?.map((item: any) => renderBranchTable(item, true))}
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
