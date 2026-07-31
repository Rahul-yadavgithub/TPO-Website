'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff, RefreshCw, Check, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleCheckLoading, setRoleCheckLoading] = useState(false);
  const [isCommTpr, setIsCommTpr] = useState(false);
  const [portalChoice, setPortalChoice] = useState<'branch' | 'communication'>('branch');

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('https://res.cloudinary.com/dzbliymin/image/upload/v1781725894/logonith_gb3opv.webp'); // Default
  const router = useRouter();



  useEffect(() => {
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);

    // Check if already authenticated
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, { withCredentials: true })
      .then(res => {
        if (res.data?.success) {
          router.push('/');
        }
      })
      .catch(() => { /* not logged in, remain on page */ });

    // Fetch custom logo (disabled to force default logo)
    // axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-settings`)
    //   .then(res => {
    //     if (res.data?.data?.portalLogoUrl) {
    //       setLogoUrl(res.data.data.portalLogoUrl);
    //     }
    //   })
    //   .catch(console.error);


    return () => clearInterval(t);
  }, [router]);

  const handleEmailBlur = async () => {
    if (!email || !email.includes('@')) return;
    setRoleCheckLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/check-role/${email}`);
      if (res.data.success && res.data.role === 'communication_tpr' && res.data.status === 'approved') {
        setIsCommTpr(true); setPortalChoice('communication');
      } else { setIsCommTpr(false); setPortalChoice('branch'); }
    } catch { /* silent */ } finally { setRoleCheckLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password, portal: 'base' }, { withCredentials: true });
      const { commToken } = await res.data.data || {};
      
      if (commToken) {
        document.cookie = `tpr_token=${commToken}; path=/; max-age=2592000; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
      }

      if (isCommTpr && portalChoice === 'communication') {
        if (commToken) localStorage.setItem('comm_tpr_token', commToken);
        window.location.href = '/communication-tpr/dashboard';
      } else { window.location.href = '/'; }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f0f2f5]" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {/* Top utility bar */}
      <div className="w-full bg-[#1a3a6e] text-white py-1 px-6 flex justify-between items-center text-[11px] tracking-wide border-b border-[#2a4a7e]">
        <span className="opacity-70 hidden sm:block">Ministry of Education, Government of India</span>
        {currentTime ? (
          <span className="font-mono opacity-90">{fmt(currentTime)}&nbsp;&nbsp;|&nbsp;&nbsp;{fmtTime(currentTime)}</span>
        ) : <span className="h-4 w-48" />}
      </div>

      {/* Main Header — matches image exactly */}
      <div className="w-full bg-white border-b-[3px] border-[#1a3a6e] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-center lg:justify-between gap-4 md:gap-6 lg:gap-8">
          {/* Hindi side */}
          <div className="hidden lg:block text-right">
            <div className="text-[1.35rem] lg:text-[1.45rem] font-bold text-[#1a1a1a] leading-tight tracking-wide">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
            <div className="text-[0.9rem] text-[#555] mt-1.5 font-medium">हमीरपुर, हिमाचल प्रदेश (भारत) – 177 005</div>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 flex justify-center">
            <img
              src={logoUrl}
              alt="Portal Logo"
              className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-sm"
            />
          </div>

          {/* English side */}
          <div className="text-center md:text-left">
            <div className="text-xl md:text-2xl lg:text-[1.45rem] font-black text-[#1a3a6e] leading-tight tracking-wide whitespace-normal lg:whitespace-nowrap">National Institute of Technology Hamirpur</div>
            <div className="text-sm md:text-[0.9rem] text-[#555] mt-1.5 font-medium">Hamirpur, Himachal Pradesh (India) – 177 005</div>
          </div>
        </div>

        {/* Portal label strip */}
        <div className="bg-[#1a3a6e] text-center py-1.5">
          <span className="text-white text-[11px] font-semibold tracking-[0.15em] uppercase">
            Training &amp; Placement Representatives (TPR) Portal
          </span>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1f3c]/75 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-200">
            <div className="relative w-14 h-14">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-[#1a3a6e] animate-spin" />
              <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-[#1a3a6e]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-[#1a3a6e] text-base">Authenticating...</p>
              <p className="text-slate-500 text-xs mt-1">Please wait while we verify your credentials</p>
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex items-start sm:items-center justify-center py-6 sm:py-10 px-4 relative overflow-hidden">
        {/* Animated Background Image */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-float-bg z-0" style={{ backgroundImage: "url('https://res.cloudinary.com/dzbliymin/image/upload/v1785260141/nith27_zlbbxm.jpg')" }} />

        <div className="relative z-10 w-full max-w-[440px] mt-4 sm:mt-0 sm:my-8">

          {/* Form card */}
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl border border-white/40 overflow-hidden">

            {/* Card header */}
            <div className="bg-[#1a3a6e] px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-[15px] leading-tight">User Login</h2>
                <p className="text-blue-200 text-[11px] mt-0.5">Authorized personnel only</p>
              </div>
            </div>

            {/* Thin gold accent */}
            <div className="h-[3px] bg-gradient-to-r from-[#c9a84c] via-[#f0d060] to-[#c9a84c]" />

            <div className="px-7 py-6 space-y-4">

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded flex items-start gap-2.5 text-[13px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email" required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] transition-colors placeholder-slate-400"
                    placeholder="Enter your registered email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    onBlur={handleEmailBlur} disabled={loading || roleCheckLoading}
                  />
                  {roleCheckLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#1a3a6e]" />}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] transition-colors placeholder-slate-400"
                    placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Portal selector for comm_tpr */}
              {isCommTpr && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Select Portal
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['branch', 'communication'] as const).map(p => (
                      <label key={p}
                        className={`flex items-center justify-center gap-1.5 p-2.5 border-2 cursor-pointer text-[12px] font-semibold transition-all
                          ${portalChoice === p ? 'border-[#1a3a6e] bg-[#1a3a6e] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-[#1a3a6e]'}`}>
                        <input type="radio" className="sr-only" checked={portalChoice === p} onChange={() => setPortalChoice(p)} />
                        {p === 'branch' ? 'Branch Dashboard' : 'Comm. Dashboard'}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button type="button" onClick={handleLogin as any}
                disabled={loading || roleCheckLoading || !email || !password}
                className="w-full py-2.5 px-4 bg-[#1a3a6e] hover:bg-[#122d58] text-white font-bold text-[14px] tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login to Portal'}
              </button>

              {/* Links */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <button type="button" onClick={() => router.push('/register')}
                  className="text-[12px] text-[#1a3a6e] hover:underline font-medium">
                  New Registration
                </button>
                <button type="button" onClick={() => router.push('/forgot-password')}
                  className="text-[12px] text-[#1a3a6e] hover:underline font-medium">
                  Forgot Password?
                </button>
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div className="mt-3 flex items-start gap-2 text-white/75 text-[11px] px-1">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>This is a secure government portal. Unauthorized access is strictly prohibited and may be subject to legal action.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#1a3a6e] text-white/60 text-center py-2 text-[10px] tracking-wide">
        © {new Date().getFullYear()} National Institute of Technology Hamirpur. All rights reserved. &nbsp;|&nbsp; TPR Cell
      </div>
    </div>
  );
}
