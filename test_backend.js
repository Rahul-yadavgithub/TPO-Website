const fs = require('fs');
const file = 'backend/src/routes/previousCompanies.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    if (activeCompany) {
      if (activeCompany.contactOwner && activeCompany.contactOwner !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already active and contacted by \${activeCompany.contactOwner}. Only they can request it.\` });
      }
    }`;

const replace = `    if (activeCompany) {
      console.log('Active company contactOwner:', activeCompany.contactOwner, 'User:', req.user.name, 'Email:', req.user.email);
      if (activeCompany.contactOwner && activeCompany.contactOwner !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already active and contacted by \${activeCompany.contactOwner}. Only they can request it.\` });
      }
    }`;

content = content.replace(target, replace);
fs.writeFileSync(file, content, 'utf8');
