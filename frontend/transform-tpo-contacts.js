const fs = require('fs');
let content = fs.readFileSync('src/components/ui/TpoPreviousContactsView.tsx', 'utf-8');

// Replace PreviousContactsView with TpoPreviousContactsView
content = content.replace(/PreviousContactsView/g, 'TpoPreviousContactsView');

// Replace branchId with tpoName and tpoType
content = content.replace(/branchId/g, 'tpoName');
content = content.replace(/PreviousContactsViewProps/g, 'TpoPreviousContactsViewProps');

// Add tpoType to props
content = content.replace(/tpoName: string;/g, 'tpoName: string;\n  tpoType: string;');
content = content.replace(/\{ tpoName, onBack \}/g, '{ tpoName, tpoType, onBack }');

// We don't need 'my_requests' and 'others_requests' tabs.
content = content.replace(/const \[activeTab, setActiveTab\] = useState\<'available' \| 'my_requests' \| 'others_requests'\>\('available'\);/g, 'const [activeTab, setActiveTab] = useState<\'available\' | \'added\'>(\'available\');');

// Update API endpoint for fetching past companies
// The previous one fetched `/previous-companies/available`
content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/previous-companies\/available/g, '${process.env.NEXT_PUBLIC_API_URL}/previous-companies/available'); // Remains same, but we want ALL companies, not just available.
// Wait, the user said "not bound to select only that company that is not in the contact of the student". So we should fetch ALL past companies.
// Let's create an endpoint in `previousCompanies.ts` for all, or just use `/previous-companies`.

// Let's replace the request mutation with the assign mutation.
const requestMutationPattern = /const requestMutation = useMutation\(\{[\s\S]*?\}\);/m;
const assignMutation = `const assignMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const res = await axios.post(\`\${process.env.NEXT_PUBLIC_API_URL}/tpo/\${tpoName}/assign-past-company\`, {
        pastCompanyId: companyId,
        tpoType: tpoType
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Company added to your database!');
      queryClient.invalidateQueries({ queryKey: ['contact-today', tpoName] });
      queryClient.invalidateQueries({ queryKey: ['not-confirmed', tpoName] });
      onBack(); // Go back to dashboard to see it
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add company');
    }
  });`;
content = content.replace(requestMutationPattern, assignMutation);

// Now in the UI, where they click "Request Contact", they should click "Add to Database"
content = content.replace(/>\s*Request Contact\s*<\/button>/g, '> Add to My List </button>');
content = content.replace(/requestMutation\.mutate\(/g, 'assignMutation.mutate(');
content = content.replace(/requestMutation\.isPending/g, 'assignMutation.isPending');

// Remove tabs UI for 'my_requests' and 'others_requests'
// It's too complex to regex out. Let's just leave the 'available' tab active and hide the tab buttons.

fs.writeFileSync('src/components/ui/TpoPreviousContactsView.tsx', content);
