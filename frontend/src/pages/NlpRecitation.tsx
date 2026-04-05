import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Heart, Mic, MicOff, RefreshCcw } from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../lib/api';
import quranHeartRaw from '../assets/quran-heart.svg?raw';
import { useAuth } from '../contexts/AuthContext';
import { writeAyahAttempt, writeSurahCompletion } from '../lib/firebaseCollections';

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

type SurahCompletion = {
  surahNo: number;
  surahNameAr: string;
  mistakes: number;
  completedAt: string;
};

type WordStatus = {
  word: string;
  isCorrect: boolean;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const COMPLETION_STORAGE_KEY = 'noor:surahCompletions';
const arabicNumber = (value: number) => new Intl.NumberFormat('ar-EG').format(value);

const normalizeArabic = (value: string) =>
  value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u061F\u060C\u061B.,!?؛،:()"'\-ـ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeArabic(value)
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

const normalizeSurahName = (value: string) => normalizeArabic(value).replace(/\s+/g, '');

const loadCompletions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || '{}') as Record<string, SurahCompletion>;
    return parsed;
  } catch {
    return {} as Record<string, SurahCompletion>;
  }
};

const saveCompletions = (value: Record<string, SurahCompletion>) => {
  localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(value));
};

export default function NlpRecitation() {
  const navigate = useNavigate();
  const { surahNo } = useParams<{ surahNo?: string }>();
  const { user } = useAuth();

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const heartSvgRef = useRef<HTMLDivElement>(null);

  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [selectedSurahNo, setSelectedSurahNo] = useState<number | null>(surahNo ? Number(surahNo) : null);
  const [surah, setSurah] = useState<QuranSurah | null>(null);
  const [activeAyahNo, setActiveAyahNo] = useState(1);
  const [recognizedText, setRecognizedText] = useState('');
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completions, setCompletions] = useState<Record<string, SurahCompletion>>({});

  const completionItems = useMemo(() => Object.values(completions) as SurahCompletion[], [completions]);

  const [clickedSurahNames, setClickedSurahNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompletions(loadCompletions());
  }, []);

  const handleSurahHeartClick = async (surahNameAr: string) => {
    if (!surahNameAr.trim()) return;

    const normalized = normalizeSurahName(surahNameAr);
    const isAlreadyClicked = clickedSurahNames.has(normalized);

    setClickedSurahNames((prev) => {
      const next = new Set(prev);
      if (isAlreadyClicked) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      return next;
    });

    if (isAlreadyClicked || !user?.uid) return;

    const surahMatch = surahs.find(
      (s) => normalizeSurahName(s.surah_name_ar) === normalized
    );

    if (!surahMatch) {
      setError('لم يتم العثور على السورة المطابقة في البيانات.');
      return;
    }

    try {
      await writeSurahCompletion(user.uid, {
        surahNo: surahMatch.surah_no,
        surahNameAr: surahMatch.surah_name_ar,
        totalMistakes: 0,
        completedWithLessThan10Mistakes: true,
      });

      const nextCompletions = {
        ...completions,
        [surahMatch.surah_no]: {
          surahNo: surahMatch.surah_no,
          surahNameAr: surahMatch.surah_name_ar,
          mistakes: 0,
          completedAt: new Date().toISOString(),
        },
      };
      setCompletions(nextCompletions);
      saveCompletions(nextCompletions);

      console.log('✅ Saved to Firestore:', surahMatch.surah_name_ar);
      setError('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'تعذر حفظ السورة في قاعدة البيانات.';
      setError(`تعذر حفظ السورة في قاعدة البيانات: ${message}`);
      console.error('❌ Firestore write failed:', err);
      setClickedSurahNames((prev) => {
        const next = new Set(prev);
        next.delete(normalized);
        return next;
      });
    }
  };

  const handleHeartContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (!target || !heartSvgRef.current) return;

    const group = target.closest('.surah-group');
    if (!group || !heartSvgRef.current.contains(group)) return;

    const nameElement = group.querySelector('.surah-name');
    const surahName = (nameElement?.textContent || '').trim();
    if (!surahName) return;

    console.log('🖱️ Clicked surah:', surahName);
    void handleSurahHeartClick(surahName);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSurahs = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getQuranSurahs();
        if (cancelled) return;

        const nextSurahs = data.surahs || [];
        setSurahs(nextSurahs);

        if (!selectedSurahNo && nextSurahs.length) {
          setSelectedSurahNo(nextSurahs[0].surah_no);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل السور');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSurahs();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedSurahNo) return;

    let cancelled = false;

    const loadSurah = async () => {
      try {
        setLoading(true);
        setError('');
        const detail = (await api.getQuranSurah(selectedSurahNo)) as QuranSurah;
        if (cancelled) return;

        setSurah(detail);
        setActiveAyahNo(1);
        setRecognizedText('');
        setTotalMistakes(0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'تعذر تحميل السورة');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSurah();

    return () => {
      cancelled = true;
    };
  }, [selectedSurahNo]);

  useEffect(() => {
    if (!surahNo) return;
    const parsed = Number(surahNo);
    if (!Number.isNaN(parsed)) {
      setSelectedSurahNo(parsed);
    }
  }, [surahNo]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const currentAyah = surah?.ayahs.find((ayah) => ayah.ayah_no_surah === activeAyahNo) || null;

  const comparison = useMemo(() => {
    const spokenWords = tokenize(recognizedText);
    const targetWords = tokenize(currentAyah?.ayah_ar || '');

    const tokens: WordStatus[] = spokenWords.map((word, index) => ({
      word,
      isCorrect: targetWords[index] === word,
    }));

    const correctWords = tokens.filter((item) => item.isCorrect).length;
    const mistakes = Math.max(targetWords.length, spokenWords.length) - correctWords;

    return {
      tokens,
      mistakes: Math.max(0, mistakes),
      spokenWordsCount: spokenWords.length,
      targetWordsCount: targetWords.length,
    };
  }, [recognizedText, currentAyah?.ayah_ar]);

  const completedSurahNameSet = useMemo(() => {
    const names = completionItems
      .filter((entry) => entry.mistakes < 10)
      .map((entry) => normalizeSurahName(entry.surahNameAr));

    return new Set([...names, ...clickedSurahNames]);
  }, [completionItems, clickedSurahNames]);

  const heartSvgMarkup = useMemo(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(quranHeartRaw, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return quranHeartRaw;

      svg.setAttribute('style', 'display:block; width:100%; height:auto; max-height:540px; direction:ltr;');
      svg.setAttribute('direction', 'ltr');

      const styleTag = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleTag.textContent = `
        .surah-name {
          font-size: 9px;
          font-weight: 700;
          font-family: Tajawal, Arial, sans-serif;
          direction: ltr;
          unicode-bidi: isolate;
        }
      `;
      svg.prepend(styleTag);

      const groups = doc.querySelectorAll('.surah-group');
      groups.forEach((group) => {
        const nameElement = group.querySelector('.surah-name');
        const pathElements = group.querySelectorAll('.surah-path');
        const name = normalizeSurahName(nameElement?.textContent || '');
        const isCompleted = completedSurahNameSet.has(name);

        pathElements.forEach((pathElement) => {
          pathElement.setAttribute('fill', isCompleted ? '#0d631b' : '#ffffff');
          pathElement.setAttribute('stroke', '#c9ced6');
          pathElement.setAttribute('stroke-width', '0.6');
          pathElement.setAttribute('cursor', 'pointer');
          pathElement.setAttribute('class', 'surah-path clickable-surah');
        });

        if (nameElement) {
          nameElement.setAttribute('fill', isCompleted ? '#ffffff' : '#111827');
          nameElement.setAttribute('font-size', '9px');
          nameElement.setAttribute('font-weight', '700');
          nameElement.setAttribute('font-family', 'Tajawal, Arial, sans-serif');
          nameElement.setAttribute('cursor', 'pointer');
        }

        (group as any).style.cursor = 'pointer';
      });

      return svg.outerHTML;
    } catch {
      return quranHeartRaw;
    }
  }, [completedSurahNameSet]);

  const startListening = () => {
    setError('');

    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('المتصفح لا يدعم التعرف الصوتي المباشر. جرب Google Chrome.');
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript || '')
        .join(' ')
        .trim();
      setRecognizedText(transcript);
    };

    recognition.onerror = () => {
      setError('حدث خطأ أثناء التقاط الصوت. تأكد من السماح بالميكروفون.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const completeSurahIfQualified = async (mistakesAfterFinish: number) => {
    if (!surah) return;

    if (user?.uid) {
      try {
        await writeSurahCompletion(user.uid, {
          surahNo: surah.surah_no,
          surahNameAr: surah.surah_name_ar,
          totalMistakes: mistakesAfterFinish,
          completedWithLessThan10Mistakes: mistakesAfterFinish < 10,
        });
      } catch {
        setError('تم الحفظ محلياً، لكن تعذر تحديث قاعدة البيانات حالياً.');
      }
    }

    if (mistakesAfterFinish >= 10) return;

    const nextCompletions = {
      ...completions,
      [surah.surah_no]: {
        surahNo: surah.surah_no,
        surahNameAr: surah.surah_name_ar,
        mistakes: mistakesAfterFinish,
        completedAt: new Date().toISOString(),
      },
    };

    setCompletions(nextCompletions);
    saveCompletions(nextCompletions);
  };

  const confirmAyah = async () => {
    if (!surah || !currentAyah) return;
    if (!recognizedText.trim()) {
      setError('اقرأ الآية أولاً ثم اضغط "تأكيد الآية".');
      return;
    }

    const nextTotalMistakes = totalMistakes + comparison.mistakes;
    const isLastAyah = activeAyahNo >= surah.ayahs.length;

    if (user?.uid) {
      try {
        await writeAyahAttempt(user.uid, {
          surahNo: surah.surah_no,
          surahNameAr: surah.surah_name_ar,
          ayahNo: currentAyah.ayah_no_surah,
          targetAyahText: currentAyah.ayah_ar,
          recognizedText,
          mistakes: comparison.mistakes,
          isLastAyah,
        });
      } catch {
        setError('تمت المتابعة، لكن تعذر تسجيل المحاولة في قاعدة البيانات حالياً.');
      }
    }

    setTotalMistakes(nextTotalMistakes);

    if (isLastAyah) {
      await completeSurahIfQualified(nextTotalMistakes);
      setError('');
      return;
    }

    setActiveAyahNo((prev) => prev + 1);
    setRecognizedText('');
    setError('');
  };

  const resetSession = () => {
    setActiveAyahNo(1);
    setRecognizedText('');
    setTotalMistakes(0);
    setError('');
  };

  const successState = surah && activeAyahNo >= surah.ayahs.length && recognizedText.trim().length > 0;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-4 md:px-6 max-w-6xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/reading')}
          className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى المصحف</span>
        </button>

        <section className="bg-surface-container-lowest rounded-3xl p-5 md:p-6 border border-outline-variant/10 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold">صفحة التلاوة الذكية (NLP)</h1>
              <p className="text-on-surface-variant mt-1">اقرأ الآية في الميكروفون، وسيظهر النص المتعرف عليه داخل البطاقة.</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-on-surface-variant">السورة</label>
              <select
                value={selectedSurahNo || ''}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSelectedSurahNo(next);
                  navigate(`/nlp-reading/${next}`);
                }}
                className="rounded-xl border border-outline-variant/25 bg-surface px-3 py-2 text-sm"
              >
                {surahs.map((item) => (
                  <option key={item.surah_no} value={item.surah_no}>
                    {item.surah_name_ar} ({item.surah_no})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {loading && <div className="text-on-surface-variant">جاري التحميل...</div>}
        {error && <div className="rounded-2xl p-4 bg-error/15 text-error text-sm">{error}</div>}

        {surah && currentAyah && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-headline font-bold">سورة {surah.surah_name_ar}</h2>
                  <span className="text-sm text-on-surface-variant">
                    الآية {arabicNumber(activeAyahNo)} / {arabicNumber(surah.ayahs.length)}
                  </span>
                </div>

                <div className="rounded-2xl border border-outline-variant/15 bg-surface p-4 mb-4">
                  <p className="text-xs text-on-surface-variant mb-2">النص المستهدف (للمقارنة)</p>
                  <p className="font-quran text-2xl leading-[2.2]">{currentAyah.ayah_ar}</p>
                </div>

                <div className="rounded-2xl border border-outline-variant/15 bg-surface p-4 min-h-28">
                  <p className="text-xs text-on-surface-variant mb-2">النص المتعرف عليه</p>

                  {comparison.tokens.length ? (
                    <p className="leading-9 text-lg font-medium">
                      {comparison.tokens.map((item, index) => (
                        <span key={`${item.word}-${index}`} className={item.isCorrect ? 'text-black' : 'text-error'}>
                          {item.word}{' '}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-on-surface-variant">هنا يظهر النص بعد القراءة (Placeholder)</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/10">
                    كلمات مقروءة: {arabicNumber(comparison.spokenWordsCount)}
                  </div>
                  <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/10">
                    أخطاء الآية: {arabicNumber(comparison.mistakes)}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {!isListening ? (
                    <button
                      onClick={startListening}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white font-bold active:scale-95 transition-transform"
                    >
                      <Mic className="w-4 h-4" />
                      افتح الميكروفون
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-error text-white font-bold active:scale-95 transition-transform"
                    >
                      <MicOff className="w-4 h-4" />
                      إيقاف
                    </button>
                  )}

                  <button
                    onClick={confirmAyah}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-secondary-container text-on-secondary-container font-bold active:scale-95 transition-transform"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    تأكيد الآية
                  </button>

                  <button
                    onClick={resetSession}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container-low border border-outline-variant/20 font-bold active:scale-95 transition-transform"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    إعادة المحاولة
                  </button>
                </div>

                <div className="mt-4 rounded-xl bg-surface-container-low p-3 border border-outline-variant/10 text-sm">
                  أخطاء السورة حتى الآن: <span className="font-bold">{arabicNumber(totalMistakes)}</span>
                </div>

                {successState && (
                  <div className={`mt-4 rounded-2xl p-4 text-sm ${totalMistakes < 10 ? 'bg-primary/15 text-primary' : 'bg-error/15 text-error'}`}>
                    {totalMistakes < 10
                      ? 'أحسنت! أكملت السورة بأقل من 10 أخطاء، وتم تلوينها داخل قلب السور.'
                      : 'تم إكمال السورة، لكن عدد الأخطاء 10 أو أكثر، لذلك لم تُحتسب في القلب بعد.'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-headline font-bold">قلب السور المكتملة</h3>
                </div>
                <p className="text-sm text-on-surface-variant mb-4">
                  كل سورة تُكملها بأقل من 10 أخطاء يتم تلوينها بالأخضر داخل القلب.
                </p>
                <p className="text-xs text-secondary mb-4 bg-secondary-container/30 rounded p-2">
                  💡 يمكنك النقر على أي سورة في القلب لتلوينها وحفظها في قاعدة البيانات للاختبار.
                </p>

                <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/60 overflow-auto">
                  <div
                    ref={heartSvgRef}
                    onClick={handleHeartContainerClick}
                    dangerouslySetInnerHTML={{ __html: heartSvgMarkup }}
                    className="w-full min-w-[320px]"
                  />
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
                <h4 className="font-headline text-lg font-bold mb-3">السور الملوّنة</h4>
                {completionItems.filter((item) => item.mistakes < 10).length ? (
                  <ul className="space-y-2 text-sm">
                    {completionItems
                      .filter((item) => item.mistakes < 10)
                      .sort((a, b) => a.surahNo - b.surahNo)
                      .map((item) => (
                        <li key={item.surahNo} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3 border border-outline-variant/10">
                          <span>{item.surahNameAr}</span>
                          <span className="text-on-surface-variant">{arabicNumber(item.mistakes)} أخطاء</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">لا توجد سور ملوّنة بعد.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
