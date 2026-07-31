import React from 'react';
import { ArrowLeft, MessageSquare, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TransferRequestsIncomingViewProps {
  ownerId: string;
  ownerType: 'branch' | 'tpo';
  requests: any[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  onBack: () => void;
}

export function TransferRequestsIncomingView({
  requests,
  isLoading,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
  onBack
}: TransferRequestsIncomingViewProps) {
  
  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button 
            onClick={onBack}
            className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-full transition-colors group shrink-0 mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 group-hover:text-slate-900" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1 sm:mb-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-600 shrink-0" />
                Transfer Requests
              </h2>
              <span className="sm:hidden bg-pink-100 text-pink-800 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                {pendingRequests.length} Pending
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Manage requests from other portals who want to take ownership of your companies.</p>
          </div>
        </div>
        <div className="hidden sm:block bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-bold shadow-sm shrink-0">
          {pendingRequests.length} Pending
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[70vh]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600 mb-4" />
            <p className="text-slate-500 font-medium">Loading incoming requests...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-20 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-500 max-w-md mx-auto">You don't have any pending transfer requests from other portals.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req._id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-pink-300 transition-colors shadow-sm flex flex-col md:flex-row md:items-center gap-4 relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{req.companyName}</h4>
                    <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Request
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mb-3">
                    Requested by <span className="font-semibold text-slate-900">{req.requestedBy?.name}</span> ({req.requestedBy?.email}) 
                    {' '}from <span className="font-semibold text-slate-900">{req.toOwnerId}</span> ({req.toOwnerType})
                  </div>
                  
                  {req.providedHRDetails && Object.keys(req.providedHRDetails).some(k => req.providedHRDetails[k]) && (
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Provided Contact Info
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {req.providedHRDetails.hrName && <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-900">{req.providedHRDetails.hrName}</span></div>}
                        {req.providedHRDetails.hrEmail && <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900">{req.providedHRDetails.hrEmail}</span></div>}
                        {req.providedHRDetails.hrPhone && <div><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-900">{req.providedHRDetails.hrPhone}</span></div>}
                        {req.providedHRDetails.linkedinProfile && <div className="md:col-span-2 truncate"><span className="text-slate-500">LinkedIn:</span> <a href={req.providedHRDetails.linkedinProfile} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{req.providedHRDetails.linkedinProfile}</a></div>}
                      </div>
                      <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-1.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        If approved, this contact info will be intelligently merged into your database to prevent data loss.
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-400 mt-3 font-medium flex items-center gap-1">
                    Requested on: {format(new Date(req.createdAt), 'MMM dd, yyyy - hh:mm a')}
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 md:min-w-[120px] mt-4 md:mt-0">
                  <button 
                    onClick={() => onApprove(req._id)}
                    disabled={isApproving || isRejecting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-2.5 sm:py-2 px-4 rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Approve
                  </button>
                  <button 
                    onClick={() => onReject(req._id)}
                    disabled={isApproving || isRejecting}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:text-slate-400 disabled:border-slate-200 font-bold py-2.5 sm:py-2 px-4 rounded-lg transition-colors shadow-sm"
                  >
                    <XCircle className="w-4 h-4 shrink-0" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
