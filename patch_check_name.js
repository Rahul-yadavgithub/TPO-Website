const fs = require('fs');
const file = 'backend/src/routes/api.ts';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const company = await Company.findOne({ normalizedName });`;

const newCode = `    const { name, branchId } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let query: any = { normalizedName };
    if (branchId) query.assignedBranchId = branchId;
    
    const company = await Company.findOne(query);`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content, 'utf8');
