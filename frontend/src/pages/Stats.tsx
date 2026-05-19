import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Flame, Target, TrendingUp, CheckCircle2, BookOpen, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { loadHeartProgress, type HeartSurahProgress } from '../lib/readingProgress';

interface StatsResponse {
  samples_by_label: Record<string, number>;
  samples_by_sheikh: Record<string, number>;
  playable_by_label: Record<string, number>;
  playable_by_sheikh: Record<string, number>;
  playable_total: number;
  total_samples: number;
}

interface LessonsResponse {
  total: number;
}

interface SurahsResponse {
  total_surahs: number;
  surahs?: Array<{ surah_no: number }>;
}

const ENGLISH_TO_ARABIC: Record<string, string> = {
  Ikhfa: 'أحكام النون الساكنة',
  Idgham: 'أحكام الميم الساكنة',
  Izhar: 'المدود',
  Iqlab: 'أحكام الإقلاب',
};

const numberFormatter = new Intl.NumberFormat('ar-EG');
const formatNumber = (value: number) => numberFormatter.format(value);

export default function Stats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [lessonCount, setLessonCount] = useState(0);
  const [surahCount, setSurahCount] = useState(0);
  const [readingProgress, setReadingProgress] = useState<Record<string, HeartSurahProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [statsData, lessonsData, surahData] = await Promise.all([
          api.getStats(),
          api.getLessons(),
          api.getQuranSurahs(),
        ]);

        if (cancelled) return;

        setStats(statsData);
        setLessonCount((lessonsData as LessonsResponse).total || 0);
        setSurahCount((surahData as SurahsResponse).total_surahs || (surahData.surahs?.length ?? 0));
        setReadingProgress(loadHeartProgress(user?.uid));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل الإحصائيات');
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
  }, [user?.uid]);

  const totalSamples = stats?.total_samples ?? 0;
  const playableTotal = stats?.playable_total ?? 0;
  const playableRate = totalSamples > 0 ? Math.round((playableTotal / totalSamples) * 100) : 0;

  const topLabels = useMemo(() => {
    const entries = Object.entries(stats?.samples_by_label || {})
      .map(([label, total]) => ({
        label,
        title: ENGLISH_TO_ARABIC[label] || label,
        total,
        playable: stats?.playable_by_label?.[label] || 0,
      }))
      .sort((left, right) => Number(right.playable) - Number(left.playable) || Number(right.total) - Number(left.total));

    return entries.slice(0, 7);
  }, [stats]);

  const topSheikh = useMemo(() => {
    const entries = Object.entries(stats?.playable_by_sheikh || {}).sort((left, right) => Number(right[1]) - Number(left[1]));
    return entries[0];
  }, [stats]);

  const progressItems = useMemo(() => {
    return Object.values(readingProgress)
      .filter((item) => item.progressPercent > 0)
      .sort((left, right) => right.progressPercent - left.progressPercent || left.surahNo - right.surahNo);
  }, [readingProgress]);

  const progressAverage = useMemo(() => {
    if (!progressItems.length) return 0;
    const total = progressItems.reduce((sum, item) => sum + item.progressPercent, 0);
    return Math.round(total / progressItems.length);
  }, [progressItems]);

  const progressCompletedCount = useMemo(() => {
    return progressItems.filter((item) => item.progressPercent >= 100).length;
  }, [progressItems]);

  const weeklyProgress = useMemo(() => {
    if (!topLabels.length) return [20, 35, 45, 55, 60, 75, 82];
    return topLabels.map((item) => Math.max(item.playable, 1));
  }, [topLabels]);

  const maxWeekly = Math.max(...weeklyProgress, 1);

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-4 md:px-6 max-w-5xl mx-auto space-y-8">
        <section>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            <BarChart3 className="w-4 h-4" />
            <span>تتبع الأداء</span>
          </div>
          <h2 className="font-headline text-4xl font-bold text-on-surface mb-2">إحصائيات التلاوة</h2>
          <p className="text-on-surface-variant">نظرة شاملة على بياناتك الحية: الدروس، العينات، والمحتوى القابل للتشغيل.</p>
        </section>

        {loading && <div className="text-on-surface-variant">جاري تحميل الإحصائيات...</div>}
        {error && <div className="p-4 bg-error/20 text-error rounded-2xl text-sm">{error}</div>}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'إجمالي العينات', value: formatNumber(totalSamples), icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'العينات القابلة للتشغيل', value: `${formatNumber(playableTotal)} (${playableRate}%)`, icon: Flame, color: 'text-secondary', bg: 'bg-secondary/10' },
            { label: 'الدروس / السور', value: `${formatNumber(lessonCount)} درس • ${formatNumber(surahCount || 114)} سورة`, icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((card) => (
            <div key={card.label} className="bg-surface-container-low rounded-3xl p-5 shadow-sm border border-outline-variant/10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-xs text-on-surface-variant font-medium mb-1">{card.label}</p>
              <p className="text-lg md:text-xl font-headline font-bold leading-snug">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-7 border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-xl font-headline font-bold">تقدم القراءة</h3>
              <p className="text-sm text-on-surface-variant mt-1">كل سورة مقروءة تُعرض هنا حسب آخر آية وصلت إليها.</p>
            </div>
            <span className="text-xs text-on-surface-variant">بيانات محلية خاصة بالحساب الحالي</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'السور التي بدأت', value: formatNumber(progressItems.length) },
              { label: 'السور المكتملة', value: formatNumber(progressCompletedCount) },
              { label: 'متوسط التقدم', value: `${formatNumber(progressAverage)}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-surface-container-low p-4 border border-outline-variant/10">
                <p className="text-xs text-on-surface-variant mb-1">{item.label}</p>
                <p className="text-2xl font-headline font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </div>

          {progressItems.length ? (
            <div className="space-y-3">
              {progressItems.map((item, index) => {
                const width = Math.max(item.progressPercent, 4);
                return (
                  <motion.div
                    key={item.surahNo}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-headline font-bold text-on-surface">{item.surahNameAr}</h4>
                        <p className="text-xs text-on-surface-variant mt-1">
                          آخر آية: {formatNumber(item.lastAyahNo)} / {formatNumber(item.totalAyahs)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-headline font-bold text-primary">{formatNumber(item.progressPercent)}%</p>
                        <p className="text-xs text-on-surface-variant">{item.progressPercent >= 100 ? 'مكتملة' : 'قيد المتابعة'}</p>
                      </div>
                    </div>
                    <div className="w-full h-4 rounded-full bg-surface-container-high overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.5, delay: index * 0.04 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/20 p-6 text-sm text-on-surface-variant">
              لا يوجد تقدم قراءة محفوظ لهذا الحساب بعد.
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-7 border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
            <div>
              <h3 className="text-xl font-headline font-bold">أكثر الدروس نشاطاً</h3>
              <p className="text-sm text-on-surface-variant mt-1">ترتيب مباشر حسب العينات القابلة للتشغيل.</p>
            </div>
            <span className="text-xs text-on-surface-variant">القيم من بيانات الدروس المحلية</span>
          </div>

          <div className="space-y-4">
            {topLabels.length ? topLabels.map((item, index) => {
              const width = Math.max((item.playable / maxWeekly) * 100, 10);
              return (
                <div key={item.label} className="grid grid-cols-[1fr_auto] gap-4 items-center">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-on-surface">{item.title}</p>
                      <span className="text-xs text-on-surface-variant">{formatNumber(item.playable)} / {formatNumber(item.total)}</span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-surface-container-high overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.45, delay: index * 0.05 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container"
                      />
                    </div>
                  </div>
                  <div className="w-16 text-left text-sm font-bold text-primary">{formatNumber(item.playable)}</div>
                </div>
              );
            }) : (
              <div className="text-on-surface-variant">لا توجد بيانات بعد.</div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-secondary-container rounded-3xl p-6 text-on-secondary-container flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-on-primary/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-headline text-lg font-bold mb-1">ملخص ذكي</h4>
              <p className="text-sm leading-relaxed">
                {playableRate >= 80
                  ? 'معظم عيناتك أصبحت قابلة للتشغيل، وهذا يعني أن البيانات المحلية جاهزة تقريباً للاستخدام اليومي.'
                  : playableRate >= 50
                    ? 'هناك توازن جيد بين البيانات المتوفرة والجاهزة للتشغيل. يمكنك متابعة تحسين النسب بشكل تدريجي.'
                    : 'ما زال جزء كبير من البيانات غير قابل للتشغيل حالياً، لكن الإحصائيات تساعدك على معرفة أين تركز.'}
              </p>
            </div>
          </section>

          <section className="bg-surface-container-low rounded-3xl p-6 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-headline text-lg font-bold">أفضل مقرئ الآن</h4>
              <Users className="w-5 h-5 text-on-surface-variant" />
            </div>
            {topSheikh ? (
              <>
                <p className="text-2xl font-headline font-bold text-primary">{topSheikh[0]}</p>
                <p className="text-sm text-on-surface-variant mt-1">{formatNumber(topSheikh[1])} عينة قابلة للتشغيل مرتبطة بهذا المقرئ.</p>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">لا توجد بيانات كافية لعرض أفضل مقرئ.</p>
            )}
          </section>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-headline font-bold">أهداف هذا الأسبوع</h3>
          {[
            `استعراض ${formatNumber(Math.min(lessonCount, 3))} من الدروس النشطة`,
            `قراءة ${formatNumber(Math.min(surahCount || 114, 5))} سور من المصحف`,
            `مراجعة ${formatNumber(Math.min(playableTotal, 100))} عينة قابلة للتشغيل`,
          ].map((goal) => (
            <div key={goal} className="bg-surface-container-low rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/10">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium">{goal}</p>
            </div>
          ))}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
