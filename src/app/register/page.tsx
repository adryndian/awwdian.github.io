'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff, Check } from 'lucide-react';

export default function RegisterPage() {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Password tidak cocok'); return; }
    if (password.length < 6)  { setError('Password minimal 6 karakter'); return; }
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      setSuccess(true);
    } catch { setError('Terjadi error. Coba lagi.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-600/25 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scaleIn">
        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-violet-500 to-blue-500
                          flex items-center justify-center shadow-xl shadow-violet-500/30 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Buat Akun</h1>
          <p className="text-sm text-white/50">Daftar untuk mulai menggunakan BeckRock AI</p>
        </div>

        <div className="glass-dark rounded-3xl p-7 border border-white/10 shadow-[var(--shadow-elevated)]">
          {success ? (
            <div className="flex flex-col items-center py-6 animate-fadeInUp">
              <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center mb-4">
                <Check className="w-7 h-7 text-emerald-300" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">Berhasil!</h3>
              <p className="text-sm text-white/50 text-center mb-5">
                Cek email untuk verifikasi, lalu login.
              </p>
              <Link href="/login"
                className="flex items-center gap-2 text-violet-300 text-sm font-semibold hover:text-violet-200 transition-smooth">
                Ke halaman login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-400/25 text-sm text-red-300">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'Email', type: 'email', val: email, set: setEmail, ph: 'name@example.com', icon: Mail },
                  { label: 'Password', type: showPass ? 'text' : 'password', val: password, set: setPassword, ph: 'min. 6 karakter', icon: Lock },
                  { label: 'Konfirmasi Password', type: showPass ? 'text' : 'password', val: confirm, set: setConfirm, ph: 'ulangi password', icon: Lock },
                ].map(({ label, type, val, set, ph, icon: Icon }) => (
                  <div key={label}>
                    <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                      {label}
                    </label>
                    <div className="relative">
                      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type={type} placeholder={ph} value={val}
                        onChange={(e) => set(e.target.value)} required
                        className="w-full pl-10 pr-4 py-3 glass-input rounded-xl text-sm text-white
                                   placeholder-white/25 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-0.5">
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-smooth">
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPass ? 'Sembunyikan' : 'Tampilkan'} password
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mt-1
                             bg-gradient-to-r from-violet-500 to-blue-500
                             hover:from-violet-600 hover:to-blue-600
                             text-white text-sm font-bold
                             shadow-lg shadow-violet-500/30
                             transition-all hover:scale-[1.02] active:scale-[0.98]
                             disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><span>Daftar Sekarang</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              <p className="text-center text-sm text-white/40 mt-5">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-violet-300 font-semibold hover:text-violet-200 transition-smooth">
                  Masuk
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
