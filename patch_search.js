const fs = require('fs');
const file = 'backend/src/routes/previousCompanies.ts';
let content = fs.readFileSync(file, 'utf8');

const attachExistsFn = `
    const attachExistsInCurrentYear = async (companies: any[]) => {
      if (status === 'my_requests' && branchId && companies.length > 0) {
        const normalizedNames = companies.map(c => c.normalizedName);
        const existingCurrentCompanies = await Company.find({
          assignedBranchId: branchId,
          normalizedName: { $in: normalizedNames }
        }).select('normalizedName');
        const existingSet = new Set(existingCurrentCompanies.map(c => c.normalizedName));
        return companies.map(c => ({
          ...c.toObject(),
          existsInCurrentYear: existingSet.has(c.normalizedName)
        }));
      }
      return companies.map(c => c.toObject());
    };
`;

content = content.replace('    const companies = await PreviousCompany.find(query).limit(10);', attachExistsFn + '\n    const companies = await PreviousCompany.find(query).limit(10);');

content = content.replace('      const regexCompanies = await PreviousCompany.find(regexQuery).limit(10);\n      return res.status(200).json({ success: true, data: regexCompanies });', `      const regexCompanies = await PreviousCompany.find(regexQuery).limit(10);
      const finalRegexCompanies = await attachExistsInCurrentYear(regexCompanies);
      return res.status(200).json({ success: true, data: finalRegexCompanies });`);

content = content.replace('    res.status(200).json({ success: true, data: companies });', `    const finalCompanies = await attachExistsInCurrentYear(companies);
    res.status(200).json({ success: true, data: finalCompanies });`);

fs.writeFileSync(file, content, 'utf8');
