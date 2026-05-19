import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Heart, Mic, MicOff, RefreshCcw } from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../lib/api';
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
  tafsir?: string | null;
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

type AyahMistakeDetail = {
  ayahNo: number;
  mistakes: number;
  pairs: Array<{ expected: string; heard: string }>;
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

type NlpAyahMatch = {
  rank: number;
  score: number;
  distance: number;
  surah_no: number;
  surah_name_ar: string;
  ayah_no_surah: number;
  ayah_no_quran: number;
  ayah_ar: string;
  ayah_en: string;
  tafsir?: string | null;
  target_id: string;
  target_label: string;
};

const COMPLETION_STORAGE_KEY = 'noor:surahCompletions';
const COMPLETION_CHANGED_EVENT = 'noor:surahCompletionsChanged';
const arabicNumber = (value: number) => new Intl.NumberFormat('ar-EG').format(value);

const normalizeArabic = (value: string) =>
  value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ٱ/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
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

const alignSpokenToTarget = (targetText: string, spokenText: string) => {
  const targetWords = tokenize(targetText);
  const spokenWords = tokenize(spokenText);

  if (!targetWords.length) {
    return { targetWords, spokenWords, alignedSpoken: [] as string[], offset: 0 };
  }

  if (!spokenWords.length) {
    return { targetWords, spokenWords, alignedSpoken: [] as string[], offset: 0 };
  }

  let bestOffset = 0;
  let bestCorrect = -1;
  const maxOffset = Math.max(0, spokenWords.length - 1);

  for (let offset = 0; offset <= maxOffset; offset += 1) {
    let correct = 0;
    for (let i = 0; i < targetWords.length && i + offset < spokenWords.length; i += 1) {
      if (targetWords[i] === spokenWords[i + offset]) {
        correct += 1;
      }
    }

    if (correct > bestCorrect) {
      bestCorrect = correct;
      bestOffset = offset;
    }
  }

  const alignedSpoken = spokenWords.slice(bestOffset, bestOffset + targetWords.length);
  return { targetWords, spokenWords, alignedSpoken, offset: bestOffset };
};

const normalizeSurahName = (value: string) => normalizeArabic(value).replace(/\s+/g, '');

const calculateMistakes = (targetText: string, spokenText: string) => {
  const { targetWords, alignedSpoken } = alignSpokenToTarget(targetText, spokenText);
  const correctWords = alignedSpoken.filter((word, index) => targetWords[index] === word).length;
  return Math.max(0, Math.max(targetWords.length, alignedSpoken.length) - correctWords);
};

const buildMistakePairs = (targetText: string, spokenText: string, maxPairs: number = 8) => {
  const { targetWords, alignedSpoken } = alignSpokenToTarget(targetText, spokenText);
  const pairs: Array<{ expected: string; heard: string }> = [];
  const maxLen = Math.max(targetWords.length, alignedSpoken.length);

  for (let i = 0; i < maxLen; i += 1) {
    const expected = targetWords[i] ?? '—';
    const heard = alignedSpoken[i] ?? '—';
    if (expected !== heard) {
      pairs.push({ expected, heard });
      if (pairs.length >= maxPairs) break;
    }
  }

  return pairs;
};

const transcriptContainsRemainingSurah = (transcript: string, ayahs: QuranAyah[], startAyahNo: number) => {
  const normalizedTranscript = normalizeArabic(transcript);
  if (!normalizedTranscript) return false;

  let cursor = 0;
  for (const ayah of ayahs.slice(Math.max(0, startAyahNo - 1))) {
    const normalizedAyah = normalizeArabic(ayah.ayah_ar);
    if (!normalizedAyah) return false;

    const index = normalizedTranscript.indexOf(normalizedAyah, cursor);
    if (index === -1) return false;
    cursor = index + normalizedAyah.length;
  }

  return true;
};

const MIN_AUTO_MATCH_SCORE = 0.35;

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
  window.dispatchEvent(new Event(COMPLETION_CHANGED_EVENT));
};

export default function NlpRecitation() {
  const navigate = useNavigate();
  const { surahNo } = useParams<{ surahNo?: string }>();
  const { user } = useAuth();

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const keepListeningRef = useRef(false);
  const transcriptRef = useRef('');

  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [selectedSurahNo, setSelectedSurahNo] = useState<number | null>(surahNo ? Number(surahNo) : null);
  const [surah, setSurah] = useState<QuranSurah | null>(null);
  const [activeAyahNo, setActiveAyahNo] = useState(1);
  const [recognizedText, setRecognizedText] = useState('');
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelMatches, setModelMatches] = useState<NlpAyahMatch[]>([]);
  const [completions, setCompletions] = useState<Record<string, SurahCompletion>>({});
  const [autoTilawaEnabled, setAutoTilawaEnabled] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [nlpHint, setNlpHint] = useState('');
  const [ayahMistakeDetails, setAyahMistakeDetails] = useState<AyahMistakeDetail[]>([]);
  const [showMistakeDetails, setShowMistakeDetails] = useState(false);

  const completionItems = useMemo(() => Object.values(completions) as SurahCompletion[], [completions]);

  useEffect(() => {
    setCompletions(loadCompletions());

    const onCompletionChanged = () => {
      setCompletions(loadCompletions());
    };

    window.addEventListener(COMPLETION_CHANGED_EVENT, onCompletionChanged);
    return () => window.removeEventListener(COMPLETION_CHANGED_EVENT, onCompletionChanged);
  }, []);


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
        setSessionFinished(false);
        setNlpHint('');
        setAyahMistakeDetails([]);
        setShowMistakeDetails(false);
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

  const isFullSurahTranscript = useMemo(() => {
    if (!surah || !recognizedText.trim()) return false;
    return transcriptContainsRemainingSurah(recognizedText, surah.ayahs, activeAyahNo);
  }, [surah, recognizedText, activeAyahNo]);

  const comparisonTargetText = useMemo(() => {
    if (!surah || !currentAyah) return '';
    if (isFullSurahTranscript) {
      return surah.ayahs.slice(Math.max(0, activeAyahNo - 1)).map((ayah) => ayah.ayah_ar).join(' ');
    }
    return currentAyah.ayah_ar;
  }, [surah, currentAyah, isFullSurahTranscript, activeAyahNo]);

  const comparison = useMemo(() => {
    const { spokenWords, targetWords, alignedSpoken } = alignSpokenToTarget(comparisonTargetText, recognizedText);

    const tokens: WordStatus[] = alignedSpoken.map((word, index) => ({
      word,
      isCorrect: targetWords[index] === word,
    }));

    const correctWords = tokens.filter((item) => item.isCorrect).length;
    const mistakes = Math.max(targetWords.length, alignedSpoken.length) - correctWords;

    return {
      tokens,
      mistakes: Math.max(0, mistakes),
      spokenWordsCount: spokenWords.length,
      targetWordsCount: targetWords.length,
    };
  }, [recognizedText, comparisonTargetText]);

  const analyzeRecitationWithModel = async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean) {
      setModelMatches([]);
      return [] as NlpAyahMatch[];
    }

    try {
      setModelLoading(true);
      const result = await api.matchRecitedAyah(clean, 3);
      const matches = (result?.matches || []) as NlpAyahMatch[];
      setModelMatches(matches);

      return matches;
    } catch {
      setError('تعذر تحليل التلاوة بالنموذج حالياً.');
      return [] as NlpAyahMatch[];
    } finally {
      setModelLoading(false);
    }
  };

  const advanceAyah = async (spokenText: string, mistakes: number) => {
    if (!surah || !currentAyah) return;

    const nextTotalMistakes = totalMistakes + mistakes;
    const isLastAyah = activeAyahNo >= surah.ayahs.length;

    if (user?.uid) {
      try {
        await writeAyahAttempt(user.uid, {
          surahNo: surah.surah_no,
          surahNameAr: surah.surah_name_ar,
          ayahNo: currentAyah.ayah_no_surah,
          targetAyahText: currentAyah.ayah_ar,
          recognizedText: spokenText,
          mistakes,
          isLastAyah,
        });
      } catch {
        setError('تمت المتابعة، لكن تعذر تسجيل المحاولة في قاعدة البيانات حالياً.');
      }
    }

    setTotalMistakes(nextTotalMistakes);

    if (mistakes > 0) {
      const nextDetail: AyahMistakeDetail = {
        ayahNo: currentAyah.ayah_no_surah,
        mistakes,
        pairs: buildMistakePairs(currentAyah.ayah_ar, spokenText),
      };

      setAyahMistakeDetails((prev) => {
        const remaining = prev.filter((item) => item.ayahNo !== nextDetail.ayahNo);
        return [...remaining, nextDetail].sort((a, b) => a.ayahNo - b.ayahNo);
      });
    }

    if (isLastAyah) {
      await completeSurahIfQualified(nextTotalMistakes);
      setSessionFinished(true);
      setAutoTilawaEnabled(false);
      setError('');
      setNlpHint(nextTotalMistakes < 10
        ? 'تمت تلاوة السورة كاملة وحُفظت كـ مكتملة في قلب السور.'
        : 'تمت تلاوة السورة كاملة، لكن الأخطاء 10 أو أكثر لذلك لم تتحول إلى اللون الأخضر بعد.');
      return;
    }

    setActiveAyahNo((prev) => prev + 1);
    setRecognizedText('');
    setError('');
  };

  const completeFromTranscriptIfWholeSurah = async (transcript: string) => {
    if (!surah) return false;
    let modelMatched = false;
    const remainingAyahCount = Math.max(0, surah.ayahs.length - activeAyahNo + 1);
    try {
      const compare = await api.compareRecitedSurah(transcript, surah.surah_no, activeAyahNo);
      modelMatched = Boolean(
        compare?.is_match
        && Number(compare?.matched_ayahs || 0) >= remainingAyahCount
        && Number(compare?.coverage_ratio || 0) >= 0.999
      );
    } catch {
      // Fallback to local containment heuristic if backend compare is temporarily unavailable.
      modelMatched = transcriptContainsRemainingSurah(transcript, surah.ayahs, activeAyahNo);
    }

    if (!modelMatched) return false;

    const fullSurahMistakes = 0;
    setTotalMistakes(fullSurahMistakes);
    await completeSurahIfQualified(fullSurahMistakes);
    setSessionFinished(true);
    setAutoTilawaEnabled(false);
    setActiveAyahNo(surah.ayahs.length);
    setRecognizedText(transcript);
    setError('');
    setNlpHint('تم التعرف على السورة كاملة بشكل صحيح، وتم احتسابها في القلب باللون الأخضر.');
    return true;
  };

  const handleAutoTilawaProgress = async (transcript: string, matches: NlpAyahMatch[]) => {
    if (!surah || !currentAyah || !matches.length) {
      setNlpHint('لم يتعرف النموذج على آية واضحة. أعد القراءة بوضوح أكثر.');
      return;
    }

    const top = matches[0];
    if (top.surah_no !== surah.surah_no) {
      setNlpHint(`النموذج رجّح سورة ${top.surah_name_ar}، وأنت في سورة ${surah.surah_name_ar}. أكمل نفس السورة الحالية.`);
      return;
    }

    if (top.score < MIN_AUTO_MATCH_SCORE) {
      setNlpHint(`الثقة منخفضة (${(top.score * 100).toFixed(1)}%). أعد تلاوة نفس الآية.`);
      return;
    }

    if (top.ayah_no_surah < activeAyahNo) {
      setNlpHint('يبدو أنك أعدت آية سابقة. أكمل من الآية الحالية.');
      return;
    }

    if (top.ayah_no_surah > activeAyahNo) {
      setNlpHint('تم التعرف على آية لاحقة. سننتقل لها ونكمل التلاوة منها.');
      setActiveAyahNo(top.ayah_no_surah);
      return;
    }

    const mistakes = calculateMistakes(currentAyah.ayah_ar, transcript);
    await advanceAyah(transcript, mistakes);
  };

  const startListening = () => {
    setError('');
    keepListeningRef.current = true;

    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('المتصفح لا يدعم التعرف الصوتي المباشر. جرب Google Chrome.');
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index][0]?.transcript || '')
        .join(' ')
        .trim();
      setRecognizedText(transcript);
      transcriptRef.current = transcript;
    };

    recognition.onerror = () => {
      setError('حدث خطأ أثناء التقاط الصوت. تأكد من السماح بالميكروفون.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalTranscript = transcriptRef.current.trim();
      recognitionRef.current = null;
      if (finalTranscript) {
        void (async () => {
          const matches = await analyzeRecitationWithModel(finalTranscript);

          if (await completeFromTranscriptIfWholeSurah(finalTranscript)) {
            return;
          }

          if (autoTilawaEnabled && !sessionFinished) {
            await handleAutoTilawaProgress(finalTranscript, matches);
          }
        })();
      }

      if (keepListeningRef.current && !sessionFinished) {
        window.setTimeout(() => {
          if (keepListeningRef.current && !sessionFinished) {
            startListening();
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    keepListeningRef.current = false;
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

    if (await completeFromTranscriptIfWholeSurah(recognizedText)) {
      return;
    }

    await advanceAyah(recognizedText, comparison.mistakes);
  };

  useEffect(() => {
    if (!autoTilawaEnabled || isListening || loading || sessionFinished) return;

    const timer = window.setTimeout(() => {
      startListening();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [autoTilawaEnabled, isListening, loading, sessionFinished]);

  const resetSession = () => {
    if (isListening) {
      stopListening();
    }
    setActiveAyahNo(1);
    setRecognizedText('');
    setTotalMistakes(0);
    setModelMatches([]);
    setAutoTilawaEnabled(false);
    setSessionFinished(false);
    setNlpHint('');
    setAyahMistakeDetails([]);
    setShowMistakeDetails(false);
    transcriptRef.current = '';
    setError('');
  };

  const successState = Boolean(surah && sessionFinished);

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
                  <p className="font-quran text-2xl leading-[2.2]">{isFullSurahTranscript ? comparisonTargetText : currentAyah.ayah_ar}</p>
                </div>

                {currentAyah.tafsir && (
                  <div className="rounded-2xl border border-secondary/15 bg-secondary-container/20 p-4 mb-4">
                    <p className="text-xs text-secondary font-bold mb-2">التفسير</p>
                    <p className="text-sm leading-8 text-on-surface">{currentAyah.tafsir}</p>
                  </div>
                )}

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

                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs text-on-surface-variant mb-2">تحليل النموذج (NLP)</p>
                  {modelLoading ? (
                    <p className="text-sm text-on-surface-variant">جاري تحليل التلاوة...</p>
                  ) : modelMatches.length > 0 ? (
                    <div className="space-y-2">
                      {modelMatches.map((match) => (
                        <div key={`${match.target_id}-${match.rank}`} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-bold">#{match.rank} {match.surah_name_ar} - آية {arabicNumber(match.ayah_no_surah)}</span>
                            <span className="text-on-surface-variant">ثقة: {(match.score * 100).toFixed(1)}%</span>
                          </div>
                          <p className="mt-1 font-quran text-lg leading-8">{match.ayah_ar}</p>
                          {match.tafsir && (
                            <p className="mt-2 text-xs text-on-surface-variant leading-6">{match.tafsir.slice(0, 220)}...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-on-surface-variant">افتح الميكروفون واقرأ، وسيعرض النموذج أقرب آية تلقائياً.</p>
                  )}
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
                    onClick={() => {
                      if (autoTilawaEnabled) {
                        setAutoTilawaEnabled(false);
                        if (isListening) {
                          stopListening();
                        }
                        setNlpHint('تم إيقاف وضع التلاوة التلقائي.');
                        return;
                      }

                      setAutoTilawaEnabled(true);
                      setSessionFinished(false);
                      setNlpHint('وضع التلاوة التلقائي مفعل: اقرأ كل آية وسيتم التقدم تلقائياً عبر NLP.');
                      if (!isListening) {
                        startListening();
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold active:scale-95 transition-transform ${autoTilawaEnabled ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}
                  >
                    <Mic className="w-4 h-4" />
                    {autoTilawaEnabled ? 'إيقاف التلاوة التلقائية' : 'ابدأ تلاوة السورة تلقائياً'}
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

                {nlpHint && (
                  <div className="mt-3 rounded-xl bg-secondary-container/30 border border-secondary/20 p-3 text-sm text-on-surface">
                    {nlpHint}
                  </div>
                )}

                {successState && (
                  <button
                    type="button"
                    onClick={() => setShowMistakeDetails((prev) => !prev)}
                    className={`mt-4 w-full text-right rounded-2xl p-4 text-sm ${totalMistakes < 10 ? 'bg-primary/15 text-primary' : 'bg-error/15 text-error'}`}
                  >
                    {totalMistakes < 10
                      ? 'أحسنت! أكملت السورة بأقل من 10 أخطاء، وتم تلوينها داخل قلب السور.'
                      : 'تم إكمال السورة، لكن عدد الأخطاء 10 أو أكثر، لذلك لم تُحتسب في القلب بعد.'}
                    <span className="block mt-2 text-xs opacity-80">اضغط لعرض تفاصيل الأخطاء</span>
                  </button>
                )}

                {successState && showMistakeDetails && ayahMistakeDetails.length > 0 && (
                  <div className="mt-3 rounded-2xl p-4 bg-error/10 border border-error/30 text-sm">
                    <p className="font-bold text-error mb-3">تفاصيل الأخطاء حسب الآية</p>
                    <div className="space-y-3">
                      {ayahMistakeDetails.map((detail) => (
                        <div key={detail.ayahNo} className="rounded-xl bg-surface p-3 border border-outline-variant/20">
                          <p className="font-semibold mb-2">الآية {arabicNumber(detail.ayahNo)} - {arabicNumber(detail.mistakes)} أخطاء</p>
                          {detail.pairs.length > 0 ? (
                            <div className="space-y-1 text-xs">
                              {detail.pairs.map((pair, index) => (
                                <p key={`${detail.ayahNo}-${index}`}>متوقع: <span className="font-semibold">{pair.expected}</span> | سُمِع: <span className="font-semibold text-error">{pair.heard}</span></p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-on-surface-variant">تعذّر استخراج كلمات مختلفة لهذه الآية.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {successState && showMistakeDetails && ayahMistakeDetails.length === 0 && (
                  <div className="mt-3 rounded-2xl p-4 bg-primary/10 border border-primary/30 text-sm text-primary">
                    لا توجد أخطاء محفوظة لهذه الجلسة.
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
                  القلب أصبح في صفحة مستقلة الآن. افتحه من الأسفل أو من الزر التالي، ثم أكمل التلاوة هناك.
                </p>

                <button
                  onClick={() => navigate('/heart')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold"
                >
                  <Heart className="w-4 h-4" />
                  فتح صفحة القلب
                </button>
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
