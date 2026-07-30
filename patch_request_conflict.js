const fs = require('fs');
const file = 'backend/src/routes/previousCompanies.ts';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `    if ((previousCompany.contactStatus === 'requested' || previousCompany.contactStatus === 'contacted') && previousCompany.contactedByBranchId?.toString() !== branchId) {
      return res.status(409).json({ success: false, message: \`This company is already \${previousCompany.contactStatus} by the \${previousCompany.contactedByBranchName} branch. Please do not duplicate outreach.\` });
    }`;

const newBlock = `    if (previousCompany.contactStatus === 'requested' || previousCompany.contactStatus === 'contacted') {
      if (previousCompany.contactedByTprName && previousCompany.contactedByTprName !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already \${previousCompany.contactStatus} by \${previousCompany.contactedByTprName}. Only they can request it.\` });
      }
    }`;

content = content.replace(oldBlock, newBlock);

const oldBlock2 = `    const activeCompany = await Company.findOne({ normalizedName });
    if (activeCompany && activeCompany.assignedBranchId?.toString() !== branchId) {
      return res.status(409).json({ success: false, message: \`This company is already active and contacted by the \${activeCompany.assignedBranch} department (Contact Person: \${activeCompany.contactOwner || 'Unknown'}). Please do not duplicate outreach.\` });
    }`;

const newBlock2 = `    const activeCompany = await Company.findOne({ normalizedName });
    if (activeCompany) {
      if (activeCompany.contactOwner && activeCompany.contactOwner !== req.user.name) {
        return res.status(409).json({ success: false, message: \`This company is already active and contacted by \${activeCompany.contactOwner}. Only they can request it.\` });
      }
    }`;

content = content.replace(oldBlock2, newBlock2);

fs.writeFileSync(file, content, 'utf8');
