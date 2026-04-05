import React, { useEffect, useMemo, useState } from 'react';
import { Play, BookOpen, Mic2, Waves, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { cn } from '@/src/lib/utils';
import { api } from '../lib/api';

const ENGLISH_TO_ARABIC: Record<string, string> = {
  Ikhfa: 'أحكام النون الساكنة',
  Idgham: 'أحكام الميم الساكنة',
  Izhar: 'المدود',
  Iqlab: 'أحكام الإقلاب',
};

const ICONS = [BookOpen, Mic2, Waves, BookOpen];

interface StatsResponse {
  samples_by_label: Record<string, number>;
  samples_by_sheikh: Record<string, number>;
  playable_by_label: Record<string, number>;
  playable_by_sheikh: Record<string, number>;
  playable_total: number;
  total_samples: number;
}

interface LessonCard {
  id: number;
  englishLabel: string;
  title: string;
  totalCount: number;
  playableCount: number;
  status: string;
  progress: number;
  icon: typeof BookOpen;
  active: boolean;
}

export default function Lessons() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLessons = async () => {
      try {
        setLoading(true);
        const stats: StatsResponse = await api.getStats();
        const entries = Object.entries(stats.samples_by_label || {});

        const mapped = entries.map(([label, count], index) => ({
          id: index + 1,
          englishLabel: label,
          title: ENGLISH_TO_ARABIC[label] || label,
          totalCount: count,
          playableCount: stats.playable_by_label?.[label] || 0,
          status: (stats.playable_by_label?.[label] || 0) > 0 ? 'قابل للتشغيل' : 'غير متاح حالياً',
          progress: 0,
          icon: ICONS[index % ICONS.length],
          active: index === 0,
        }));

        setLessons(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الدروس');
      } finally {
        setLoading(false);
      }
    };

    loadLessons();
  }, []);

  const featuredLesson = useMemo(() => lessons[0], [lessons]);

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />
      
      <main className="pt-24 px-6 max-w-2xl mx-auto">
        <section className="mb-12">
          <h2 className="font-headline text-5xl font-bold text-primary mb-4 leading-tight">دروس التجويد</h2>
          <p className="text-on-surface-variant text-lg leading-relaxed max-w-md">رحلة إتقان تلاوة كتاب الله بصوت عذب وأحكام منضبطة، خطوة بخطوة نحو الجودة.</p>
        </section>

        {loading && (
          <div className="mb-6 text-on-surface-variant">جاري تحميل الدروس...</div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error/20 text-error rounded-xl text-sm">{error}</div>
        )}

        {/* Featured Lesson */}
        {featuredLesson && (
        <div className="relative group mb-8 overflow-hidden rounded-3xl h-64 flex items-end p-8 bg-primary-container text-on-primary cursor-pointer hover:scale-[1.02] transition-transform"
             onClick={() => navigate(`/lessons/${featuredLesson.englishLabel}`)}>
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary-fixed via-transparent to-transparent" />
          </div>
          <div className="z-10 w-full">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-label tracking-widest uppercase opacity-80 mb-2 block">الدرس الحالي</span>
                <h3 className="text-3xl font-headline font-bold mb-2">{featuredLesson.title}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 w-32 bg-on-primary/20 rounded-full overflow-hidden">
                    <div className="bg-secondary-fixed h-full w-[100%]" />
                  </div>
                  <span className="text-sm font-label">{featuredLesson.playableCount}/{featuredLesson.totalCount} متاح</span>
                </div>
              </div>
              <button className="bg-on-primary text-primary-container h-12 w-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                <Play className="w-6 h-6 fill-current" />
              </button>
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1584281723351-9d92ff9f814e?q=80&w=400&auto=format&fit=crop" 
            alt="Pattern" 
            className="absolute right-[-10%] top-[-10%] opacity-10 w-64 h-64 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        )}

        {/* Lessons List */}
        <div className="space-y-4">
          {lessons.map((lesson) => {
            const Icon = lesson.icon;
            return (
              <motion.div 
                key={lesson.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => navigate(`/lessons/${lesson.englishLabel}`)}
                className={cn(
                  "p-5 rounded-2xl flex items-center gap-5 transition-all cursor-pointer border border-transparent",
                  lesson.active ? "bg-surface-container-lowest shadow-sm hover:border-outline-variant/10" : "bg-surface-container-low hover:bg-white hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center",
                  lesson.active ? "bg-surface-container text-primary" : "bg-surface-container text-on-surface-variant"
                )}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-headline text-xl font-semibold mb-1">{lesson.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant font-label">{lesson.totalCount} عينة</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    <span className={cn("text-xs font-medium", lesson.playableCount > 0 ? "text-primary" : "text-error")}>
                      {lesson.playableCount} متاح للتشغيل
                    </span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    <span className={cn("text-xs font-medium", lesson.active ? "text-primary" : "text-on-surface-variant")}>
                      {lesson.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="relative h-12 w-12">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                      <circle className="text-surface-container" cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" strokeWidth="2.5" />
                      {lesson.progress > 0 && (
                        <circle 
                          className="text-primary" 
                          cx="18" cy="18" fill="transparent" r="16" stroke="currentColor" 
                          strokeDasharray="100" strokeDashoffset={100 - lesson.progress} 
                          strokeLinecap="round" strokeWidth="2.5" 
                        />
                      )}
                    </svg>
                    <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold", lesson.progress === 0 && "text-on-surface-variant")}>
                      {lesson.progress > 0 ? `${lesson.progress}%` : '▶'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-secondary-container rounded-3xl p-6 flex items-center justify-between">
          <div className="max-w-[60%]">
            <h5 className="text-on-secondary-container font-headline text-xl font-bold mb-2">اختبر معلوماتك</h5>
            <p className="text-on-secondary-container/80 text-sm">أكمل 3 دروس لفتح الاختبار القصير الأول وتحصيل شهادة الإنجاز.</p>
          </div>
          <div className="h-20 w-20 flex items-center justify-center">
            <Award className="w-12 h-12 text-on-secondary-container fill-current" />
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
