import React from 'react';
import { ArrowRight, CircleHelp, MessageCircleMore, Mail, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const faqs = [
  {
    q: 'كيف أبدأ في تحسين التلاوة؟',
    a: 'ابدأ من صفحة الدروس ثم اقرأ من صفحة المصحف لتحصل على تصحيح فوري.',
  },
  {
    q: 'هل يتم حفظ تقدمي تلقائياً؟',
    a: 'نعم، يتم حفظ آخر قراءة وتقدمك عند تسجيل الدخول بحسابك.',
  },
  {
    q: 'كيف أغير إعدادات التنبيه والصوت؟',
    a: 'من صفحة الحساب، افتح الإشعارات أو إعدادات الصوت وعدّل الخيارات بسهولة.',
  },
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface text-on-surface min-h-screen rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-6 max-w-2xl mx-auto pb-10">
        <button
          onClick={() => navigate('/profile')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى الحساب</span>
        </button>

        <section className="mb-8">
          <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">المساعدة</h2>
          <p className="text-on-surface-variant">إجابات سريعة ودعم مباشر لمساعدتك في رحلتك.</p>
        </section>

        <section className="space-y-3 mb-8">
          {faqs.map((item) => (
            <div key={item.q} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
              <div className="flex items-start gap-3">
                <CircleHelp className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{item.q}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <button className="w-full bg-secondary-container text-on-secondary-container rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircleMore className="w-5 h-5" />
              <span className="font-semibold">تواصل عبر الدردشة</span>
            </div>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <a
            href="mailto:support@nooralquran.app"
            className="w-full bg-surface-container-low rounded-2xl p-4 flex items-center justify-between border border-outline-variant/20"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-semibold">support@nooralquran.app</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-outline" />
          </a>
        </section>
      </main>
    </div>
  );
}
