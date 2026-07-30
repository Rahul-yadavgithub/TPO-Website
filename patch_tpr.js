const fs = require('fs');
const file = 'frontend/src/components/ui/PreviousContactsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the extraction block in PreviousContactsView
const oldBlock = \`      const match = key.match(nameRegex);
      if (match) {
        const idxStr = match[1] || '';
        const name = company.extraData[key];
        let phone = '';
        let email = '';
        
        const possiblePhoneKeys = [
          \\\`OTHER HR MOBILE \${idxStr}\\\`.trim(),
          \\\`OTHER HR PHONE \${idxStr}\\\`.trim(),
          \\\`OTHER HR NUMBER \${idxStr}\\\`.trim(),
          \\\`OTHER HR CONTACT \${idxStr}\\\`.trim()
        ];
        
        const possibleEmailKeys = [
          \\\`OTHER HR EMAIL \${idxStr}\\\`.trim(),
          \\\`OTHER HR MAIL \${idxStr}\\\`.trim()
        ];\`;

const newBlock = \`      const match = key.match(nameRegex);
      if (match) {
        const idxStr = match[1] || '';
        const name = company.extraData[key];
        let phone = '';
        let email = '';
        let isVerified = false;
        
        const possiblePhoneKeys = [
          \\\`OTHER HR MOBILE \${idxStr}\\\`.trim(),
          \\\`OTHER HR PHONE \${idxStr}\\\`.trim(),
          \\\`OTHER HR NUMBER \${idxStr}\\\`.trim(),
          \\\`OTHER HR CONTACT \${idxStr}\\\`.trim()
        ];
        
        const possibleEmailKeys = [
          \\\`OTHER HR EMAIL \${idxStr}\\\`.trim(),
          \\\`OTHER HR MAIL \${idxStr}\\\`.trim()
        ];

        const possibleVerifiedKeys = [
          \\\`OTHER HR VERIFIED \${idxStr}\\\`.trim()
        ];\`;

content = content.replace(oldBlock, newBlock);

content = content.replace(\`        if (name || phone || email) {
          contacts.push({
            id: \\\`extra-\${idxStr || '0'}\\\`,
            name: String(name || ''),
            email: String(email || ''),
            phone: String(phone || ''),
            source: 'Extra Data',
            isVerified: false
          });
        }\`, \`        for (const vk of possibleVerifiedKeys) {
          const actualVk = keys.find(k => k.toLowerCase() === vk.toLowerCase());
          if (actualVk) {
            isVerified = String(company.extraData[actualVk]).toLowerCase() === 'true';
            break;
          }
        }
        
        if (name || phone || email) {
          contacts.push({
            id: \\\`extra-\${idxStr || '0'}\\\`,
            name: String(name || ''),
            email: String(email || ''),
            phone: String(phone || ''),
            source: 'Extra Data',
            isVerified: isVerified
          });
        }\`);

fs.writeFileSync(file, content, 'utf8');
