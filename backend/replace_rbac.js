const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/routes/previousCompanies.ts');
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('authorizeRoles')) {
  content = content.replace(
    "import { protect } from '../middleware/auth';",
    "import { protect, authorizeRoles } from '../middleware/auth';"
  );
}

// Replace route signatures and remove inline checks
// router.get('/all', async (req: any, res) => {
//   if (req.user?.role !== 'admin' && req.user?.role !== 'communication_tpr') { ... }
content = content.replace(
  /router\.(get|post|put|delete|patch)\('([^']+)', async \(req(?:: any)?, res\) => \{\s*if \(req\.user\?\.role !== 'admin' && req\.user\?\.role !== 'communication_tpr'\) \{\s*return res\.status\(403\)\.json\(\{ error: '[^']+' \}\);\s*\}/g,
  "router.$1('$2', authorizeRoles('admin', 'communication_tpr'), async (req: any, res) => {"
);

content = content.replace(
  /router\.(get|post|put|delete|patch)\('([^']+)', async \(req(?:: any)?, res\) => \{\s*if \(req\.user\?\.role !== 'admin'\) \{\s*return res\.status\(403\)\.json\(\{ error: '[^']+' \}\);\s*\}/g,
  "router.$1('$2', authorizeRoles('admin'), async (req: any, res) => {"
);

fs.writeFileSync(file, content);
console.log('done');
