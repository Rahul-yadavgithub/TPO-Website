'use client';

import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ShieldCheck, CheckCircle2, Eye, EyeOff, ShieldAlert, KeyRound, Lock } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const id = searchParams.get('id');

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!token || !id) {
      setError('Invalid or missing password reset link.'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.'); return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        { id, token, newPassword },
        { withCredentials: true }
      );
      
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => window.location.href = '/login', 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally { setLoading(false); }
  };

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const Header = () => (
    <>
      <div className="w-full bg-[#1a3a6e] text-white py-1 px-6 flex justify-between items-center text-[11px] tracking-wide border-b border-[#2a4a7e]">
        <span className="opacity-70 hidden sm:block">Ministry of Education, Government of India</span>
        {currentTime ? <span className="font-mono opacity-90">{fmt(currentTime)}&nbsp;&nbsp;|&nbsp;&nbsp;{fmtTime(currentTime)}</span> : <span className="h-4 w-48" />}
      </div>
      <div className="w-full bg-white border-b-[3px] border-[#1a3a6e] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 text-right hidden sm:block pr-4">
            <div className="text-[1.1rem] font-bold text-[#1a1a1a] leading-tight">राष्ट्रीय प्रौद्योगिकी संस्थान हमीरपुर</div>
            <div className="text-[0.72rem] text-[#555] mt-0.5">हमीरपुर, हिमाचल प्रदेश (भारत) – 177 005</div>
          </div>
          <div className="flex-shrink-0">
            <img src="https://res.cloudinary.com/dzbliymin/image/upload/v1781725894/logonith_gb3opv.webp" alt="NITH Logo" className="w-20 h-20 object-contain" />
          </div>
          <div className="flex-1 pl-4">
            <div className="text-[1.1rem] font-bold text-[#1a3a6e] leading-tight">National Institute of Technology Hamirpur</div>
            <div className="text-[0.72rem] text-[#555] mt-0.5">Hamirpur, Himachal Pradesh (India) – 177 005</div>
          </div>
        </div>
        <div className="bg-[#1a3a6e] text-center py-1.5">
          <span className="text-white text-[11px] font-semibold tracking-[0.15em] uppercase">Training &amp; Placement Representatives (TPR) Portal</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f0f2f5]" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <Header />

      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1f3c]/75 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-200">
            <div className="relative w-14 h-14">
              <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-[#1a3a6e] animate-spin" />
              <ShieldCheck className="absolute inset-0 m-auto w-6 h-6 text-[#1a3a6e]" />
            </div>
            <div className="text-center">
              <p className="font-bold text-[#1a3a6e] text-base">Processing Request...</p>
              <p className="text-slate-500 text-xs mt-1">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center py-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-bg-zoom z-0" style={{ backgroundImage: "url('/nith.jpg')" }} />
        <div className="absolute inset-0 bg-[#0d1f3c]/65 z-0" />

        <div className="relative z-10 w-full max-w-[440px]">
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl border border-white/40 overflow-hidden">

            <div className="bg-[#1a3a6e] px-6 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-[15px] leading-tight">Create New Password</h2>
                <p className="text-blue-200 text-[11px] mt-0.5">TPR Portal — Secure Access</p>
              </div>
            </div>
            <div className="h-[3px] bg-gradient-to-r from-[#c9a84c] via-[#f0d060] to-[#c9a84c]" />

            <div className="px-7 py-6">
              {success ? (
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center py-4 gap-3">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Password Updated</h3>
                      <p className="text-slate-500 text-[13px] mt-1 leading-relaxed">
                        Your password has been successfully reset. Redirecting you to login...
                      </p>
                    </div>
                  </div>
                  <button onClick={() => window.location.href = '/login'}
                    className="w-full py-2.5 bg-[#1a3a6e] hover:bg-[#122d58] text-white font-bold text-[14px] tracking-wide transition-colors flex items-center justify-center gap-2 mt-1">
                    Proceed to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  
                  {(!token || !id) && (
                    <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 flex items-start gap-2.5 text-[13px]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Invalid or missing reset link. Please request a new one.</span>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 flex items-start gap-2.5 text-[13px]">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">New Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} required minLength={8}
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                        placeholder="Minimum 8 characters"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={loading} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Confirm New Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type={showConfirmPassword ? 'text' : 'password'} required
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-300 bg-slate-50 text-slate-800 text-[13px] focus:outline-none focus:border-[#1a3a6e] focus:ring-1 focus:ring-[#1a3a6e] placeholder-slate-400"
                        placeholder="Re-enter new password"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || !token || !id || !newPassword || !confirmPassword}
                    className="w-full py-2.5 bg-[#1a3a6e] hover:bg-[#122d58] text-white font-bold text-[14px] tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </button>

                  <div className="flex justify-center pt-1 border-t border-slate-200">
                    <Link href="/login" className="text-[12px] text-[#1a3a6e] hover:underline font-medium">Cancel and return to Login</Link>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-white/75 text-[11px] px-1">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Ensure you use a strong password. Do not share your login credentials with anyone.</span>
          </div>
        </div>
      </div>

      <div className="bg-[#1a3a6e] text-white/60 text-center py-2 text-[10px] tracking-wide">
        © {new Date().getFullYear()} National Institute of Technology Hamirpur. All rights reserved. &nbsp;|&nbsp; TPR Cell
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1a3a6e]" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
