const fs = require('fs');
const file = 'frontend/src/components/ui/PastCompanyDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add ExtraContact interface
content = content.replace('interface PastCompany {', `interface ExtraContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  isVerified: boolean;
}

interface PastCompany {`);

// 2. Add extraContacts state
content = content.replace('const [editExtraData, setEditExtraData] = useState<{ id: string; key: string; value: string }[]>([]);', `const [editExtraData, setEditExtraData] = useState<{ id: string; key: string; value: string }[]>([]);
  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);`);

// 3. Update useEffect logic
content = content.replace(/const extraArray = Object\.entries\(company\.extraData \|\| \{\}\)\.map\(\(\[k, v\], idx\) => \(\{[\s\S]*?\}\)\);\s*setEditExtraData\(extraArray\);/, `
      const genericExtra: { id: string; key: string; value: string }[] = [];
      const hrContactsMap: Record<string, ExtraContact> = {};

      Object.entries(company.extraData || {}).forEach(([k, v]) => {
        const nameMatch = k.match(/^OTHER HR NAME\\s*(\\d*)$/i);
        const emailMatch = k.match(/^OTHER HR EMAIL\\s*(\\d*)$/i) || k.match(/^OTHER HR MAIL\\s*(\\d*)$/i);
        const phoneMatch = k.match(/^OTHER HR MOBILE\\s*(\\d*)$/i) || k.match(/^OTHER HR PHONE\\s*(\\d*)$/i) || k.match(/^OTHER HR NUMBER\\s*(\\d*)$/i);
        const verifiedMatch = k.match(/^OTHER HR VERIFIED\\s*(\\d*)$/i);

        let isHrContact = false;
        let suffix = '';

        if (nameMatch) { suffix = nameMatch[1]; isHrContact = true; }
        else if (emailMatch) { suffix = emailMatch[1]; isHrContact = true; }
        else if (phoneMatch) { suffix = phoneMatch[1]; isHrContact = true; }
        else if (verifiedMatch) { suffix = verifiedMatch[1]; isHrContact = true; }

        if (isHrContact) {
          if (!hrContactsMap[suffix]) {
            hrContactsMap[suffix] = { id: suffix, name: '', phone: '', email: '', isVerified: false };
          }
          if (nameMatch) hrContactsMap[suffix].name = String(v);
          if (emailMatch) hrContactsMap[suffix].email = String(v);
          if (phoneMatch) hrContactsMap[suffix].phone = String(v);
          if (verifiedMatch) hrContactsMap[suffix].isVerified = String(v).toLowerCase() === 'true';
        } else {
          genericExtra.push({
            id: \`extra-\${Date.now()}-\${Math.random()}\`,
            key: k,
            value: typeof v === 'object' ? JSON.stringify(v) : String(v)
          });
        }
      });

      setEditExtraData(genericExtra);
      setExtraContacts(Object.values(hrContactsMap));
`);

// 4. Update Reset Logic in Footer
content = content.replace(/const extraArray = Object\.entries\(company\.extraData \|\| \{\}\)\.map\(\(\[k, v\], idx\) => \(\{[\s\S]*?\}\)\);\s*setEditExtraData\(extraArray\);/g, `
                const genericExtra: { id: string; key: string; value: string }[] = [];
                const hrContactsMap: Record<string, ExtraContact> = {};

                Object.entries(company.extraData || {}).forEach(([k, v]) => {
                  const nameMatch = k.match(/^OTHER HR NAME\\s*(\\d*)$/i);
                  const emailMatch = k.match(/^OTHER HR EMAIL\\s*(\\d*)$/i) || k.match(/^OTHER HR MAIL\\s*(\\d*)$/i);
                  const phoneMatch = k.match(/^OTHER HR MOBILE\\s*(\\d*)$/i) || k.match(/^OTHER HR PHONE\\s*(\\d*)$/i) || k.match(/^OTHER HR NUMBER\\s*(\\d*)$/i);
                  const verifiedMatch = k.match(/^OTHER HR VERIFIED\\s*(\\d*)$/i);

                  let isHrContact = false;
                  let suffix = '';

                  if (nameMatch) { suffix = nameMatch[1]; isHrContact = true; }
                  else if (emailMatch) { suffix = emailMatch[1]; isHrContact = true; }
                  else if (phoneMatch) { suffix = phoneMatch[1]; isHrContact = true; }
                  else if (verifiedMatch) { suffix = verifiedMatch[1]; isHrContact = true; }

                  if (isHrContact) {
                    if (!hrContactsMap[suffix]) {
                      hrContactsMap[suffix] = { id: suffix, name: '', phone: '', email: '', isVerified: false };
                    }
                    if (nameMatch) hrContactsMap[suffix].name = String(v);
                    if (emailMatch) hrContactsMap[suffix].email = String(v);
                    if (phoneMatch) hrContactsMap[suffix].phone = String(v);
                    if (verifiedMatch) hrContactsMap[suffix].isVerified = String(v).toLowerCase() === 'true';
                  } else {
                    genericExtra.push({
                      id: \`extra-\${Date.now()}-\${Math.random()}\`,
                      key: k,
                      value: typeof v === 'object' ? JSON.stringify(v) : String(v)
                    });
                  }
                });

                setEditExtraData(genericExtra);
                setExtraContacts(Object.values(hrContactsMap));
`);

// 5. Update Save logic
content = content.replace(/const finalExtraData: Record<string, any> = \{\};\s*editExtraData\.forEach\(item => \{\s*if \(item\.key\.trim\(\)\) finalExtraData\[item\.key\.trim\(\)\] = item\.value;\s*\}\);/, `const finalExtraData: Record<string, any> = {};
      editExtraData.forEach(item => {
        if (item.key.trim()) finalExtraData[item.key.trim()] = item.value;
      });

      extraContacts.forEach(contact => {
        if (contact.name || contact.email || contact.phone) {
          const suffix = contact.id;
          if (contact.name) finalExtraData[\`OTHER HR NAME \${suffix}\`.trim()] = contact.name;
          if (contact.email) finalExtraData[\`OTHER HR EMAIL \${suffix}\`.trim()] = contact.email;
          if (contact.phone) finalExtraData[\`OTHER HR MOBILE \${suffix}\`.trim()] = contact.phone;
          if (contact.isVerified) finalExtraData[\`OTHER HR VERIFIED \${suffix}\`.trim()] = 'true';
        }
      });`);


fs.writeFileSync(file, content, 'utf8');
