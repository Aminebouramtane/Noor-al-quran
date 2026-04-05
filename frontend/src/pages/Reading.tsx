import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronLeft, Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../lib/api';

type SurahSummary = {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  total_ayah_surah: number;
  place_of_revelation: string;
  sajah_ayah: boolean;
};

type QuranAyah = {
  ayah_no_surah: number;
  ayah_no_quran: number;
  ayah_ar: string;
  ayah_en: string;
};

type QuranSurah = {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  total_ayah_surah: number;
  place_of_revelation: string;
  ayahs: QuranAyah[];
};

const arabicNumber = (value: number) => new Intl.NumberFormat('ar-EG').format(value);

export default function Reading() {
  const navigate = useNavigate();
  const { surahNo } = useParams<{ surahNo?: string }>();
  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [surah, setSurah] = useState<QuranSurah | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [activeAyah, setActiveAyah] = useState(1);
  const ayahRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const currentSurahNo = surahNo ? Number(surahNo) : null;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (currentSurahNo) {
          const data: QuranSurah = await api.getQuranSurah(currentSurahNo);
          setSurah(data);
          setActiveAyah(1);
        } else {
          const data = await api.getQuranSurahs();
          setSurah(null);
          setSurahs(data.surahs || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل المصحف');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentSurahNo]);

  const filteredSurahs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return surahs;
    return surahs.filter((item) =>
      item.surah_name_ar.toLowerCase().includes(query) ||
      item.surah_name_en.toLowerCase().includes(query) ||
      item.surah_name_roman.toLowerCase().includes(query) ||
      String(item.surah_no).includes(query)
    );
  }, [search, surahs]);

  const totalAyahs = surah?.ayahs.length ?? 0;
  const currentAyah = surah?.ayahs.find((ayah) => ayah.ayah_no_surah === activeAyah) ?? surah?.ayahs[0] ?? null;
  const isReadingPage = Boolean(currentSurahNo);

  useEffect(() => {
    if (!surah || !currentAyah) return;
    const target = ayahRefs.current[currentAyah.ayah_no_surah];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentAyah?.ayah_no_surah, surah]);

  useEffect(() => {
    if (!surah || !currentSurahNo) return;
    localStorage.setItem(
      'noor:lastReading',
      JSON.stringify({
        surahNo: surah.surah_no,
        surahNameAr: surah.surah_name_ar,
        ayahNo: activeAyah,
      })
    );
  }, [activeAyah, currentSurahNo, surah]);

  const jumpToAyah = (ayahNumber: number) => {
    if (!surah) return;
    const safeAyah = Math.max(1, Math.min(ayahNumber, totalAyahs));
    setActiveAyah(safeAyah);
  };

  const stepAyah = (direction: 1 | -1) => {
    if (!surah) return;
    jumpToAyah(activeAyah + direction);
  };

  return (
    <div className="relative bg-surface text-on-surface min-h-screen pb-32 rtl overflow-hidden" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(120,92,255,0.08),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(196,167,255,0.08),_transparent_30%)]" />
      <Header />

      <main className={`relative pt-24 px-4 md:px-6 mx-auto ${isReadingPage ? 'max-w-5xl' : 'max-w-6xl'}`}>
        {!currentSurahNo ? (
          <>
            <section className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4 shadow-sm shadow-primary/10">
                <Sparkles className="w-4 h-4" />
                <span>المصحف الشريف</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary mb-3">المصحف</h1>
              <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">
                اختر السورة التي تريد قراءتها من المصحف، ثم افتحها لعرض الآيات بالتسلسل من بيانات القرآن المحلية.
              </p>
            </section>

            <div className="mb-6 relative max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن سورة..."
                className="w-full rounded-2xl bg-surface-container-lowest border border-outline-variant/20 pl-4 pr-12 py-4 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
              />
            </div>

            {loading && <div className="text-center text-on-surface-variant py-12">جاري تحميل السور...</div>}
            {error && <div className="mb-6 p-4 bg-error/20 text-error rounded-xl text-sm">{error}</div>}

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSurahs.map((item) => (
                <motion.button
                  key={item.surah_no}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigate(`/reading/${item.surah_no}`)}
                  className="group text-right rounded-3xl p-5 bg-surface-container-lowest/95 border border-outline-variant/20 shadow-sm hover:border-primary/25 hover:shadow-md transition-all backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center font-bold">
                        {arabicNumber(item.surah_no)}
                      </div>
                      <div>
                        <h2 className="font-headline text-xl font-bold text-on-surface">{item.surah_name_ar}</h2>
                        <p className="text-sm text-on-surface-variant">
                          {item.surah_name_en} • {item.surah_name_roman}
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-on-surface-variant mt-1 transition-transform group-hover:-translate-x-1" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-on-surface-variant">
                    <span>{item.total_ayah_surah} آية</span>
                    <span>{item.place_of_revelation}</span>
                  </div>
                </motion.button>
              ))}
            </section>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/reading')}
              className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى المصحف</span>
            </button>

            {loading && <div className="text-center text-on-surface-variant py-12">جاري تحميل السورة...</div>}
            {error && <div className="mb-6 p-4 bg-error/20 text-error rounded-xl text-sm">{error}</div>}

            {surah && (
              <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-surface-container-lowest/95 p-5 md:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold shadow-sm shadow-primary/10">
                      <BookOpen className="w-4 h-4" />
                      <span>سورة {surah.surah_name_ar}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary leading-tight">
                      {surah.surah_name_ar}
                    </h1>
                    <p className="text-on-surface-variant text-base md:text-lg max-w-3xl">
                      {surah.surah_name_en} • {surah.surah_name_roman} • {surah.total_ayah_surah} آية • {surah.place_of_revelation}
                    </p>
                  </div>
                </section>

                <section className="sticky top-20 z-10 rounded-[1.75rem] border border-primary/10 bg-surface/90 px-4 py-4 md:px-5 shadow-lg backdrop-blur-md">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-on-surface-variant mb-1">آية القراءة الحالية</p>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-container text-primary font-bold">
                          {arabicNumber(activeAyah)}
                        </span>
                        <div>
                          <p className="font-headline text-lg text-on-surface font-semibold">
                            {currentAyah ? currentAyah.ayah_ar.slice(0, 28) : 'اختر آية للقراءة'}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {arabicNumber(activeAyah)} / {arabicNumber(totalAyahs)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => stepAyah(-1)}
                        disabled={activeAyah <= 1}
                        className="px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant/20 text-sm text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        الآية السابقة
                      </button>
                      <button
                        onClick={() => stepAyah(1)}
                        disabled={activeAyah >= totalAyahs}
                        className="px-4 py-2 rounded-full bg-primary text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        الآية التالية
                      </button>
                      <label className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-lowest border border-outline-variant/20 rounded-full px-3 py-2">
                        <span>اذهب إلى</span>
                        <select
                          value={activeAyah}
                          onChange={(e) => jumpToAyah(Number(e.target.value))}
                          className="bg-transparent outline-none text-on-surface"
                        >
                          {surah.ayahs.map((ayah) => (
                            <option key={ayah.ayah_no_quran} value={ayah.ayah_no_surah}>
                              آية {ayah.ayah_no_surah}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                </section>

                <div className="space-y-4 pb-6">
                  {surah.ayahs.map((ayah) => (
                    <motion.article
                      key={ayah.ayah_no_quran}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      ref={(node) => {
                        ayahRefs.current[ayah.ayah_no_surah] = node;
                      }}
                      onClick={() => setActiveAyah(ayah.ayah_no_surah)}
                      className={`cursor-pointer rounded-3xl p-5 md:p-7 border shadow-sm transition-all ${
                        activeAyah === ayah.ayah_no_surah
                          ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-md'
                          : 'bg-surface-container-lowest/95 border-outline-variant/20 hover:border-primary/20 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-container text-primary font-bold">
                          {arabicNumber(ayah.ayah_no_surah)}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {arabicNumber(ayah.ayah_no_quran)}
                        </span>
                      </div>
                      <p className="font-quran text-3xl md:text-4xl leading-[2.8] text-on-surface text-right mb-5">
                        {ayah.ayah_ar}
                      </p>
                      <div className="rounded-2xl bg-surface-container-lowest/60 border border-outline-variant/10 p-4">
                        <p className="text-sm md:text-base text-on-surface-variant leading-7">{ayah.ayah_en}</p>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
