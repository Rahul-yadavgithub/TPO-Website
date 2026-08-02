const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const exportStatement = 'export default router;';
  const parts = content.split(exportStatement);
  
  if (parts.length > 2) {
    console.log(`Multiple exports found in ${filePath}, doing nothing.`);
    return;
  }
  
  if (parts.length === 2 && parts[1].trim().length > 0) {
    // There is content after export default router;
    const newContent = parts[0] + parts[1] + '\n' + exportStatement + '\n';
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`No content after export in ${filePath}`);
  }
}

fixFile('src/routes/api.ts');
fixFile('src/routes/previousCompanies.ts');
