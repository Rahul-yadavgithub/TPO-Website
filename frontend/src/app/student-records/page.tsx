'use client';

import { ClipboardList, Sparkles, Hammer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentRecordsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'communication_tpr';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only administrators can access the Student Records dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Records</h1>
            <p className="text-slate-500 text-sm mt-1">Manage companies requiring only student data collections.</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-60"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-100">
            <Hammer className="w-10 h-10 text-blue-500" />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            Coming Soon
            <Sparkles className="w-6 h-6 text-amber-400" />
          </h2>
          
          <p className="text-slate-500 leading-relaxed mb-8">
            We are currently building this feature. Soon, you will be able to manage student records and issue Google Forms directly from this dashboard. Stay tuned!
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-sm font-medium border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            Under Development
          </div>
        </div>
      </div>
    </div>
  );
}
