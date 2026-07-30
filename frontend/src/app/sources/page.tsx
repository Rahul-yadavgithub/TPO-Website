'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Power, Trash2, Edit2, Play, Globe, Link2, Loader2, Activity, CheckCircle2 } from 'lucide-react';
import { AddSourceModal } from '@/components/AddSourceModal';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface ScanHistory {
  _id: string;
  status: 'running' | 'completed' | 'failed';
  phase?: string;
  companiesFound: number;
  newCompaniesAdded: number;
  durationMs: number;
}

export default function SourcesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<any | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'completed' | 'error'>('idle');

  const { data: sources, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/sources`);
      return res.data;
    },
  });

  const toggleSource = useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/sources/${id}/toggle`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success('Source deleted successfully');
      setSourceToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete source');
      setSourceToDelete(null);
    }
  });

  const saveSource = async (data: any) => {
    await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/sources`, data);
    queryClient.invalidateQueries({ queryKey: ['sources'] });
  };

  const triggerSingleScan = async (sourceId: string, platformName: string) => {
    try {
      toast.info(`Scan started for ${platformName}. Check Scan History for progress.`);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scan/trigger/${sourceId}`);
    } catch (error) {
      toast.error(`Failed to trigger scan for ${platformName}`);
    }
  };

  const triggerScan = useMutation({
    mutationFn: async () => {
      setScanStatus('scanning');
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scan/trigger`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Global scan engaged successfully!');
      setTimeout(() => setScanStatus('completed'), 5000);
      setTimeout(() => setScanStatus('idle'), 10000);
    },
    onError: () => {
      toast.error('Failed to trigger global scan');
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 5000);
    }
  });

  const isGlobalScanning = scanStatus === 'scanning' || triggerScan.isPending;



  return (
    <>
      <div className="p-8 max-w-7xl mx-auto transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shadow-sm">
                <Activity className="w-6 h-6" />
              </div>
              Scan Center
            </h1>
            <p className="text-slate-500 max-w-2xl text-base">
              Add your favorite companies and platforms to automate the discovery process.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none justify-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm whitespace-nowrap text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              Add Source
            </button>
            <button 
              onClick={() => triggerScan.mutate()}
              disabled={isGlobalScanning}
              className={`flex-1 md:flex-none justify-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg whitespace-nowrap text-sm sm:text-base ${
                isGlobalScanning 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                  : scanStatus === 'completed'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5'
              }`}
            >
              {isGlobalScanning ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
              ) : scanStatus === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              ) : (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
              )}
              {isGlobalScanning ? 'ENGAGING...' : scanStatus === 'completed' ? 'ENGAGED' : 'ENGAGE ALL'}
            </button>
          </div>
        </div>

        <AddSourceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={saveSource}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
            ))}
          </div>
        ) : sources?.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No sources configured</h3>
            <p className="text-slate-500 mb-6">Add your first job board or career page to start extracting companies.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-5 py-2.5 rounded-lg inline-flex items-center gap-2 font-medium transition-colors border border-slate-300"
            >
              <Plus className="w-5 h-5" />
              Add Custom Source
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sources?.map((source: any) => (
              <div 
                key={source._id} 
                className={`bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden ${
                  source.isEnabled ? 'border-slate-200' : 'border-slate-200 opacity-75'
                }`}
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{source.platformName}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
                          {source.sourceType || 'Unknown'}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${source.isEnabled ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleSource.mutate(source._id)}
                      className={`p-2 rounded-full transition-colors ${
                        source.isEnabled 
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={source.isEnabled ? "Disable Source" : "Enable Source"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                  {source.sourceUrl && (
                    <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1.5 truncate">
                      <Link2 className="w-3 h-3" />
                      {source.sourceUrl}
                    </a>
                  )}
                </div>

                {/* Body */}
                <div className="p-5 flex-1 bg-slate-50">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Method</p>
                      <p className="font-semibold text-slate-900">{source.scanMethod || 'Default'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Frequency</p>
                      <p className="font-semibold text-slate-900">{source.scanFrequency || 'Manual'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Category</p>
                      <p className="font-semibold text-slate-900">{source.companyCategory || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Last Scan</p>
                      <p className="font-semibold text-slate-900">
                        {source.lastScanDate 
                          ? formatDistanceToNow(new Date(source.lastScanDate), { addSuffix: true }) 
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      disabled
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Edit (Coming soon)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSourceToDelete(source)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => triggerSingleScan(source._id, source.platformName)}
                    disabled={!source.isEnabled || isGlobalScanning}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run Scan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!sourceToDelete}
        onClose={() => setSourceToDelete(null)}
        onConfirm={() => sourceToDelete && deleteSource.mutate(sourceToDelete._id)}
        isDeleting={deleteSource.isPending}
        title="Delete Source"
        description="Are you sure you want to delete this source? The AI will no longer scan this platform during scheduled jobs. Existing companies extracted from this source will remain in your database."
        itemName={sourceToDelete?.platformName}
      />
    </>
  );
}
