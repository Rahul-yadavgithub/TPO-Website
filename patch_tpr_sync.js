const fs = require('fs');
const file = 'frontend/src/components/ui/PreviousContactsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add current company query
const queryInjection = `
  const { data: currentCompanyDetails, isLoading: isLoadingCurrentCompany } = useQuery({
    queryKey: ['current-company-details', editingCompanyId, branchId],
    queryFn: async () => {
      const company = myRequestedData?.data.find((c: any) => c._id === editingCompanyId);
      if (!company) return null;
      const res = await axios.get(\`\${process.env.NEXT_PUBLIC_API_URL}/companies/check-name?name=\${encodeURIComponent(company.companyName)}&branchId=\${branchId}\`, { withCredentials: true });
      return res.data;
    },
    enabled: !!editingCompanyId && !!branchId
  });

  const [selectedDataSource, setSelectedDataSource] = useState<'current' | 'previous'>('previous');
`;

content = content.replace("const updateContactMutation = useMutation({", queryInjection + "\n  const updateContactMutation = useMutation({");

// 2. Reset data source on open
content = content.replace("setManualVerifyToggle(false);", "setManualVerifyToggle(false);\n                                    setSelectedDataSource('previous');");
content = content.replace("setManualVerifyToggle(false);", "setManualVerifyToggle(false);\n                                    setSelectedDataSource('previous');");

// 3. Update the modal UI for comparison
const oldFormStart = `<div className="space-y-3">
                                <div>`;

const newFormStart = `
                            {company.existsInCurrentYear && !selectedContactIsVerified && currentCompanyDetails?.hrContact ? (
                              <div className="mb-6 space-y-4">
                                <h6 className="text-sm font-bold text-slate-700">Compare Contact Details</h6>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  
                                  {/* Current Database Data */}
                                  <div 
                                    onClick={() => {
                                      setSelectedDataSource('current');
                                      setEditForm({ hrName: currentCompanyDetails.hrContact.name || '', hrEmail: currentCompanyDetails.hrContact.email || '', hrPhone: currentCompanyDetails.hrContact.mobile || '' });
                                    }}
                                    className={\`p-4 rounded-xl border-2 cursor-pointer transition-all \${selectedDataSource === 'current' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-200 bg-white'}\`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <input type="radio" checked={selectedDataSource === 'current'} onChange={() => {}} className="text-emerald-600 focus:ring-emerald-500" />
                                      <span className="font-bold text-slate-800 text-sm">Your Database Data</span>
                                    </div>
                                    <div className="space-y-1 ml-6 text-sm text-slate-600">
                                      <p><span className="font-semibold text-slate-700">Name:</span> {currentCompanyDetails.hrContact.name || 'N/A'}</p>
                                      <p><span className="font-semibold text-slate-700">Email:</span> {currentCompanyDetails.hrContact.email || 'N/A'}</p>
                                      <p><span className="font-semibold text-slate-700">Phone:</span> {currentCompanyDetails.hrContact.mobile || 'N/A'}</p>
                                    </div>
                                  </div>

                                  {/* Previous Year Data */}
                                  <div 
                                    onClick={() => {
                                      setSelectedDataSource('previous');
                                      const prevContact = availableContacts.find(c => c.id === selectedContactId);
                                      if (prevContact) {
                                        setEditForm({ hrName: prevContact.name, hrEmail: prevContact.email, hrPhone: prevContact.phone });
                                      }
                                    }}
                                    className={\`p-4 rounded-xl border-2 cursor-pointer transition-all \${selectedDataSource === 'previous' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-200 bg-white'}\`}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <input type="radio" checked={selectedDataSource === 'previous'} onChange={() => {}} className="text-blue-600 focus:ring-blue-500" />
                                      <span className="font-bold text-slate-800 text-sm">Upcoming Data</span>
                                    </div>
                                    <div className="space-y-1 ml-6 text-sm text-slate-600">
                                      {(() => {
                                        const pc = availableContacts.find(c => c.id === selectedContactId);
                                        return (
                                          <>
                                            <p><span className="font-semibold text-slate-700">Name:</span> {pc?.name || 'N/A'}</p>
                                            <p><span className="font-semibold text-slate-700">Email:</span> {pc?.email || 'N/A'}</p>
                                            <p><span className="font-semibold text-slate-700">Phone:</span> {pc?.phone || 'N/A'}</p>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>`;

content = content.replace(oldFormStart, newFormStart);

const oldFormEnd = `</div>
                              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">`;

const newFormEnd = `</div>
                            )}
                              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">`;

content = content.replace(oldFormEnd, newFormEnd);

fs.writeFileSync(file, content, 'utf8');
