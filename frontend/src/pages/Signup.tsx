import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chrome, User, Lock, ArrowLeft, BookOpen, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseAuthErrorMessage } from '../lib/authErrors';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, signInWithGoogle, loading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('الاسم الأول واسم العائلة مطلوبان');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      await signup(email, password, firstName, lastName);
      navigate('/home');
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err));
    }
  };

  const handleGoogleSignup = async () => {
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
          <h2 className="text-xl font-headline font-bold text-on-surface mb-8 text-right border-r-4 border-secondary pr-4">إنشاء حساب جديد</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-error/20 text-error rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="firstName">
                  الاسم الأول
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
                  </div>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full pr-12 pl-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all text-on-surface placeholder:text-outline-variant"
                    id="firstName"
                    placeholder="الاسم الأول"
                    type="text"
                    autoComplete="given-name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="lastName">
                  اسم العائلة
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
                  </div>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full pr-12 pl-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all text-on-surface placeholder:text-outline-variant"
                    id="lastName"
                    placeholder="اسم العائلة"
                    type="text"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="email">
                البريد الإلكتروني
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Mail className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
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
              <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="password">
                كلمة المرور
              </label>
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

            <div className="space-y-2">
              <label className="block text-sm font-label font-bold text-on-surface-variant mr-1" htmlFor="confirmPassword">
                تأكيد كلمة المرور
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="text-outline group-focus-within:text-primary transition-colors w-5 h-5" />
                </div>
                <input 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pr-12 pl-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/30 transition-all text-on-surface placeholder:text-outline-variant" 
                  id="confirmPassword" 
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
                <span>{loading ? 'جاري التحميل...' : 'إنشاء الحساب'}</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-4 px-6 bg-secondary-container text-on-secondary-container font-bold rounded-full hover:bg-secondary-fixed transition-colors flex items-center justify-center gap-2"
              >
                <span>العودة لتسجيل الدخول</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full py-4 px-6 bg-surface-container text-on-surface font-bold rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome className="w-5 h-5" />
                <span>المتابعة عبر Google</span>
              </button>
            </div>
          </form>
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
