import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Mic2, Play } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import AudioPlayer from '../components/AudioPlayer';
import { api } from '../lib/api';

// Map English names back to Arabic for display
const ENGLISH_TO_ARABIC: Record<string, string> = {
  "Ikhfa": "أحكام النون الساكنة",
  "Idgham": "أحكام الميم الساكنة",
  "Izhar": "المدود",
  "Iqlab": "أحكام الإقلاب",
};

interface AudioSample {
  global_id: string;
  sheikh_name: string;
  new_file: string;
  audio_num: string;
  original_path?: string;
  new_path?: string;
  firebase_url?: string;
}

interface LessonAudioResponse {
  lesson_name: string;
  english_name: string;
  total_samples: number;
  all_samples_count: number;
  playable_samples_count: number;
  selected_sheikh?: string;
  sheikhs_all: string[];
  sheikhs_available: string[];
  samples: AudioSample[];
}

export default function LessonDetail() {
  const { lessonName } = useParams<{ lessonName: string }>();
  const navigate = useNavigate();
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [allSamplesCount, setAllSamplesCount] = useState(0);
  const [playableSamplesCount, setPlayableSamplesCount] = useState(0);
  const [availableSheikhs, setAvailableSheikhs] = useState<string[]>([]);
  const [selectedSheikh, setSelectedSheikh] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<AudioSample | null>(null);
  
  // Get Arabic name for display
  const arabicLessonName = lessonName ? (ENGLISH_TO_ARABIC[lessonName] || lessonName) : '';

  useEffect(() => {
    const loadLessonAudio = async () => {
      try {
        setLoading(true);
        if (!lessonName) throw new Error('Lesson not specified');
        const data: LessonAudioResponse = await api.getLessonAudio(lessonName, {
          availableOnly: true,
          sheikhName: selectedSheikh || undefined,
        });
        setAudioSamples(data.samples || []);
        setAllSamplesCount(data.all_samples_count || 0);
        setPlayableSamplesCount(data.playable_samples_count || 0);
        setAvailableSheikhs(data.sheikhs_available || []);
        setError('');
        if (data.samples && data.samples.length > 0) {
          setSelectedAudio(data.samples[0]);
        } else {
          setSelectedAudio(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    loadLessonAudio();
  }, [lessonName, selectedSheikh]);

  if (loading) {
    return (
      <div className="bg-surface text-on-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-on-surface">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/lessons')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى الدروس</span>
        </button>

        <section className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            <BookOpen className="w-4 h-4" />
            <span>{arabicLessonName}</span>
          </div>
          <h1 className="text-4xl font-headline font-bold text-on-surface mb-2">درس {arabicLessonName}</h1>
          <p className="text-on-surface-variant text-lg">استمع إلى أمثلة تطبيقية من الشيوخ المتخصصين</p>
          <p className="text-sm text-on-surface-variant mt-2">
            إجمالي العينات: {allSamplesCount} • القابل للتشغيل: {playableSamplesCount}
          </p>
        </section>

        <section className="mb-6">
          <label className="block text-sm text-on-surface-variant mb-2">اختر المقرئ</label>
          <select
            value={selectedSheikh}
            onChange={(e) => setSelectedSheikh(e.target.value)}
            className="w-full md:w-80 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface"
          >
            <option value="">كل المقرئين</option>
            {availableSheikhs.map((sheikh) => (
              <option key={sheikh} value={sheikh}>
                {sheikh}
              </option>
            ))}
          </select>
        </section>

        {error && (
          <div className="mb-6 p-4 bg-error/20 text-error rounded-lg text-sm">{error}</div>
        )}

        {/* Player */}
        {selectedAudio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <AudioPlayer
              audioSample={selectedAudio}
              title={`${arabicLessonName} - العينة ${selectedAudio.audio_num}`}
              sheikh={selectedAudio.sheikh_name}
            />
          </motion.div>
        )}

        {/* Audio Samples Grid */}
        <section className="mb-10">
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-4">
            العينات المتاحة {selectedSheikh ? `لـ ${selectedSheikh}` : ''} ({audioSamples.length})
          </h2>
          {audioSamples.length === 0 && (
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
              لا توجد عينات قابلة للتشغيل حالياً لهذا الدرس. سيتم إتاحتها بعد اكتمال مزامنة ملفات الصوت.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audioSamples.map((sample) => (
              <motion.button
                key={sample.global_id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedAudio(sample)}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  selectedAudio?.global_id === sample.global_id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Play className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">العينة {sample.audio_num}</p>
                    <p className="text-xs text-on-surface-variant truncate">{sample.sheikh_name}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Practice Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-tr from-primary to-primary-container rounded-3xl p-8 text-on-primary shadow-lg"
        >
          <h3 className="text-xl font-headline font-bold mb-2">جاهز للتدريب؟</h3>
          <p className="text-on-primary/80 mb-6">استمع للأمثلة ثم جرب تطبيق ما تعلمته</p>
          <button
            onClick={() => navigate('/recording')}
            className="bg-on-primary text-primary px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <Mic2 className="w-5 h-5" />
            <span>ابدأ التسجيل</span>
          </button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
