import React from 'react';
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TransferRequestsOutgoingViewProps {
  ownerId: string;
  ownerType: 'branch' | 'tpo';
  requests: any[];
  isLoading: boolean;
  onBack: () => void;
}

export function TransferRequestsOutgoingView({
  requests,
  isLoading,
  onBack
}: TransferRequestsOutgoingViewProps) {
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full">
          <button 
            onClick={onBack}
            className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-full transition-colors group shrink-0 mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 group-hover:text-slate-900" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 mb-1 sm:mb-0 flex-wrap">
              <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0" />
              Conflict Requests
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Track the status of transfer requests you made for conflicting companies.</p>
          </div>
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[70vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-4" />
            <p className="text-slate-500 font-medium">Loading your requests...</p>
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <ShieldAlert className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Requests Found</h3>
            <p className="text-slate-500 max-w-md mx-auto">You haven't made any transfer requests for conflicting companies yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-orange-300 transition-colors shadow-sm flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  req.status === 'pending' ? 'bg-orange-400' :
                  req.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{req.companyName}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                      req.status === 'pending' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {req.status === 'pending' && <Clock className="w-3 h-3" />}
                      {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {req.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mb-3">
                    Requested from <span className="font-semibold text-slate-900">{req.fromOwnerId}</span> ({req.fromOwnerType})
                  </div>
                  
                  <div className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                    Requested on: {format(new Date(req.createdAt), 'MMM dd, yyyy - hh:mm a')}
                  </div>
                </div>
                
                {req.status === 'approved' && (
                  <div className="flex flex-col items-center justify-center bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-emerald-800">
                    <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-center">Transfer<br/>Complete</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
