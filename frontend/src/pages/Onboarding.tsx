import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-surface rtl" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[60%] aspect-square rounded-full bg-primary-container/5 blur-3xl" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] aspect-square rounded-full bg-secondary-container/10 blur-3xl" />

      <header className="fixed top-0 w-full flex justify-between items-center px-8 h-20 z-50">
        <div className="font-headline font-bold text-2xl text-primary flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
            <Sparkles className="w-5 h-5 fill-current" />
          </span>
          <span>نور القرآن</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-300"
        >
          تخطي
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 pt-24 pb-32 max-w-5xl mx-auto w-full relative">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Large Visual Anchor */}
          <div className="lg:col-span-7 relative group">
            <motion.div 
              initial={{ rotate: 2, scale: 0.95, opacity: 0 }}
              animate={{ rotate: 2, scale: 1, opacity: 1 }}
              whileHover={{ rotate: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute -inset-4 bg-primary-container/10 rounded-[40px]" 
            />
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="relative aspect-square md:aspect-video lg:aspect-square bg-surface-container-lowest rounded-[32px] overflow-hidden editorial-shadow border border-white/50"
            >
              <img 
                src="https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=1000&auto=format&fit=crop" 
                alt="Quran" 
                className="w-full h-full object-cover opacity-90 mix-blend-multiply"
                referrerPolicy="no-referrer"
              />
              
              {/* AI Overlay Visuals */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-primary/40 to-transparent">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center editorial-shadow">
                    <Mic className="text-primary w-10 h-10 fill-current" />
                  </div>
                  <div className="flex flex-col gap-1.5 h-12 justify-center">
                    <motion.div 
                      animate={{ width: [40, 80, 40] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="h-1 bg-primary-fixed rounded-full" 
                    />
                    <div className="w-40 h-1.5 bg-primary rounded-full" />
                    <motion.div 
                      animate={{ width: [60, 120, 60] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className="h-1 bg-primary-fixed-dim rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Badge */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute -bottom-6 -right-6 lg:right-10 bg-secondary-container p-6 rounded-2xl editorial-shadow max-w-[200px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="text-on-secondary-container w-5 h-5 fill-current" />
                <span className="text-on-secondary-container font-bold text-sm">تقنية متطورة</span>
              </div>
              <p className="text-on-secondary-container/80 text-xs leading-relaxed">تصحيح فوري لمخارج الحروف وقواعد التجويد</p>
            </motion.div>
          </div>

          {/* Textual Content */}
          <div className="lg:col-span-5 flex flex-col items-start text-right">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-4 inline-flex items-center px-4 py-1.5 rounded-full bg-primary/5 text-primary font-medium text-sm"
            >
              <Sparkles className="w-4 h-4 ml-2" />
              الجيل القادم من تطبيقات القرآن
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold text-on-surface leading-[1.3] mb-6"
            >
              تعلم قراءة <span className="text-primary italic">القرآن الكريم</span> بدقة الذكاء الاصطناعي
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-on-surface-variant text-lg leading-relaxed mb-10 max-w-md"
            >
              استمتع بتجربة فريدة تدمج بين قدسية النص القرآني وأحدث تقنيات التعرف على الصوت لتصحيح تلاوتك بدقة واحترافية.
            </motion.p>
            
            <div className="flex gap-2 mb-10">
              <div className="h-2 w-8 bg-primary rounded-full" />
              <div className="h-2 w-2 bg-surface-container-highest rounded-full" />
              <div className="h-2 w-2 bg-surface-container-highest rounded-full" />
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-8 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="hidden md:flex items-center gap-4 text-on-surface-variant/60">
            <span className="text-sm">بياناتك آمنة وخاصة دائماً</span>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="flex-grow md:flex-none bg-gradient-to-tl from-primary to-primary-container text-on-primary px-10 py-4 rounded-full font-bold text-lg editorial-shadow flex items-center justify-center gap-3"
          >
            <span>التالي</span>
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        </div>
      </footer>

      <div className="fixed bottom-0 w-full h-32 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
    </div>
  );
}
