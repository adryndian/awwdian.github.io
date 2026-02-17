'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff, Check } from 'lucide-react';

// Force dynamic rendering to avoid useSearchParams errors
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError('Terjadi error. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md animate-scaleIn">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30 mb-5">
            <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">Buat Akun</h1>
          <p className="text-base text-white/70 drop-shadow">Daftar untuk mulai menggunakan BeckRock AI</p>
        </div>

        <div className="glass-card p-8 shadow-[var(--shadow-elevated)]">
          {success ? (
            <div className="text-center py-6 animate-fadeInUp">
              <div className="w-14 h-14 glass-input rounded-[18px] flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Check className="w-7 h-7 text-emerald-300 drop-shadow" />
              </div>
              <h3 className="font-bold text-white mb-2 text-lg drop-shadow-md">Berhasil!</h3>
              <p className="text-sm text-white/70 mb-5 drop-shadow">
                Cek email untuk verifikasi akun, lalu login.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-blue-300 text-sm font-semibold hover:text-blue-200 transition-smooth"
              >
                Ke halaman login
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 px-4 py-3 glass-input rounded-xl text-sm text-red-300 border border-red-400/30">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 block drop-shadow-sm">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 drop-shadow" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 block drop-shadow-sm">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 drop-shadow" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="min. 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl glass-input text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-smooth">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2 block drop-shadow-sm">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 drop-shadow" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="ulangi password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-70 disabled:cursor-not-allowed mt-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Daftar Sekarang
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-white/60 mt-6 drop-shadow-sm">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-blue-300 font-semibold hover:text-blue-200 transition-smooth">
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
