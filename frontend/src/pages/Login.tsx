import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chrome, User, Lock, ArrowLeft, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseAuthErrorMessage } from '../lib/authErrors';

export default function Login() {
  const navigate = useNavigate();
  const { login, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/home');
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/home');
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex items-center justify-center p-6 relative overflow-hidden rtl" dir="rtl">
      {/* Background Accents */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl" />

      <main className="relative w-full max-w-md z-10">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-surface-container-lowest shadow-sm relative"
          >
            <div className="absolute inset-2 border border-primary/10 rounded-full" />
            <BookOpen className="text-primary w-10 h-10 fill-current" />
          </motion.div>
          <h1 className="font-headline font-bold text-4xl text-primary mb-2 tracking-tight">نور القرآن</h1>
          <p className="font-body text-outline font-medium">مرحباً بك في واحة السكينة والتدبر</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-outline-variant/10"
        >
          <h2 className="text-xl font-headline font-bold text-on-surface mb-8 text-right border-r-4 border-secondary pr-4">تسجيل الدخول</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-error/20 text-error rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="email">
                البريد الإلكتروني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <User className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
                </div>
                <input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-12 pl-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all text-on-surface placeholder:text-outline-variant" 
                  id="email" 
                  placeholder="example@email.com" 
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="block text-sm font-label font-bold text-on-surface-variant" htmlFor="password">
                  كلمة المرور
                </label>
                <a className="text-xs font-label text-primary hover:underline" href="#">نسيت كلمة المرور؟</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
                </div>
                <input 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-12 pl-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all text-on-surface placeholder:text-outline-variant" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                  required
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-tl from-primary to-primary-container text-on-primary font-bold rounded-full shadow-lg hover:scale-[0.98] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'جاري التحميل...' : 'تسجيل الدخول'}</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <button 
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full py-4 px-6 bg-secondary-container text-on-secondary-container font-bold rounded-full hover:bg-secondary-fixed transition-colors flex items-center justify-center gap-2"
              >
                <span>إنشاء حساب جديد</span>
              </button>
            </div>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-surface-container-lowest text-outline italic font-headline">أو تابع عبر</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-label font-bold">Google</span>
              <Chrome className="w-5 h-5" />
            </button>
            <button className="flex items-center justify-center gap-3 py-3 px-4 bg-surface-container rounded-2xl hover:bg-surface-container-high transition-colors">
              <span className="text-sm font-label font-bold">Apple</span>
              <span className="w-5 h-5 flex items-center justify-center"></span>
            </button>
          </div>
        </motion.div>

        <footer className="mt-8 text-center space-x-reverse space-x-6">
          <a className="text-xs font-label text-outline-variant hover:text-primary transition-colors" href="#">سياسة الخصوصية</a>
          <a className="text-xs font-label text-outline-variant hover:text-primary transition-colors" href="#">شروط الاستخدام</a>
          <a className="text-xs font-label text-outline-variant hover:text-primary transition-colors" href="#">المساعدة</a>
        </footer>
      </main>
    </div>
  );
}
