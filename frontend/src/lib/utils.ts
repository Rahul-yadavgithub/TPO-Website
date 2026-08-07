import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isAllContactsIncorrect(company: any): boolean {
  if (!company) return false;
  
  const contacts = [];
  
  // Add primary contact if it exists (has name, email, or phone)
  if (company.hrName || company.hrEmail || company.hrPhone) {
    contacts.push({ isFlagged: company.primary_contact_flagged });
  }

  // Add additionalContacts
  if (company.additionalContacts && company.additionalContacts.length > 0) {
    company.additionalContacts.forEach((c: any) => {
      if (c.hrName || c.hrEmail || c.hrPhone) {
        contacts.push({ isFlagged: c.isFlagged });
      }
    });
  }

  // Add extraData contacts
  if (company.extraData) {
    Object.keys(company.extraData).forEach(k => {
      const match = k.match(/^OTHER HR NAME\s*(\d*)$/i);
      if (match) {
        const suffix = match[1] || '';
        
        let hasData = false;
        if (company.extraData[k]) hasData = true;
        
        // Also check if phone or email exist for this suffix
        const possiblePhoneKeys = [
          `OTHER HR MOBILE ${suffix}`.trim(),
          `OTHER HR PHONE ${suffix}`.trim(),
          `OTHER HR NUMBER ${suffix}`.trim(),
          `OTHER HR CONTACT ${suffix}`.trim()
        ];
        
        const possibleEmailKeys = [
          `OTHER HR EMAIL ${suffix}`.trim(),
          `OTHER HR MAIL ${suffix}`.trim()
        ];
        
        if (!hasData) {
          for (const pk of possiblePhoneKeys) {
            const actualPk = Object.keys(company.extraData).find(key => key.toLowerCase() === pk.toLowerCase());
            if (actualPk && company.extraData[actualPk]) {
              hasData = true;
              break;
            }
          }
        }
        
        if (!hasData) {
          for (const ek of possibleEmailKeys) {
            const actualEk = Object.keys(company.extraData).find(key => key.toLowerCase() === ek.toLowerCase());
            if (actualEk && company.extraData[actualEk]) {
              hasData = true;
              break;
            }
          }
        }
        
        if (hasData) {
          const isFlaggedStr = String(company.extraData[`OTHER HR FLAGGED ${suffix}`.trim()]).toLowerCase();
          contacts.push({ isFlagged: isFlaggedStr === 'true' });
        }
      }
    });
  }

  if (contacts.length === 0) return false;
  
  return contacts.every(c => c.isFlagged);
}
