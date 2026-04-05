import React, { useState } from 'react';
import { ArrowRight, Volume2, VolumeX, Mic2, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function SoundSettings() {
  const navigate = useNavigate();
  const [volume, setVolume] = useState(80);
  const [micSensitivity, setMicSensitivity] = useState(65);
  const [readSpeed, setReadSpeed] = useState(1);
  const [muted, setMuted] = useState(false);

  return (
    <div className="bg-surface text-on-surface min-h-screen rtl" dir="rtl">
      <Header />

      <main className="pt-24 px-6 max-w-2xl mx-auto pb-10">
        <button
          onClick={() => navigate('/profile')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى الحساب</span>
        </button>

        <section className="mb-8">
          <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">إعدادات الصوت</h2>
          <p className="text-on-surface-variant">خصص جودة الصوت بما يناسب جلسات التلاوة والتدريب.</p>
        </section>

        <section className="space-y-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">صوت التلاوة</p>
                  <p className="text-xs text-on-surface-variant">{volume}%</p>
                </div>
              </div>
              <button
                onClick={() => setMuted((v) => !v)}
                className="text-on-surface-variant hover:text-primary transition-colors"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setMuted(false);
                setVolume(Number(e.target.value));
              }}
              className="w-full accent-primary"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Mic2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">حساسية الميكروفون</p>
                <p className="text-xs text-on-surface-variant">{micSensitivity}%</p>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={micSensitivity}
              onChange={(e) => setMicSensitivity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">سرعة التشغيل</p>
                <p className="text-xs text-on-surface-variant">{readSpeed.toFixed(2)}x</p>
              </div>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={readSpeed}
              onChange={(e) => setReadSpeed(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
