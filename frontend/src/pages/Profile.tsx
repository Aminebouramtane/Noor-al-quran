import React from 'react';
import { BookOpen, Clock, ChevronLeft, Bell, Volume2, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { getFirebaseAuthErrorMessage } from '../lib/authErrors';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      window.alert(getFirebaseAuthErrorMessage(error));
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />
      
      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Hero Profile Section */}
        <section className="flex flex-col items-center text-center mb-10">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary-container">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" 
                alt="User Profile" 
                className="w-full h-full rounded-full object-cover border-4 border-surface"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute bottom-1 right-1 bg-secondary-container text-on-secondary-container text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              مبتدئ
            </div>
          </div>
          <h2 className="text-3xl font-headline font-bold text-on-surface mb-1">{user?.displayName || 'مستخدم نور القرآن'}</h2>
          <p className="text-on-surface-variant text-sm tracking-wide">{user?.email || '—'}</p>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-surface-container-low rounded-[2rem] p-6 flex flex-col items-center justify-center space-y-2">
            <BookOpen className="text-primary w-8 h-8 fill-current" />
            <div className="text-2xl font-headline font-bold text-on-surface">١,٢٤٠</div>
            <div className="text-xs text-on-surface-variant font-medium">آيات مقروءة</div>
          </div>
          <div className="bg-surface-container-low rounded-[2rem] p-6 flex flex-col items-center justify-center space-y-2">
            <Clock className="text-secondary w-8 h-8 fill-current" />
            <div className="text-2xl font-headline font-bold text-on-surface">٤٥</div>
            <div className="text-xs text-on-surface-variant font-medium">ساعات التعلم</div>
          </div>
        </section>

        {/* Profile Settings List */}
        <section className="space-y-3">
          <h3 className="text-lg font-headline font-semibold px-2 mb-4 text-on-surface-variant">الإعدادات</h3>
          
          {[
            { label: "الإشعارات", icon: Bell, color: "bg-primary/10", iconColor: "text-primary", path: '/settings/notifications' },
            { label: "إعدادات الصوت", icon: Volume2, color: "bg-secondary/10", iconColor: "text-secondary", path: '/settings/sound' },
            { label: "المساعدة", icon: HelpCircle, color: "bg-surface-container-high", iconColor: "text-on-surface-variant", path: '/help' }
          ].map((item, i) => (
            <button 
              key={i}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-5 bg-surface-container-lowest rounded-2xl transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 flex items-center justify-center rounded-xl", item.color)}>
                  <item.icon className={cn("w-5 h-5", item.iconColor)} />
                </div>
                <span className="font-medium text-on-surface">{item.label}</span>
              </div>
              <ChevronLeft className="text-outline w-5 h-5" />
            </button>
          ))}
        </section>

        {/* Logout Section */}
        <section className="mt-12 flex justify-center">
          <button
            onClick={handleLogout}
            className="px-8 py-3 rounded-full border border-error/20 text-error font-medium hover:bg-error/5 transition-colors"
          >
            تسجيل الخروج
          </button>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
