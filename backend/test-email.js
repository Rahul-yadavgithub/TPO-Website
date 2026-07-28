require('dotenv').config();
const { sendRecoveryEmail } = require('./src/services/email.service.ts');
// since it's TS, maybe run it with ts-node or just use node with native fetch
