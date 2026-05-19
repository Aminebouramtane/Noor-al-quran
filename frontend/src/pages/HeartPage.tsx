import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Heart, Mic, MicOff, RefreshCcw } from 'lucide-react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../lib/api';
import quranHeartRaw from '../assets/quran-heart.svg?raw';
import { useAuth } from '../contexts/AuthContext';
import {
  loadHeartProgress,
  loadLastReading,
  saveHeartProgress,
  saveLastReading,
  type HeartSurahProgress,
} from '../lib/readingProgress';

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

type SurahCompletion = HeartSurahProgress;

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

const COMPLETION_CHANGED_EVENT = 'noor:surahCompletionsChanged';
const MIN_AUTO_MATCH_SCORE = 0.35;
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

const normalizeSurahName = (value: string) => normalizeArabic(value).replace(/\s+/g, '');

const getProgressFill = (progressPercent: number) => {
  if (progressPercent <= 0) return '#ffffff';
  if (progressPercent >= 100) return '#0f7a2d';

  const lightness = Math.max(34, 96 - progressPercent * 0.5);
  return `hsl(136 52% ${lightness}%)`;
};

export default function HeartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { surahNo } = useParams<{ surahNo?: string }>();

  const heartSvgRef = useRef<HTMLDivElement>(null);
  const recitationRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const keepListeningRef = useRef(false);
  const transcriptRef = useRef('');
  const transcriptHandledRef = useRef('');
  const silenceTimerRef = useRef<number | null>(null);

  const [surahs, setSurahs] = useState<SurahSummary[]>([]);
  const [completions, setCompletions] = useState<Record<string, SurahCompletion>>({});
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
  const [autoTilawaEnabled, setAutoTilawaEnabled] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [nlpHint, setNlpHint] = useState('');
  const [ayahMistakeDetails, setAyahMistakeDetails] = useState<AyahMistakeDetail[]>([]);
  const [validationFlash, setValidationFlash] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (!validationFlash) return;

    const timer = window.setTimeout(() => {
      setValidationFlash(null);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [validationFlash]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  useEffect(() => {
    setCompletions(loadHeartProgress(user?.uid) as Record<string, SurahCompletion>);

    const onStorage = () => {
      setCompletions(loadHeartProgress(user?.uid) as Record<string, SurahCompletion>);
    };

    const onCompletionChanged = () => {
      setCompletions(loadHeartProgress(user?.uid) as Record<string, SurahCompletion>);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(COMPLETION_CHANGED_EVENT, onCompletionChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(COMPLETION_CHANGED_EVENT, onCompletionChanged);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!surahNo) return;
    const parsed = Number(surahNo);
    if (!Number.isNaN(parsed)) {
      setSelectedSurahNo(parsed);
    }
  }, [surahNo]);

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

        if (nextSurahs.length) {
          const storedReading = loadLastReading(user?.uid);
          setSelectedSurahNo((current) => current ?? storedReading?.surahNo ?? nextSurahs[0].surah_no);
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
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedSurahNo) return;

    let cancelled = false;

    const loadSurah = async () => {
      try {
        setLoading(true);
        setError('');
        const detail = (await api.getQuranSurah(selectedSurahNo)) as QuranSurah;
        if (cancelled) return;

        const storedProgress = loadHeartProgress(user?.uid);
        const resumeAyah = storedProgress[String(detail.surah_no)]?.lastAyahNo || 1;

        setSurah(detail);
        setActiveAyahNo(Math.max(1, Math.min(resumeAyah, detail.ayahs.length)));
        setRecognizedText('');
        setTotalMistakes(0);
        setModelMatches([]);
        setAutoTilawaEnabled(false);
        setSessionFinished(false);
        setNlpHint('');
        setAyahMistakeDetails([]);
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
  }, [selectedSurahNo, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !surah) return;

    const safeAyahNo = Math.max(1, Math.min(activeAyahNo, surah.ayahs.length));
    const progressPercent = Math.round((safeAyahNo / surah.ayahs.length) * 100);
    const nextProgress: SurahCompletion = {
      surahNo: surah.surah_no,
      surahNameAr: surah.surah_name_ar,
      lastAyahNo: safeAyahNo,
      totalAyahs: surah.ayahs.length,
      progressPercent,
      mistakes: totalMistakes,
      updatedAt: new Date().toISOString(),
      completedAt: progressPercent >= 100 ? new Date().toISOString() : undefined,
    };

    setCompletions((prev) => {
      const next = {
        ...prev,
        [String(surah.surah_no)]: nextProgress,
      };
      saveHeartProgress(user.uid, next);
      window.dispatchEvent(new Event(COMPLETION_CHANGED_EVENT));
      return next;
    });

    saveLastReading(user.uid, {
      surahNo: surah.surah_no,
      surahNameAr: surah.surah_name_ar,
      ayahNo: safeAyahNo,
    });
  }, [activeAyahNo, surah, totalMistakes, user?.uid]);

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
    };
  }, [recognizedText, comparisonTargetText]);

  const completionItems = useMemo(() => Object.values(completions), [completions]);

  const progressByName = useMemo(() => {
    const next = new Map<string, SurahCompletion>();
    completionItems.forEach((entry) => {
      next.set(normalizeSurahName(entry.surahNameAr), entry);
    });
    return next;
  }, [completionItems]);

  const heartSvgMarkup = useMemo(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(quranHeartRaw, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return quranHeartRaw;

      svg.setAttribute('style', 'display:block; width:100%; height:auto; max-height:620px; direction:ltr;');
      svg.setAttribute('direction', 'ltr');

      const styleTag = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleTag.textContent = `
        .surah-name {
          font-size: 9px;
          font-weight: 700;
          font-family: Tajawal, Arial, sans-serif;
          direction: ltr;
          unicode-bidi: isolate;
          pointer-events: none;
        }
      `;
      svg.prepend(styleTag);

      const groups = doc.querySelectorAll('.surah-group');
      groups.forEach((group) => {
        const nameElement = group.querySelector('.surah-name');
        const pathElements = group.querySelectorAll('.surah-path');
        const name = normalizeSurahName(nameElement?.textContent || '');
        const progress = progressByName.get(name);
        const progressPercent = progress?.progressPercent || 0;

        group.setAttribute('data-surah-name', name);

        pathElements.forEach((pathElement) => {
          pathElement.setAttribute('fill', getProgressFill(progressPercent));
          pathElement.setAttribute('stroke', '#c9ced6');
          pathElement.setAttribute('stroke-width', '0.6');
          pathElement.setAttribute('cursor', 'pointer');
          pathElement.setAttribute('class', 'surah-path clickable-surah');
        });

        if (nameElement) {
          nameElement.setAttribute('fill', progressPercent >= 45 ? '#ffffff' : '#111827');
          nameElement.setAttribute('font-size', '9px');
          nameElement.setAttribute('font-weight', '700');
          nameElement.setAttribute('font-family', 'Tajawal, Arial, sans-serif');
        }

        (group as SVGGElement).style.cursor = 'pointer';
      });

      return svg.outerHTML;
    } catch {
      return quranHeartRaw;
    }
  }, [progressByName]);

  const selectSurah = (surahNumber: number) => {
    setSelectedSurahNo(surahNumber);
    setNlpHint('تم اختيار السورة. افتح الميكروفون وابدأ التلاوة من أول آية.');
    recitationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (!target || !heartSvgRef.current) return;

    const group = target.closest('.surah-group');
    if (!group || !heartSvgRef.current.contains(group)) return;

    const nameElement = group.querySelector('.surah-name');
    const normalizedName = normalizeSurahName((nameElement?.textContent || '').trim());
    if (!normalizedName) return;

    const matched = surahs.find((item) => normalizeSurahName(item.surah_name_ar) === normalizedName);
    if (!matched) return;

    selectSurah(matched.surah_no);
  };

  const completeSurahIfQualified = async (mistakesAfterFinish: number) => {
    if (!surah) return;
    if (mistakesAfterFinish >= 10) return;

    const nextCompletions = {
      ...completions,
      [surah.surah_no]: {
        surahNo: surah.surah_no,
        surahNameAr: surah.surah_name_ar,
        lastAyahNo: surah.ayahs.length,
        totalAyahs: surah.ayahs.length,
        progressPercent: 100,
        mistakes: mistakesAfterFinish,
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    };

    setCompletions(nextCompletions);
    saveHeartProgress(user?.uid, nextCompletions as Record<string, HeartSurahProgress>);
    window.dispatchEvent(new Event(COMPLETION_CHANGED_EVENT));
  };

  const flashValidation = (isCorrect: boolean) => {
    setValidationFlash(isCorrect ? 'success' : 'error');
  };

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

  const recordAyahAttempt = (spokenText: string, mistakes: number) => {
    if (!surah || !currentAyah) return;

    const nextTotalMistakes = totalMistakes + mistakes;

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

    return nextTotalMistakes;
  };

  const advanceAyah = async (spokenText: string, mistakes: number) => {
    if (!surah || !currentAyah) return;

    const nextTotalMistakes = recordAyahAttempt(spokenText, mistakes);
    const isLastAyah = activeAyahNo >= surah.ayahs.length;

    if (isLastAyah) {
      await completeSurahIfQualified(nextTotalMistakes);
      setSessionFinished(true);
      setAutoTilawaEnabled(false);
      setError('');
      setNlpHint(
        nextTotalMistakes < 10
          ? 'تمت تلاوة السورة كاملة وحُفظت كـ مكتملة في قلب السور.'
          : 'تمت تلاوة السورة كاملة، لكن الأخطاء 10 أو أكثر لذلك لم تتحول إلى اللون الأخضر بعد.'
      );
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
      return;
    }

    const mistakes = calculateMistakes(currentAyah.ayah_ar, transcript);
    if (mistakes > 0) {
      recordAyahAttempt(transcript, mistakes);
      setNlpHint('الآية غير صحيحة، ابقَ على نفس الآية وأعدها بشكل صحيح.');
      return;
    }

    await advanceAyah(transcript, mistakes);
  };

  const finalizeTranscript = async (transcript: string) => {
    if (!surah || !transcript.trim() || sessionFinished) return;

    transcriptHandledRef.current = transcript.trim();
    clearSilenceTimer();

    if (await completeFromTranscriptIfWholeSurah(transcript)) {
      flashValidation(true);
      return;
    }

    const mistakes = calculateMistakes(currentAyah?.ayah_ar || '', transcript);

    if (autoTilawaEnabled && currentAyah) {
      const matches = await analyzeRecitationWithModel(transcript);
      flashValidation(mistakes === 0);
      if (mistakes > 0) {
        recordAyahAttempt(transcript, mistakes);
        setNlpHint('الآية غير صحيحة، أعدها من نفس الموضع.');
        return;
      }
      await handleAutoTilawaProgress(transcript, matches);
      return;
    }

    if (currentAyah) {
      flashValidation(mistakes === 0);
      if (mistakes > 0) {
        recordAyahAttempt(transcript, mistakes);
        setError('الآية غير صحيحة، أعدها مرة أخرى من نفس الموضع.');
        return;
      }
      await advanceAyah(transcript, mistakes);
    }
  };

  const startListening = () => {
    setError('');
    keepListeningRef.current = true;

    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

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
      transcriptHandledRef.current = '';

      clearSilenceTimer();

      if (transcript) {
        silenceTimerRef.current = window.setTimeout(() => {
          void finalizeTranscript(transcriptRef.current.trim());
        }, 4000);
      }
    };

    recognition.onerror = () => {
      setError('حدث خطأ أثناء التقاط الصوت. تأكد من السماح بالميكروفون.');
      setIsListening(false);
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsListening(false);
      const finalTranscript = transcriptRef.current.trim();
      recognitionRef.current = null;
      if (finalTranscript && transcriptHandledRef.current !== finalTranscript) {
        void finalizeTranscript(finalTranscript);
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
    clearSilenceTimer();
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const confirmAyah = async () => {
    if (!surah || !currentAyah) return;
    if (!recognizedText.trim()) {
      setError('اقرأ الآية أولاً ثم اضغط "تأكيد الآية".');
      return;
    }

    await finalizeTranscript(recognizedText);
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
    clearSilenceTimer();
    transcriptHandledRef.current = '';
    setActiveAyahNo(1);
    setRecognizedText('');
    setTotalMistakes(0);
    setModelMatches([]);
    setAutoTilawaEnabled(false);
    setSessionFinished(false);
    setNlpHint('');
    setAyahMistakeDetails([]);
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

        <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-headline font-bold">قلب السور المكتملة</h1>
            </div>
            <button
              onClick={() => recitationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-bold"
            >
              <Mic className="w-4 h-4" />
              ابدأ التلاوة من هنا
            </button>
          </div>

          <p className="text-sm text-on-surface-variant mb-4">
            السور المكتملة بأقل من 10 أخطاء تظهر باللون الأخضر. اضغط أي سورة داخل القلب ثم افتح الميكروفون لتبدأ التلاوة من هذا الصفحة نفسها.
          </p>

          {loading && <div className="text-on-surface-variant text-sm">جاري تحميل السور...</div>}
          {error && <div className="rounded-xl bg-error/15 text-error p-3 text-sm">{error}</div>}

          <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/60 overflow-auto">
            <div
              ref={heartSvgRef}
              onClick={handleHeartClick}
              dangerouslySetInnerHTML={{ __html: heartSvgMarkup }}
              className="w-full min-w-[320px]"
            />
          </div>
        </section>

        <section ref={recitationRef} className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-headline font-bold">تلاوة القلب</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                اختر سورة من القلب أو من القائمة، ثم افتح الميكروفون وابدأ القراءة.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-on-surface-variant">السورة</label>
              <select
                value={selectedSurahNo || ''}
                onChange={(e) => selectSurah(Number(e.target.value))}
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

          {surah && currentAyah && (
            <div className="space-y-4">
              <div
                className={`rounded-2xl border p-4 transition-colors duration-300 ${
                  validationFlash === 'success'
                    ? 'bg-emerald-50 border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]'
                    : validationFlash === 'error'
                      ? 'bg-rose-50 border-rose-400 shadow-[0_0_0_1px_rgba(244,63,94,0.18)]'
                      : 'border-outline-variant/15 bg-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-headline text-lg font-bold">سورة {surah.surah_name_ar}</h3>
                  <span className="text-sm text-on-surface-variant">
                    الآية {arabicNumber(activeAyahNo)} / {arabicNumber(surah.ayahs.length)}
                  </span>
                </div>
                <p className="font-quran text-2xl leading-[2.1]">{isFullSurahTranscript ? comparisonTargetText : currentAyah.ayah_ar}</p>
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
                  <p className="text-on-surface-variant">هنا يظهر النص بعد القراءة</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/10">
                  كلمات مقروءة: {arabicNumber(comparison.spokenWordsCount)}
                </div>
                <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/10">
                  أخطاء السورة: {arabicNumber(totalMistakes)}
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">افتح الميكروفون واقرأ، وسيعرض النموذج أقرب آية تلقائياً.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
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
                      if (isListening) stopListening();
                      setNlpHint('تم إيقاف وضع التلاوة التلقائي.');
                      return;
                    }

                    setAutoTilawaEnabled(true);
                    setSessionFinished(false);
                    setNlpHint('وضع التلاوة التلقائي مفعل: اقرأ كل آية وسيتم التقدم تلقائياً عبر NLP.');
                    if (!isListening) startListening();
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

              <div className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/10 text-sm">
                أخطاء السورة حتى الآن: <span className="font-bold">{arabicNumber(totalMistakes)}</span>
              </div>

              {nlpHint && (
                <div className="rounded-xl bg-secondary-container/30 border border-secondary/20 p-3 text-sm text-on-surface">
                  {nlpHint}
                </div>
              )}

              {successState && (
                <div className={`rounded-2xl p-4 text-sm ${totalMistakes < 10 ? 'bg-primary/15 text-primary' : 'bg-error/15 text-error'}`}>
                  {totalMistakes < 10
                    ? 'أحسنت! أكملت السورة بأقل من 10 أخطاء، وتم تلوينها داخل القلب.'
                    : 'تم إكمال السورة، لكن عدد الأخطاء 10 أو أكثر، لذلك لم تُحتسب في القلب بعد.'}
                </div>
              )}

              {successState && totalMistakes >= 10 && ayahMistakeDetails.length > 0 && (
                <div className="rounded-2xl p-4 bg-error/10 border border-error/30 text-sm">
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
            </div>
          )}
        </section>

        <section className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6">
          <h2 className="text-lg font-headline font-bold mb-3">السور الملوّنة</h2>
          {completionItems.filter((item) => item.progressPercent > 0).length ? (
            <ul className="space-y-2 text-sm">
              {completionItems
                .filter((item) => item.progressPercent > 0)
                .sort((a, b) => a.surahNo - b.surahNo)
                .map((item) => (
                  <li
                    key={item.surahNo}
                    className="flex items-center justify-between rounded-xl bg-surface-container-low p-3 border border-outline-variant/10"
                  >
                    <div className="flex items-center gap-3">
                      <span>{item.surahNameAr}</span>
                      <span className="text-xs text-on-surface-variant">
                        {arabicNumber(item.lastAyahNo)} / {arabicNumber(item.totalAyahs)}
                      </span>
                    </div>
                    <button
                      onClick={() => selectSurah(item.surahNo)}
                      className="text-primary font-semibold"
                    >
                      {item.progressPercent >= 100 ? 'إعادة التلاوة' : `متابعة ${item.progressPercent}%`}
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">لا توجد سور ملوّنة بعد.</p>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
