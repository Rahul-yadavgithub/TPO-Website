const fs = require('fs');
const path = './src/routes/api.ts';
let code = fs.readFileSync(path, 'utf8');

// Find the bulk-validate-companies route
// and update it to return potential matches
// The route starts around router.post('/branch/:branch_id/bulk-validate-companies'
