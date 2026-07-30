const fs = require('fs');
const file = 'frontend/src/components/ui/PreviousContactsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `                            <div className="bg-white p-4 rounded-xl border border-blue-100">
                              <h6 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
                                Final Details to Save
                                {selectedContactIsVerified && <span className="ml-2 text-emerald-600 lowercase normal-case font-normal">(Verified - Cannot edit)</span>}
                              </h6>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">HR Name</label>
                                  <input 
                                    type="text"
                                    value={editForm.hrName}
                                    onChange={e => setEditForm({...editForm, hrName: e.target.value})}
                                    disabled={selectedContactIsVerified}
                                    className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                  <input 
                                    type="email"
                                    value={editForm.hrEmail}
                                    onChange={e => setEditForm({...editForm, hrEmail: e.target.value})}
                                    disabled={selectedContactIsVerified}
                                    className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                  <input 
                                    type="text"
                                    value={editForm.hrPhone}
                                    onChange={e => setEditForm({...editForm, hrPhone: e.target.value})}
                                    disabled={selectedContactIsVerified}
                                    className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                  />
                                </div>
                              </div>`;

const newBlock = `                            {company.existsInCurrentYear && !selectedContactIsVerified && currentCompanyDetails?.hrContact ? (
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
                              <div className="bg-white p-4 rounded-xl border border-blue-100">
                                <h6 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
                                  Final Details to Save
                                  {selectedContactIsVerified && <span className="ml-2 text-emerald-600 lowercase normal-case font-normal">(Verified - Cannot edit)</span>}
                                </h6>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">HR Name</label>
                                    <input 
                                      type="text"
                                      value={editForm.hrName}
                                      onChange={e => setEditForm({...editForm, hrName: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                    <input 
                                      type="email"
                                      value={editForm.hrEmail}
                                      onChange={e => setEditForm({...editForm, hrEmail: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                    <input 
                                      type="text"
                                      value={editForm.hrPhone}
                                      onChange={e => setEditForm({...editForm, hrPhone: e.target.value})}
                                      disabled={selectedContactIsVerified}
                                      className={\`w-full p-2 border border-slate-300 rounded-lg text-sm \${selectedContactIsVerified ? 'bg-slate-50 text-slate-500' : ''}\`}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync(file, content, 'utf8');
