import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, History, AlertCircle, Phone, Mail, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface PreviousCompanyRequestModalProps {
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PreviousCompanyRequestModal({ branchId, onClose, onSuccess }: PreviousCompanyRequestModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('history');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const { data: pastRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['previous-requests', branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/requests/${branchId}`);
      return res.data.data;
    }
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/search?q=${encodeURIComponent(query)}`);
        setResults(res.data.data);
      } catch (error) {
        console.error(error);
        toast.error('Search failed.');
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled automatically via debounce in useEffect
  };

  const handleRequest = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/request`, {
        companyId: selectedCompany._id,
        companyName: selectedCompany.companyName,
        branchId
      });
      toast.success('Contact request submitted to Admin successfully.');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 pb-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <History className="w-6 h-6 text-indigo-600" />
              Previous Year Contacts
            </h2>
            <div className="flex gap-6 mt-6">
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                My Requests
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === 'search' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Make Request
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors self-start">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'search' && (
            <>
              <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search past companies by name..." 
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {/* Search button removed as autocomplete is automatic */}
              </form>

              {hasSearched && !searching && results.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-600" />
                  <h3 className="font-bold text-lg mb-1">Company Not Found</h3>
                  <p className="text-sm">This company is not in the previous year's contact list.</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700 mb-2">Search Results</h3>
                  {results.map((comp) => {
                    const isUnavailable = comp.contactStatus === 'requested' || comp.contactStatus === 'contacted';
                    return (
                    <div 
                      key={comp._id}
                      onClick={() => !isUnavailable && setSelectedCompany(comp)}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                        isUnavailable
                          ? 'border-slate-200 bg-slate-100 opacity-75 cursor-not-allowed'
                          : selectedCompany?._id === comp._id 
                            ? 'border-indigo-600 bg-indigo-50 cursor-pointer' 
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-slate-900">{comp.companyName}</h4>
                        <p className="text-xs text-slate-500 mt-1">Academic Year: {comp.academicYear || 'Past'}</p>
                        {isUnavailable && (
                          <p className="text-xs text-amber-600 font-bold mt-1">
                            Already {comp.contactStatus === 'contacted' ? 'contacted' : 'requested'} by {comp.contactedByBranchName || 'another branch'}
                          </p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isUnavailable ? 'border-slate-300 bg-slate-200' : selectedCompany?._id === comp._id ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {selectedCompany?._id === comp._id && !isUnavailable && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {requestsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
              ) : pastRequests?.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>You haven't requested any past company contacts yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-slate-700">{pastRequests?.length || 0}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Total Requests</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-amber-700">{(pastRequests || []).filter((r: any) => r.status === 'pending').length}</div>
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mt-1">Pending</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <div className="text-2xl font-black text-emerald-700">{(pastRequests || []).filter((r: any) => r.status === 'approved').length}</div>
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mt-1">Approved</div>
                    </div>
                  </div>

                  {(pastRequests || []).filter((r: any) => r.status === 'approved').length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <p>You have no approved requests yet.</p>
                      <p className="text-sm mt-1">Check back later when Admin approves your pending requests.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-slate-700 mb-2">Approved Company Details</h3>
                      {(pastRequests || []).filter((req: any) => req.status === 'approved').map((req: any) => (
                        <div key={req._id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden transition-all duration-200">
                          {/* Accordion Header */}
                          <div 
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedCompanyId(expandedCompanyId === req._id ? null : req._id)}
                          >
                            <h4 className="font-bold text-slate-900">{req.companyName}</h4>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                              {expandedCompanyId === req._id ? 'Hide Details' : 'View Details'}
                            </span>
                          </div>
                          
                          {/* Accordion Body */}
                          {expandedCompanyId === req._id && req.adminProvidedContact && (
                            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
                              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
                                <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-2">Admin Provided Contact</p>
                                {req.adminProvidedContact.name && (
                                  <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <UserIcon className="w-4 h-4 text-indigo-500" /> {req.adminProvidedContact.name}
                                  </div>
                                )}
                                {req.adminProvidedContact.email && (
                                  <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <Mail className="w-4 h-4 text-indigo-500" /> {req.adminProvidedContact.email}
                                  </div>
                                )}
                                {req.adminProvidedContact.phone && (
                                  <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <Phone className="w-4 h-4 text-indigo-500" /> {req.adminProvidedContact.phone}
                                  </div>
                                )}
                                {req.adminProvidedContact.notes && (
                                  <div className="mt-2 text-sm text-slate-600 italic">
                                    "{req.adminProvidedContact.notes}"
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
          >
            {activeTab === 'search' ? 'Cancel' : 'Close'}
          </button>
          {activeTab === 'search' && (
            <button 
              onClick={handleRequest}
              disabled={!selectedCompany || submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Request Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
