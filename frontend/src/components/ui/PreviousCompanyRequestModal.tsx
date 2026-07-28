import React, { useState } from 'react';
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

  const { data: pastRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['previous-requests', branchId],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/requests/${branchId}`);
      return res.data.data;
    }
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSearching(true);
    setHasSearched(true);
    setSelectedCompany(null);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/previous-companies/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Search failed.');
    } finally {
      setSearching(false);
    }
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
                <button 
                  type="submit" 
                  disabled={searching || !query.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
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
                  {results.map((comp) => (
                    <div 
                      key={comp._id}
                      onClick={() => setSelectedCompany(comp)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        selectedCompany?._id === comp._id 
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-slate-900">{comp.companyName}</h4>
                        <p className="text-xs text-slate-500 mt-1">Academic Year: {comp.academicYear || 'Past'}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedCompany?._id === comp._id ? 'border-indigo-600' : 'border-slate-300'
                      }`}>
                        {selectedCompany?._id === comp._id && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                      </div>
                    </div>
                  ))}
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
                pastRequests?.map((req: any) => (
                  <div key={req._id} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-slate-900">{req.companyName}</h4>
                        <p className="text-xs text-slate-500 mt-1">Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    {req.status === 'approved' && req.adminProvidedContact && (
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
                    )}

                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700 italic">"{req.rejectionReason}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
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
