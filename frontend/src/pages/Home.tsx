import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Bookmark, Clock3, Flame, Heart, Share2, Sparkles, Trophy, Award, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const ENGLISH_TO_ARABIC: Record<string, string> = {
  Ikhfa: 'أحكام النون الساكنة',
  Idgham: 'أحكام الميم الساكنة',
  Izhar: 'المدود',
  Iqlab: 'أحكام الإقلاب',
};

const LESSON_ICONS = [BookOpen, Award, Flame, Trophy];

interface StatsResponse {
  samples_by_label: Record<string, number>;
  samples_by_sheikh: Record<string, number>;
  playable_by_label: Record<string, number>;
  playable_by_sheikh: Record<string, number>;
  playable_total: number;
  total_samples: number;
}

interface SurahSummary {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  total_ayah_surah: number;
  place_of_revelation: string;
  sajah_ayah: boolean;
}

interface QuranSurah {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  total_ayah_surah: number;
  place_of_revelation: string;
  ayahs: Array<{
    ayah_no_surah: number;
    ayah_no_quran: number;
    ayah_ar: string;
    ayah_en: string;
  }>;
}

interface LastReading {
  surahNo: number;
  surahNameAr: string;
  ayahNo: number;
}

interface VerseOfDay {
  surahNameAr: string;
  surahNameEn: string;
  ayahNo: number;
  ayahAr: string;
  ayahEn: string;
}

interface LessonHighlight {
  englishLabel: string;
  title: string;
  totalCount: number;
  playableCount: number;
  icon: typeof BookOpen;
}

const numberFormatter = new Intl.NumberFormat('ar-EG');
const formatNumber = (value: number) => numberFormatter.format(value);

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(' ')[0] || 'صديقي';

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [resume, setResume] = useState<LastReading | null>(null);
  const [verseOfDay, setVerseOfDay] = useState<VerseOfDay | null>(null);
  const [topLessons, setTopLessons] = useState<LessonHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [statsData, , surahData] = await Promise.all([
          api.getStats(),
          api.getLessons(),
          api.getQuranSurahs(),
        ]);

        if (cancelled) return;

        const lessonEntries = Object.entries(statsData.samples_by_label || {})
          .sort((left, right) => Number(right[1]) - Number(left[1]))
          .slice(0, 4);

        setStats(statsData);
        setSurahs(surahData.surahs || []);
        setTopLessons(
          lessonEntries.map(([label, count], index) => ({
            englishLabel: label,
            title: ENGLISH_TO_ARABIC[label] || label,
            totalCount: count,
            playableCount: statsData.playable_by_label?.[label] || 0,
            icon: LESSON_ICONS[index % LESSON_ICONS.length],
          }))
        );

        const storedReadingRaw = localStorage.getItem('noor:lastReading');
        let storedReading: LastReading | null = null;
        if (storedReadingRaw) {
          try {
            storedReading = JSON.parse(storedReadingRaw) as LastReading;
          } catch {
            storedReading = null;
          }
        }

        const fallbackSurah =
          surahData.surahs?.[
            Math.min(new Date().getDate(), Math.max((surahData.surahs || []).length - 1, 0))
          ] || surahData.surahs?.[0];

        const preferredSurahNo = storedReading?.surahNo || fallbackSurah?.surah_no;
        if (preferredSurahNo) {
          const surahDetail: QuranSurah = await api.getQuranSurah(preferredSurahNo);
          const preferredAyahNo = storedReading?.ayahNo || 1;
          const selectedAyah = surahDetail.ayahs.find((ayah) => ayah.ayah_no_surah === preferredAyahNo) || surahDetail.ayahs[0];

          if (!cancelled && selectedAyah) {
            const nextResume = {
              surahNo: surahDetail.surah_no,
              surahNameAr: surahDetail.surah_name_ar,
              ayahNo: selectedAyah.ayah_no_surah,
            };

            setResume(nextResume);
            setVerseOfDay({
              surahNameAr: surahDetail.surah_name_ar,
              surahNameEn: surahDetail.surah_name_en,
              ayahNo: selectedAyah.ayah_no_surah,
              ayahAr: selectedAyah.ayah_ar,
              ayahEn: selectedAyah.ayah_en,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات الصفحة الرئيسية');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalSamples = stats?.total_samples ?? 0;
  const playableTotal = stats?.playable_total ?? 0;
  const playableRate = totalSamples > 0 ? Math.round((playableTotal / totalSamples) * 100) : 0;
  const lessonTotal = useMemo(() => Object.keys(stats?.samples_by_label || {}).length, [stats]);
  const surahTotal = surahs.length;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />

      <main className="pt-20 px-4 md:px-6 max-w-6xl mx-auto space-y-8">
        <section className="mt-4 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
            >
              <Sparkles className="w-4 h-4" />
              <span>لوحة اليوم</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-headline font-bold text-on-surface"
            >
              أهلاً، {firstName}
            </motion.h2>
            <p className="text-on-surface-variant font-body mt-1 max-w-2xl">
              {loading
                ? 'جاري تحميل أحدث إحصاءات المصحف والتجويد...'
                : 'كل الأرقام هنا تتحدث مباشرة من البيانات المحلية، لتعرف أين وصلت وماذا تقرأ الآن.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/reading')}
              className="inline-flex items-center gap-3 self-start md:self-auto quran-gradient text-on-primary px-6 py-4 rounded-full font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
            >
              ابدأ القراءة
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/nlp-reading')}
              className="inline-flex items-center gap-3 self-start md:self-auto bg-surface-container-low text-on-surface border border-outline-variant/20 px-6 py-4 rounded-full font-bold active:scale-95 transition-transform"
            >
              التلاوة الذكية
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </section>

        {error && <div className="p-4 bg-error/20 text-error rounded-2xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-8 bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group shadow-sm border border-outline-variant/10"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex justify-between items-start gap-6">
                <div>
                  <span className="text-secondary font-bold text-sm tracking-widest uppercase">تقدمك الحالي</span>
                  <h3 className="text-4xl font-headline font-extrabold mt-2">{playableRate}%</h3>
                </div>
                <div className="bg-secondary-container px-4 py-2 rounded-full shrink-0">
                  <span className="text-on-secondary-container font-bold text-sm">
                    {playableRate >= 75 ? 'مستوى: متقدم' : playableRate >= 40 ? 'مستوى: متوسط' : 'مستوى: مبتدئ'}
                  </span>
                </div>
              </div>
              <div className="mt-8 space-y-2">
                <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${playableRate}%` }} />
                </div>
                <p className="text-on-surface-variant text-sm font-medium">
                  {formatNumber(playableTotal)} عينة قابلة للتشغيل من أصل {formatNumber(totalSamples)} عينة.
                </p>
              </div>
            </div>
            <div className="mt-10 relative z-10 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/lessons')}
                className="bg-surface-container-lowest text-primary border border-primary/15 px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform"
              >
                استكشف الدروس
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/stats')}
                className="bg-surface-container-high text-on-surface px-5 py-3 rounded-full font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform"
              >
                عرض الإحصائيات
                <Clock3 className="w-4 h-4" />
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-4 bg-primary-container rounded-[2rem] p-6 text-on-primary-container flex flex-col justify-between relative overflow-hidden shadow-sm"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/islamic-art.png')]" />
            <div className="relative z-10">
              <span className="text-on-primary-container/70 text-xs font-bold tracking-widest">آخر قراءة</span>
              <h4 className="text-2xl font-headline font-bold mt-4 leading-relaxed">
                {resume ? resume.surahNameAr : 'ابدأ من المصحف'}
                <br />
                <span className="text-lg font-body opacity-90 text-primary-fixed">
                  {resume ? `الآية ${formatNumber(resume.ayahNo)}` : 'لم يتم فتح أي سورة بعد'}
                </span>
              </h4>
            </div>
            <div className="relative z-10 mt-12 flex justify-end">
              <button
                onClick={() => navigate(resume ? `/reading/${resume.surahNo}` : '/reading')}
                className="bg-surface-container-lowest/20 p-4 rounded-2xl backdrop-blur-sm active:scale-95 transition-transform"
              >
                <Bookmark className="w-8 h-8 fill-current" />
              </button>
            </div>
          </motion.section>

          <div className="md:col-span-4 bg-surface-container-low rounded-3xl p-6 flex items-center gap-4 shadow-sm border border-outline-variant/10">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-bold">العينات القابلة للتشغيل</p>
              <p className="text-xl font-headline font-bold text-on-surface">{formatNumber(playableTotal)}</p>
            </div>
          </div>
          <div className="md:col-span-4 bg-surface-container-low rounded-3xl p-6 flex items-center gap-4 shadow-sm border border-outline-variant/10">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-bold">الدروس المتاحة</p>
              <p className="text-xl font-headline font-bold text-on-surface">{formatNumber(lessonTotal)}</p>
            </div>
          </div>
          <div className="md:col-span-4 bg-surface-container-low rounded-3xl p-6 flex items-center gap-4 shadow-sm border border-outline-variant/10">
            <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-700">
              <Trophy className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-bold">السور المتاحة</p>
              <p className="text-xl font-headline font-bold text-on-surface">{formatNumber(surahTotal || 114)}</p>
            </div>
          </div>
        </div>

        <section className="bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <span className="text-secondary font-headline italic text-lg">آية اليوم</span>
              <h3 className="text-2xl font-headline font-bold text-on-surface mt-1">
                {verseOfDay ? `من سورة ${verseOfDay.surahNameAr}` : 'جاري اختيار آية مناسبة'}
              </h3>
            </div>
            <div className="flex gap-3 text-on-surface-variant">
              <button className="p-3 rounded-full hover:bg-surface-container-high transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full hover:bg-surface-container-high transition-colors">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </div>

          {verseOfDay ? (
            <div className="flex flex-col items-center text-center space-y-6">
              <p className="text-3xl md:text-4xl font-quran font-bold leading-[1.9] text-on-surface max-w-4xl">
                {verseOfDay.ayahAr}
              </p>
              <div className="h-px w-24 bg-outline-variant/30" />
              <p className="text-on-surface-variant font-body font-medium">
                {verseOfDay.surahNameAr} - الآية {formatNumber(verseOfDay.ayahNo)}
              </p>
              <p className="text-sm md:text-base text-on-surface-variant max-w-3xl leading-7">
                {verseOfDay.ayahEn}
              </p>
            </div>
          ) : (
            <div className="text-center text-on-surface-variant py-8">جاري تحميل الآية من بيانات القرآن...</div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-end gap-4">
            <div>
              <h3 className="text-2xl font-headline font-bold">دروس التجويد المقترحة</h3>
              <p className="text-sm text-on-surface-variant mt-1">اعتمدت على أكثر الدروس نشاطاً في بياناتك.</p>
            </div>
            <button onClick={() => navigate('/lessons')} className="text-primary font-bold text-sm flex items-center gap-1">
              عرض الكل
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading && !topLessons.length
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-3xl min-h-56 bg-surface-container-low animate-pulse" />
                ))
              : topLessons.map((lesson, index) => {
                  const Icon = lesson.icon;
                  return (
                    <motion.button
                      key={lesson.englishLabel}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => navigate(`/lessons/${lesson.englishLabel}`)}
                      className={`text-right rounded-3xl p-6 bg-surface-container-lowest border border-outline-variant/10 shadow-sm hover:border-primary/20 hover:shadow-md transition-all ${index === 1 ? 'md:translate-y-3' : ''}`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center mb-5">
                        <Icon className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-on-surface-variant font-bold mb-2">
                        {formatNumber(lesson.playableCount)} / {formatNumber(lesson.totalCount)} متاح
                      </p>
                      <p className="text-xl font-headline font-bold text-on-surface leading-snug">{lesson.title}</p>
                      <div className="mt-5 h-2 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${lesson.totalCount ? Math.max((lesson.playableCount / lesson.totalCount) * 100, 8) : 8}%`,
                          }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

