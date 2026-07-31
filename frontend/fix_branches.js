const fs = require('fs');

const files = [
  'src/app/branch-portal/page.tsx',
  'src/app/page.tsx',
  'src/app/requests/page.tsx',
  'src/app/sync/page.tsx',
  'src/app/companies/BranchCompaniesView.tsx',
  'src/components/ui/GlobalBulkUploadModal.tsx',
  'src/components/ui/GlobalManualCompanyModal.tsx',
  'src/components/ui/BranchCompanyDetailsModal.tsx'
];

const target = "['M.Tech CSE', 'M.Tech MSC', 'M.Tech ECE', 'M.Tech EE', 'M.Tech CE']";
const replacement = "['M.Tech CSE', 'M.Tech CH', 'M.Tech ECE', 'M.Tech EE', 'M.Tech MSE']";

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes(target)) {
    content = content.replaceAll(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  } else {
    console.log('Target not found in ' + file);
  }
}
