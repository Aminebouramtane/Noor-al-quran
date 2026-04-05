import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mic, Loader, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import AudioPlayer from '../components/AudioPlayer';
import { api } from '../lib/api';

interface AnalysisResult {
  accuracy: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export default function RecordingPage() {
  const navigate = useNavigate();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAnalysis(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      setError('لا يمكن الوصول إلى الميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;

    try {
      setIsUploading(true);
      const file = new File([recordedBlob], 'recording.wav', { type: 'audio/wav' });
      const result = await api.uploadAudio(file);

      // Simulate analysis for now
      setAnalysis({
        accuracy: 85,
        feedback: 'تلاوة جيدة مع انتباه للأحكام',
        strengths: [
          'نطق صحيح للمخارج',
          'التزام بالمدود',
          'وضوح الصوت'
        ],
        improvements: [
          'اهتم بالتشديد في النون الساكنة',
          'مد الياء يحتاج لزيادة طفيفة'
        ]
      });
    } catch (err) {
      setError('فشل رفع الملف. حاول مرة أخرى.');
    } finally {
      setIsUploading(false);
    }
  };

  const recordedUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : '';
  const minutes = Math.floor(recordingTime / 60);
  const seconds = recordingTime % 60;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32 rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <section className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-on-surface mb-2">تسجيل التلاوة</h1>
          <p className="text-on-surface-variant text-lg">سجل تلاوتك واحصل على تقييم فوري</p>
        </section>

        {error && (
          <div className="mb-6 p-4 bg-error/20 text-error rounded-lg text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Recording Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-3xl p-8 mb-10 text-center"
        >
          <div className="mb-8">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-6 ${
              isRecording ? 'bg-error/20' : 'bg-primary/20'
            }`}>
              {isRecording && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-20 h-20 bg-error rounded-full"
                />
              )}
              {!isRecording && !recordedBlob && (
                <Mic className={`w-16 h-16 ${isRecording ? 'text-error' : 'text-primary'}`} />
              )}
              {recordedBlob && (
                <CheckCircle className="w-16 h-16 text-primary" />
              )}
            </div>

            {isRecording && (
              <div className="font-headline text-3xl font-bold text-error mb-2">
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-center">
            {!isRecording && !recordedBlob && (
              <button
                onClick={startRecording}
                className="px-8 py-4 bg-gradient-to-tr from-error to-error-container text-on-primary rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  ابدأ التسجيل
                </span>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-8 py-4 bg-surface-container-high text-on-surface rounded-full font-bold hover:scale-105 active:scale-95 transition-all"
              >
                إيقاف التسجيل
              </button>
            )}

            {recordedBlob && !isUploading && (
              <>
                <button
                  onClick={() => {
                    setRecordedBlob(null);
                    setAnalysis(null);
                  }}
                  className="px-8 py-4 bg-surface-container-high text-on-surface rounded-full font-bold hover:scale-105 active:scale-95 transition-all"
                >
                  تسجيل جديد
                </button>
                <button
                  onClick={handleUpload}
                  className="px-8 py-4 bg-gradient-to-tr from-primary to-primary-container text-on-primary rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <span className="flex items-center gap-2">
                    <Loader className={`w-5 h-5 ${isUploading ? 'animate-spin' : ''}`} />
                    تحليل التسجيل
                  </span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Playback */}
        {recordedBlob && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h3 className="text-lg font-headline font-bold mb-4">استمع لتسجيلك</h3>
            <AudioPlayer
              audioUrl={recordedUrl}
              title="تسجيلك"
              audioId="recording"
            />
          </motion.div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary-container/10 rounded-3xl p-8 border border-primary/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl font-headline font-bold text-primary">{analysis.accuracy}%</div>
                <div>
                  <h3 className="text-2xl font-headline font-bold text-on-surface">دقة ممتازة</h3>
                  <p className="text-on-surface-variant">{analysis.feedback}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-container-low rounded-2xl p-6">
                <h4 className="font-headline font-bold text-on-surface mb-4">نقاط قوة</h4>
                <ul className="space-y-2">
                  {analysis.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-6">
                <h4 className="font-headline font-bold text-on-surface mb-4">نقاط للتحسين</h4>
                <ul className="space-y-2">
                  {analysis.improvements.map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = recordedUrl;
                a.download = 'recording.wav';
                a.click();
              }}
              className="w-full bg-secondary-container text-on-secondary-container rounded-full py-3 font-bold flex items-center justify-center gap-2 hover:scale-[0.98] transition-transform"
            >
              <Download className="w-5 h-5" />
              تحميل التسجيل
            </button>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
