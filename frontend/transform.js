const fs = require('fs');

let content = fs.readFileSync('src/app/branch-portal/page.tsx', 'utf-8');

// Global Replacements
content = content.replace(/BranchPortalPage/g, 'TpoPortalPage');
content = content.replace(/selectedBranchId/g, 'selectedTPO');
content = content.replace(/setSelectedBranchId/g, 'setSelectedTPO');
content = content.replace(/\/branch\/\$\{selectedBranchId\}/g, '/tpo/${selectedTPO}');
content = content.replace(/\/previous-companies\/requests\/\$\{selectedBranchId\}/g, '/previous-companies/tpo/${selectedTPO}'); // We will replace the past companies request logic later
content = content.replace(/branchName/g, 'tpoName');
content = content.replace(/Branch synced to Google Sheets/g, 'TPO synced to Google Sheets');
content = content.replace(/sync branch/g, 'sync TPO');
content = content.replace(/branch/gi, 'tpo'); // Only where appropriate. Let's do it carefully.
// Wait, global replace of branch to tpo is dangerous (e.g. branches, branch_id).

// Re-read and do specific replacements
content = fs.readFileSync('src/app/branch-portal/page.tsx', 'utf-8');
content = content.replace(/BranchPortalPage/g, 'TpoPortalPage');
content = content.replace(/selectedBranchId/g, 'selectedTPO');
content = content.replace(/setSelectedBranchId/g, 'setSelectedTPO');
content = content.replace(/\/branch\/\$\{selectedTPO\}/g, '/tpo/${selectedTPO}'); // selectedBranchId is already replaced
content = content.replace(/branchName/g, 'tpoName');

// The dropdown logic
const oldDropdown = `          {branchesLoading || userLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading branches...
            </div>
          ) : (
            <select 
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
              value={selectedTPO}
              onChange={(e) => {
                setSelectedTPO(e.target.value);
                setActiveView('dashboard');
              }}
              disabled={!isAdmin && userProfile?.branchId}
            >
              <option value="" disabled>Select Branch...</option>
              {branches?.map((b: any) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          )}`;

const newDropdown = `          { (
            <div className="flex gap-2">
              <select 
                className="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                value={tpoCategory}
                onChange={(e) => {
                  setTpoCategory(e.target.value);
                  setSelectedTPO('');
                  setActiveView('dashboard');
                }}
              >
                <option value="" disabled>Select Category...</option>
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
              </select>
              
              <select 
                className="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
                value={selectedTPO}
                onChange={(e) => {
                  setSelectedTPO(e.target.value);
                  setActiveView('dashboard');
                }}
                disabled={!tpoCategory}
              >
                <option value="" disabled>Select {tpoCategory || 'Name'}...</option>
                {tpoCategory === 'Faculty' && (
                  <>
                    <option value="Dr.Somesh Kr. Sharma">Dr.Somesh Kr. Sharma</option>
                    <option value="Dr.Ray Singh Meena">Dr.Ray Singh Meena</option>
                    <option value="Dr.Swaraj Chowdhury">Dr.Swaraj Chowdhury</option>
                    <option value="Dr.jiwanjot Singh">Dr.jiwanjot Singh</option>
                    <option value="Dr.Sreeram TS">Dr.Sreeram TS</option>
                  </>
                )}
                {tpoCategory === 'Staff' && (
                  <>
                    <option value="Chandradev Raj Singh">Chandradev Raj Singh</option>
                    <option value="Atul Negi">Atul Negi</option>
                  </>
                )}
              </select>
            </div>
          )}`;

content = content.replace(oldDropdown, newDropdown);

// Add tpoCategory state
content = content.replace('const [selectedTPO, setSelectedTPO] = useState<string>(\'\');', 'const [selectedTPO, setSelectedTPO] = useState<string>(\'\');\n  const [tpoCategory, setTpoCategory] = useState<string>(\'\');');

// Replace `/branch/${selectedTPO}` endpoints with `/tpo/${selectedTPO}` since we used selectedTPO
content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/branch\/\$\{selectedTPO\}/g, '${process.env.NEXT_PUBLIC_API_URL}/tpo/${selectedTPO}');

fs.writeFileSync('src/app/tpo-portal/page.tsx', content);
