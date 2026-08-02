'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Trash2, 
  RefreshCcw, 
  Loader2,
  X,
  ShieldCheck,
  Building2,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TPOManagementPage() {
  const { user: userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const queryClient = useQueryClient();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [tpoName, setTpoName] = useState('');
  const [tpoDesignation, setTpoDesignation] = useState('');
  const [tpoType, setTpoType] = useState<'Faculty' | 'Staff'>('Faculty');

  const [selectedTpo, setSelectedTpo] = useState<any>(null);
  const [replacementTpoId, setReplacementTpoId] = useState('');

  const { data: tpos, isLoading } = useQuery({
    queryKey: ['admin-tpos'],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/tpos`, {
        withCredentials: true
      });
      return res.data.data;
    },
    enabled: isAdmin
  });

  const addMutation = useMutation({
    mutationFn: async (newTpo: any) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/tpos`, newTpo, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPO Added successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tpos'] });
      setAddModalOpen(false);
      setTpoName('');
      setTpoDesignation('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add TPO')
  });

  const replaceMutation = useMutation({
    mutationFn: async ({ newTpoId, oldTpoId }: { newTpoId: string, oldTpoId: string }) => {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/replace-tpo/${newTpoId}`, { replaceTpoId: oldTpoId }, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPO Replaced successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tpos'] });
      setReplaceModalOpen(false);
      setSelectedTpo(null);
      setReplacementTpoId('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to replace TPO')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/admin/tpos/${id}`, { withCredentials: true });
    },
    onSuccess: () => {
      toast.success('TPO Deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tpos'] });
      setDeleteModalOpen(false);
      setSelectedTpo(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete TPO')
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpoName.trim() || !tpoDesignation.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    addMutation.mutate({ name: tpoName, designation: tpoDesignation, type: tpoType });
  };

  const handleReplaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacementTpoId || !selectedTpo) return;
    replaceMutation.mutate({ newTpoId: replacementTpoId, oldTpoId: selectedTpo._id });
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admin only.</div>;
  }

  const activeTpos = tpos?.filter((t: any) => t.status === 'active') || [];
  const facultyTpos = activeTpos.filter((t: any) => t.type === 'Faculty');
  const staffTpos = activeTpos.filter((t: any) => t.type === 'Staff');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            TPO Management
          </h1>
          <p className="text-slate-500 mt-2">Manage TPO Faculty and Staff records.</p>
        </div>
        <button
          onClick={() => {
            setTpoName('');
            setTpoDesignation('');
            setTpoType('Faculty');
            setAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" /> Add TPO
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <TpoSection 
            title="Faculty Coordinators" 
            icon={<Briefcase className="w-5 h-5 text-indigo-600" />}
            tpos={facultyTpos} 
            onReplace={(t) => { setSelectedTpo(t); setReplaceModalOpen(true); }}
            onDelete={(t) => { setSelectedTpo(t); setDeleteModalOpen(true); }}
          />
          <TpoSection 
            title="Staff Members" 
            icon={<Building2 className="w-5 h-5 text-emerald-600" />}
            tpos={staffTpos} 
            onReplace={(t) => { setSelectedTpo(t); setReplaceModalOpen(true); }}
            onDelete={(t) => { setSelectedTpo(t); setDeleteModalOpen(true); }}
          />
        </div>
      )}

      {/* Add TPO Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Add New TPO
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={tpoName}
                    onChange={(e) => setTpoName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="e.g. Dr. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={tpoDesignation}
                    onChange={(e) => setTpoDesignation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="e.g. Faculty Coordinator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={tpoType}
                    onChange={(e) => setTpoType(e.target.value as 'Faculty' | 'Staff')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  >
                    <option value="Faculty">Faculty</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 py-2.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add TPO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace TPO Modal */}
      {replaceModalOpen && selectedTpo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-indigo-600" /> Replace TPO
              </h3>
              <button onClick={() => setReplaceModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReplaceSubmit}>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">
                  Replacing <strong>{selectedTpo.name}</strong>. All assigned companies will be transferred to the new TPO.
                </p>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select New TPO:</label>
                <select
                  required
                  value={replacementTpoId}
                  onChange={(e) => setReplacementTpoId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="">-- Select Replacement --</option>
                  {activeTpos
                    .filter((t: any) => t._id !== selectedTpo._id && t.type === selectedTpo.type)
                    .map((t: any) => (
                      <option key={t._id} value={t._id}>{t.name} ({t.designation})</option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">Only showing active TPOs of the same type ({selectedTpo.type}).</p>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setReplaceModalOpen(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replacementTpoId || replaceMutation.isPending}
                  className="flex-1 py-2.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {replaceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Replace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedTpo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" /> Remove TPO
              </h3>
              <button onClick={() => setDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600">
                Are you sure you want to remove <strong>{selectedTpo.name}</strong>? This action cannot be undone if they have no assigned companies.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(selectedTpo._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TpoSection({ title, icon, tpos, onReplace, onDelete }: { title: string, icon: React.ReactNode, tpos: any[], onReplace: (t: any) => void, onDelete: (t: any) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
          {tpos.length} Active
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {tpos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No {title.toLowerCase()} found.</div>
        ) : (
          tpos.map(tpo => (
            <div key={tpo._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{tpo.name}</h3>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> {tpo.designation}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={() => onReplace(tpo)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" /> Replace
                </button>
                <button
                  onClick={() => onDelete(tpo)}
                  className="px-4 py-2 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-600 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
