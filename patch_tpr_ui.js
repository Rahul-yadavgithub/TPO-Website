const fs = require('fs');
const file = 'frontend/src/components/ui/PreviousContactsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for sub-tab
content = content.replace("const [searchQuery, setSearchQuery] = useState('');", "const [searchQuery, setSearchQuery] = useState('');\n  const [myRequestsSubTab, setMyRequestsSubTab] = useState<'new' | 'existing'>('new');");

// 2. Add verification toggle state
content = content.replace("const [selectedContactIsVerified, setSelectedContactIsVerified] = useState(false);", "const [selectedContactIsVerified, setSelectedContactIsVerified] = useState(false);\n  const [manualVerifyToggle, setManualVerifyToggle] = useState(false);");

// Reset manualVerifyToggle on modal open/close
content = content.replace("setSelectedContactIsVerified(false);", "setSelectedContactIsVerified(false);\n      setManualVerifyToggle(false);");
content = content.replace("setEditForm({ hrName: '', hrEmail: '', hrPhone: '' });", "setEditForm({ hrName: '', hrEmail: '', hrPhone: '' });\n                                    setManualVerifyToggle(false);");

// Pass verification state in mutation
content = content.replace("updateContactMutation.mutate({ companyId: company._id, isVerified: selectedContactIsVerified })", "updateContactMutation.mutate({ companyId: company._id, isVerified: selectedContactIsVerified || manualVerifyToggle })");

// Render the verification toggle if unverified
content = content.replace("className=\"px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2\"", "className=\"px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2\"");

const toggleUI = `
                                  {!selectedContactIsVerified && (
                                    <div className="flex-1 flex items-center">
                                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                        <input 
                                          type="checkbox"
                                          checked={manualVerifyToggle}
                                          onChange={e => setManualVerifyToggle(e.target.checked)}
                                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">Mark contact as verified</span>
                                      </label>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 ml-auto">
`;
content = content.replace(`<button \n                                    onClick={() => setUpdateModalCompany(null)}`, toggleUI + `<button \n                                    onClick={() => setUpdateModalCompany(null)}`);

// Render the sub-tabs in My Requests
const subTabsUI = `
              {isMyTab && (
                <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
                  <button 
                    onClick={() => setMyRequestsSubTab('new')}
                    className={\`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors \${myRequestsSubTab === 'new' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}\`}
                  >
                    New Companies
                  </button>
                  <button 
                    onClick={() => setMyRequestsSubTab('existing')}
                    className={\`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors \${myRequestsSubTab === 'existing' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}\`}
                  >
                    Existing Companies
                  </button>
                </div>
              )}
`;

content = content.replace("const displayData = isSearchActive ? searchResults : currentData?.data;", `
          let displayData = isSearchActive ? searchResults : currentData?.data;
          if (isMyTab && displayData) {
            displayData = displayData.filter((c: any) => myRequestsSubTab === 'existing' ? c.existsInCurrentYear : !c.existsInCurrentYear);
          }
`);

content = content.replace("<div className=\"space-y-4\">", subTabsUI + "\n                <div className=\"space-y-4\">");


fs.writeFileSync(file, content, 'utf8');
