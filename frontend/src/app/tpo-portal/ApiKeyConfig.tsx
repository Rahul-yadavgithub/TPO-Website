'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Key, Plus, Loader2, AlertTriangle, ShieldCheck, CheckCircle2, Eye, EyeOff, Trash2, RefreshCw, BookOpen, XCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyConfigProps {
  tpoName: string;
}

const SUPPORTED_PLATFORMS = [
  { id: 'apollo', name: 'Apollo.io' },
  { id: 'hunter', name: 'Hunter.io' },
  { id: 'snov', name: 'Snov.io' },
  { id: 'lusha', name: 'Lusha' }
];

export default function ApiKeyConfig({ tpoName }: ApiKeyConfigProps) {
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState<{ id: string, platform: string } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<string | null>(null);

  // Poll API Keys every 30 seconds
  const { data: groupedKeys, isLoading } = useQuery({
    queryKey: ['api-keys', tpoName],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches/${tpoName}/api-keys`);
      return res.data.data;
    },
    refetchInterval: 30000,
    enabled: !!tpoName
  });

  // Poll Notifications every 30 seconds
  const { data: notifications } = useQuery({
    queryKey: ['notifications', tpoName],
    queryFn: async () => {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/branches/${tpoName}/notifications`);
      return res.data.data;
    },
    refetchInterval: 30000,
    enabled: !!tpoName
  });

  const disableKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/branches/${tpoName}/api-keys/${keyId}`);
    },
    onSuccess: () => {
      toast.success('Key disabled safely');
      queryClient.invalidateQueries({ queryKey: ['api-keys', tpoName] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to disable key');
    }
  });

  const hasExhaustionAlert = notifications?.some((n: any) => n.type === 'exhausted' && !n.isDismissed);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-sm">
              <Key className="w-6 h-6" />
            </div>
            API Configuration
          </h2>
          <p className="text-gray-500 mt-2 text-base">Manage API keys and quotas for enrichment providers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-bold"
        >
          <Plus className="w-5 h-5" />
          Add API Key
        </button>
      </div>

      {hasExhaustionAlert && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h3 className="font-semibold">Action Required: API Quota Exhausted</h3>
            <p className="text-sm mt-0.5">Contact validation is currently blocked for one or more platforms. Please add new keys to resume.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {SUPPORTED_PLATFORMS.map((platform) => {
            const keys = groupedKeys?.[platform.id] || [];
            
            return (
              <div key={platform.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h3 className="font-bold text-gray-900 text-lg">{platform.name}</h3>
                    <button 
                      onClick={() => setShowGuideModal(platform.id)}
                      className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-md border border-indigo-100 transition-colors hover:bg-indigo-100"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Setup Guide
                    </button>
                  </div>
                  <span className="text-xs font-semibold bg-white border border-gray-200 px-3 py-1.5 rounded-full text-gray-700 shadow-sm shrink-0">
                    {keys.filter((k: any) => k.status === 'active').length} Active
                  </span>
                </div>
                
                <div className="p-5 flex-1 bg-white">
                  {keys.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">No keys configured</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {keys.map((key: any) => (
                        <div key={key.id} className={`p-4 rounded-xl border ${key.status === 'exhausted' ? 'bg-red-50/50 border-red-100' : key.status === 'disabled' ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
                          
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                {key.label}
                                {key.status === 'active' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                {key.status === 'exhausted' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                {key.status === 'disabled' && <span className="w-2 h-2 rounded-full bg-gray-400"></span>}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1 capitalize">{key.keyType} Tier • Added {new Date(key.createdAt).toLocaleDateString()}</p>
                            </div>
                            
                            <div className="flex gap-2">
                              {key.status === 'exhausted' && (
                                <>
                                  <button onClick={() => setShowReplaceModal({ id: key.id, platform: platform.id })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Replace Key">
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => disableKeyMutation.mutate(key.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Disable">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-gray-600">Quota Usage</span>
                              <span className={key.status === 'exhausted' ? 'text-red-600' : 'text-gray-900'}>
                                {key.callsUsed.toLocaleString()} / {key.totalLimit.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${key.status === 'exhausted' ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, (key.callsUsed / key.totalLimit) * 100)}%` }}
                              />
                            </div>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && <AddKeyModal tpoName={tpoName} onClose={() => setShowAddModal(false)} />}
      {showReplaceModal && <ReplaceKeyModal tpoName={tpoName} keyId={showReplaceModal.id} platform={showReplaceModal.platform} onClose={() => setShowReplaceModal(null)} />}
      {showGuideModal && <PlatformGuideModal platform={showGuideModal} onClose={() => setShowGuideModal(null)} />}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function AddKeyModal({ tpoName, onClose }: { tpoName: string, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState('apollo');
  const [label, setLabel] = useState('');
  const [keyType, setKeyType] = useState('free');
  const [limit, setLimit] = useState('');
  
  // Credentials
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [validationResult, setValidationResult] = useState<{ valid: boolean, limit: any } | null>(null);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const plaintext = platform === 'snov' ? `${clientId}:${clientSecret}` : apiKey;
      
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branches/${tpoName}/api-keys/validate`, {
        platform_name: platform,
        api_key_plaintext: plaintext,
        label,
        key_type: keyType,
        total_limit: parseInt(limit) || 100,
        resets_monthly: true,
        added_by: 'admin' // In real app, from auth token
      });
      return res.data;
    },
    onSuccess: (data) => {
      setValidationResult({ valid: true, limit: data.limit_detected });
      toast.success('Key validated and securely saved!');
      queryClient.invalidateQueries({ queryKey: ['api-keys', tpoName] });
      setTimeout(() => onClose(), 1500); // Auto close
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Validation failed');
      setValidationResult(null);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Add API Key</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {validationResult?.valid ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">Key Verified & Encrypted</h4>
              <p className="text-sm text-gray-500">Limit established at: <span className="font-medium text-gray-900">{validationResult.limit}</span></p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm">
                  {SUPPORTED_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifier Label</label>
                <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Apollo Sales Tier 1" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm" />
              </div>

              {platform === 'snov' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                    <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                    <div className="relative">
                      <input type={showKey ? "text" : "password"} value={clientSecret} onChange={e => setClientSecret(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono pr-10" />
                      <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <div className="relative">
                    <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono pr-10" />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Limit</label>
                  <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="1000" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                  <select value={keyType} onChange={e => setKeyType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm">
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => validateMutation.mutate()} 
                  disabled={validateMutation.isPending || (!label || !limit || (platform === 'snov' ? (!clientId || !clientSecret) : !apiKey))}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify & Save Securely
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplaceKeyModal({ tpoName, keyId, platform, onClose }: { tpoName: string, keyId: string, platform: string, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showKey, setShowKey] = useState(false);

  const replaceMutation = useMutation({
    mutationFn: async () => {
      const plaintext = platform === 'snov' ? `${clientId}:${clientSecret}` : apiKey;
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/branches/${tpoName}/api-keys/${keyId}/replace`, {
        new_api_key_plaintext: plaintext
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Key successfully replaced & reset!');
      queryClient.invalidateQueries({ queryKey: ['api-keys', tpoName] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Validation failed');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Replace Key</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 mb-4">Enter the new credentials. The existing configuration and limits will be preserved and reset.</p>

          {platform === 'snov' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Client ID</label>
                <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Client Secret</label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={clientSecret} onChange={e => setClientSecret(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono pr-10" />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New API Key</label>
              <div className="relative">
                <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-sm font-mono pr-10" />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button 
              onClick={() => replaceMutation.mutate()} 
              disabled={replaceMutation.isPending || (platform === 'snov' ? (!clientId || !clientSecret) : !apiKey)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {replaceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Replace & Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// No additional imports needed here, they are all at the top
function PlatformGuideModal({ platform, onClose }: { platform: string, onClose: () => void }) {
  const guides: Record<string, any> = {
    apollo: {
      title: 'Apollo.io Implementation Guide',
      url: 'https://app.apollo.io',
      steps: [
        'Log in to your Apollo.io account.',
        'Navigate to Settings (Gear Icon) in the top navigation bar.',
        'Scroll down to the "Integrations" section and click on "API".',
        'Click the "Create New Key" button.',
        'Give your key a label (e.g., "JobFinder Branch Portal").',
        'Copy the generated API Key and paste it here.',
      ],
      notes: 'Free tier accounts usually provide a shared limit of API credits. Contact validation uses standard credits.'
    },
    hunter: {
      title: 'Hunter.io Implementation Guide',
      url: 'https://hunter.io',
      steps: [
        'Log in to your Hunter.io account.',
        'Click on your Profile avatar in the top right corner.',
        'Select "API" from the dropdown menu.',
        'You will see your secret API key displayed on the dashboard.',
        'Copy the API Key and paste it here.',
      ],
      notes: 'Free tier provides 25 searches per month.'
    },
    snov: {
      title: 'Snov.io Implementation Guide',
      url: 'https://app.snov.io',
      steps: [
        'Log in to your Snov.io account.',
        'Navigate to your Account Settings.',
        'Click on the "API integration" tab in the left sidebar.',
        'You will find your "Client ID" and "Client Secret".',
        'When adding the key here, you must format it exactly as: client_id:client_secret (separated by a colon).',
      ],
      notes: 'Snov provides 50 free credits per month. Ensure both ID and Secret are copied exactly.'
    },
    lusha: {
      title: 'Lusha Implementation Guide',
      url: 'https://auth.lusha.com',
      steps: [
        'Log in to your Lusha Dashboard.',
        'Navigate to the "API & Integrations" section from the main menu.',
        'Click on "Generate API Key".',
        'Copy the generated API Key and paste it here.',
      ],
      notes: 'Lusha credits are highly premium. Use them sparingly as free tier limits are very low.'
    }
  };

  const guide = guides[platform];

  if (!guide) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            {guide.title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Step-by-Step Instructions</h4>
            <ul className="space-y-3">
              {guide.steps.map((step: string, index: number) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mt-0.5">
                    {index + 1}
                  </div>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" /> Important Note
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">{guide.notes}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <a 
            href={guide.url} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Open {platform.charAt(0).toUpperCase() + platform.slice(1)} Dashboard <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
}
