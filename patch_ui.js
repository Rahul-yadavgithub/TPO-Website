const fs = require('fs');
const file = 'frontend/src/components/ui/PastCompanyDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const handlers = `  const handleExtraContactChange = (index: number, field: keyof ExtraContact, value: any) => {
    const newContacts = [...extraContacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setExtraContacts(newContacts);
  };

  const handleRemoveExtraContact = (index: number) => {
    const newContacts = [...extraContacts];
    newContacts.splice(index, 1);
    setExtraContacts(newContacts);
  };

  const handleAddExtraContact = () => {
    const nextId = (extraContacts.length + 1).toString();
    setExtraContacts([...extraContacts, { id: nextId, name: '', phone: '', email: '', isVerified: false }]);
  };`;

content = content.replace('  const handleExtraDataChange', handlers + '\n\n  const handleExtraDataChange');

const uiChunk = `
              {((extraContacts && extraContacts.length > 0) || isEditing) && (
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Additional HR Contacts</h4>
                    {isEditing && (
                      <button 
                        onClick={handleAddExtraContact}
                        className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                      >
                        + Add HR Contact
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {extraContacts.map((c, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="HR Name"
                                value={c.name}
                                onChange={e => handleExtraContactChange(idx, 'name', e.target.value)}
                                className="w-full font-semibold text-slate-900 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 mb-2 text-sm"
                              />
                            ) : (
                              <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                {c.name || 'No Name'}
                                {c.isVerified && <ShieldCheck className="w-4 h-4 text-emerald-500" title="Verified by Admin" />}
                              </h5>
                            )}
                          </div>
                          {isEditing && (
                            <button onClick={() => handleRemoveExtraContact(idx)} className="text-red-400 hover:text-red-600 ml-2">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Phone"
                                value={c.phone}
                                onChange={e => handleExtraContactChange(idx, 'phone', e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span>{c.phone || 'N/A'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Email"
                                value={c.email}
                                onChange={e => handleExtraContactChange(idx, 'email', e.target.value)}
                                className="flex-1 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span className="truncate">{c.email || 'N/A'}</span>
                            )}
                          </div>
                        </div>
                        {isEditing && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={c.isVerified}
                                onChange={e => handleExtraContactChange(idx, 'isVerified', e.target.checked)}
                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-emerald-700">Verified</span>
                            </label>
                          </div>
                        )}
                        {!isEditing && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                             <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Source: EXTRA DATA</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
`;

content = content.replace('<div className="p-0">', uiChunk + '\n              <div className="p-0">');

fs.writeFileSync(file, content, 'utf8');
