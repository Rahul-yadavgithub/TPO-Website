'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, Mail, User, BookOpen, AlertCircle, ShieldCheck, CheckCircle2, Eye, EyeOff, RefreshCw, Check, ShieldAlert, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', rollNumber: '', email: '', password: '', branchName: '' });
  const [program, setProgram] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('https://res.cloudinary.com/dzbliymin/image/upload/v1781725894/logonith_gb3opv.webp'); // Default
  const router = useRouter();

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let r = '';
    for (let i = 0; i < 6; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    setCaptchaText(r);
  };

  useEffect(() => {
    generateCaptcha();
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Fetch custom logo
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/portal-settings`)
      .then(res => {
        if (res.data?.data?.portalLogoUrl) {
          setLogoUrl(res.data.data.portalLogoUrl);
        }
      })
      .catch(console.error);

    return () => clearInterval(t);
  }, []);

  const btechBranches = ['MNC', 'CSE', 'EE', 'EP', 'ECE', 'MSE', 'ME', 'CH', 'CE'];
  const mtechBranches = ['CSE', 'ECE', 'MNC', 'EE', 'CE'];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (captchaInput !== captchaText) {
      setError('Invalid captcha. Please try again.');
      generateCaptcha(); setCaptchaInput(''); return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, formData);
      setSuccess(res.data.message || 'Registration submitted. Awaiting approval.');
      setTimeout(() => router.push('/login'), 3500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
      generateCaptcha(); setCaptchaInput('');
    } finally { setLoading(false); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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

      {/* Main Header */}
      <div className="w-full bg-white border-b-[3px] border-[#1a3a6e] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-center lg:justify-between gap-4 md:gap-6 lg:gap-8">
          <div className="hidden lg:block text-right">
            <div className="text-[1.35rem] lg:text-[1.45rem] font-bold text-[#1a1a1a] leading-tight tracking-wide">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
            <div className="text-[0.9rem] text-[#555] mt-1.5 font-medium">हमीरपुर, हिमाचल प्रदेश (भारत) – 177 005</div>
          </div>
          <div className="flex-shrink-0 flex justify-center">
            <img src={logoUrl}
              alt="NITH Logo" className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-sm" />
          </div>
          <div className="text-center md:text-left">
            <div className="text-xl md:text-2xl lg:text-[1.45rem] font-black text-[#1a3a6e] leading-tight tracking-wide whitespace-normal lg:whitespace-nowrap">National Institute of Technology Hamirpur</div>
            <div className="text-sm md:text-[0.9rem] text-[#555] mt-1.5 font-medium">Hamirpur, हिमाचल प्रदेश (India) – 177 005</div>
          </div>
        </div>
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
              <p className="font-bold text-[#1a3a6e] text-base">Submitting Registration...</p>
              <p className="text-slate-500 text-xs mt-1">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-start sm:items-center justify-center py-6 sm:py-8 px-4 relative overflow-hidden">
        {/* Animated Background Image */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-float-bg z-0" style={{ backgroundImage: "url('https://res.cloudinary.com/dzbliymin/image/upload/v1785260141/nith27_zlbbxm.jpg')" }} />

        <div className="relative z-10 w-full max-w-[480px] mt-4 sm:mt-0 sm:my-8">
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl border border-white/40 overflow-hidden">

            {/* Card header */}
            <div className="bg-[#1a3a6e] px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-[15px] leading-tight">New User Registration</h2>
                <p className="text-blue-200 text-[11px] mt-0.5">TPR Portal — Authorized students only</p>
              </div>
            </div>
            <div className="h-[3px] bg-gradient-to-r from-[#c9a84c] via-[#f0d060] to-[#c9a84c]" />

            <div className="px-7 py-5 space-y-3.5">
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 flex items-start gap-2.5 text-[13px]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 flex items-start gap-2.5 text-[13px]">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{success} Redirecting to login...</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" name="name" required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                    placeholder="As per institute records (e.g. Rahul Yadav)"
                    value={formData.name} onChange={handleChange} disabled={loading || !!success} />
                </div>
              </div>

              {/* Roll Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Roll Number *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" name="rollNumber" required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400 uppercase"
                    placeholder="Institute roll number (e.g. 20MI1000)"
                    value={formData.rollNumber} onChange={handleChange} disabled={loading || !!success} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" name="email" required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                    placeholder="Official/personal email address"
                    value={formData.email} onChange={handleChange} disabled={loading || !!success} />
                </div>
              </div>

              {/* Program */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Program *</label>
                <select name="program" required
                  className="w-full px-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] appearance-none cursor-pointer"
                  value={program} onChange={(e) => { setProgram(e.target.value); setFormData({ ...formData, branchName: '' }); }}
                  disabled={loading || !!success}>
                  <option value="" disabled>-- Select your Program --</option>
                  <option value="B.Tech">B.Tech</option>
                  <option value="M.Tech">M.Tech</option>
                </select>
              </div>

              {/* Branch */}
              {program && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Department / Branch *</label>
                  <select name="branchName" required
                    className="w-full px-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] appearance-none cursor-pointer"
                    value={formData.branchName} onChange={handleChange}
                    disabled={loading || !!success}>
                    <option value="" disabled>-- Select your Department --</option>
                    {(program === 'B.Tech' ? btechBranches : mtechBranches).map(b => (
                      <option key={b} value={program === 'M.Tech' ? `M.Tech ${b}` : b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} name="password" required minLength={8}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                    placeholder="Minimum 8 characters"
                    value={formData.password} onChange={handleChange} disabled={loading || !!success} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Captcha */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Security Verification *</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 bg-[#eef1f5] border border-slate-300 h-10 flex items-center justify-center relative overflow-hidden select-none">
                    <div className="absolute inset-0 opacity-30">
                      <svg className="w-full h-full"><line x1="0" y1="8" x2="100%" y2="32" stroke="#94a3b8" strokeWidth="1.5" /><line x1="15%" y1="0" x2="85%" y2="40" stroke="#94a3b8" strokeWidth="1" /></svg>
                    </div>
                    <span className="font-mono text-[18px] font-bold italic tracking-[0.35em] text-slate-700 blur-[0.4px] relative z-10">{captchaText}</span>
                  </div>
                  <button type="button" onClick={generateCaptcha}
                    className="px-3 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" required
                  className="w-full px-4 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                  placeholder="Type the characters shown above"
                  value={captchaInput} onChange={e => setCaptchaInput(e.target.value)}
                  disabled={loading || !!success} />
              </div>

              {/* Submit */}
              <button type="button" onClick={handleRegister as any}
                disabled={loading || !!success || !captchaInput || !formData.email || !formData.password || !formData.name || !formData.rollNumber || !formData.branchName}
                className="w-full py-2.5 bg-[#1a3a6e] hover:bg-[#122d58] text-white font-bold text-[14px] tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Registration Request'}
              </button>

              <div className="flex justify-center pt-1 border-t border-slate-200">
                <button type="button" onClick={() => router.push('/login')}
                  className="text-[12px] text-[#1a3a6e] hover:underline font-medium">
                  Already registered? Login here
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-white/75 text-[11px] px-1">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Registrations are subject to approval by your branch coordinator. Only authorized TPR students may register.</span>
          </div>
        </div>
      </div>

      <div className="bg-[#1a3a6e] text-white/60 text-center py-2 text-[10px] tracking-wide">
        © {new Date().getFullYear()} National Institute of Technology Hamirpur. All rights reserved. &nbsp;|&nbsp; TPR Cell
      </div>
    </div>
  );
}
