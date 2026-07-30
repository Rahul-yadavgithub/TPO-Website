const fs = require('fs');
const file = 'backend/src/routes/previousCompanies.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `    if (previousCompany.contactStatus === 'requested' || previousCompany.contactStatus === 'contacted') {
      if (previousCompany.contactedByTprName && previousCompany.contactedByTprName !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already \${previousCompany.contactStatus} by \${previousCompany.contactedByTprName}. Only they can request it.\` });
      }
    }`;

const replace = `    if (previousCompany.contactStatus === 'requested' || previousCompany.contactStatus === 'contacted') {
      console.log('Previous company contactedByTprName:', previousCompany.contactedByTprName, 'User:', req.user.name);
      if (previousCompany.contactedByTprName && previousCompany.contactedByTprName !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already \${previousCompany.contactStatus} by \${previousCompany.contactedByTprName}. Only they can request it.\` });
      }
    }`;

content = content.replace(target, replace);
fs.writeFileSync(file, content, 'utf8');
