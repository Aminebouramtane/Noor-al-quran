import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';

interface AudioSample {
  global_id: string;
  sheikh_name: string;
  new_file: string;
  audio_num: string;
  original_path?: string;
  new_path?: string;
  firebase_url?: string;
}

interface AudioPlayerProps {
  audioUrl?: string;
  audioSample?: AudioSample;
  title?: string;
  sheikh?: string;
  audioId?: string;
}

// Convert Google Drive path to a usable audio URL
function getAudioUrlFromSample(sample: AudioSample): string {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  if (sample.firebase_url) {
    return sample.firebase_url;
  }
  
  // Try local path first
  if (sample.new_path && !sample.new_path.includes('/content/drive')) {
    return `${API_BASE_URL}/api/audio/${sample.global_id}`;
  }
  
  // For Google Drive paths, we need to convert them to a shareable link
  // If the path contains Google Drive info, generate a direct download URL
  if (sample.original_path && sample.original_path.includes('/drive/')) {
    // For now, return the API endpoint which will redirect or provide the path
    return `${API_BASE_URL}/api/audio/${sample.global_id}`;
  }
  
  return `${API_BASE_URL}/api/audio/${sample.global_id}`;
}

export default function AudioPlayer({ audioUrl, audioSample, title, sheikh, audioId }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState('');
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const finalAudioUrl = useMemo(() => {
    if (audioSample) return getAudioUrlFromSample(audioSample);
    return audioUrl || '';
  }, [audioSample, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError('خطأ في تحميل الملف الصوتي');
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm">
      <audio ref={audioRef} src={finalAudioUrl} crossOrigin="anonymous" />

      {title && (
        <div className="mb-4">
          <h3 className="font-headline font-bold text-on-surface">{title}</h3>
          {sheikh && <p className="text-sm text-on-surface-variant">الشيخ: {sheikh}</p>}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error/20 text-error rounded-lg text-sm">{error}</div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleProgressChange}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-on-surface-variant mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-on-surface-variant" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 accent-primary"
            />
          </div>
        </div>

        {audioId && (
          <a
            href={finalAudioUrl}
            download={`${audioId}.wav`}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-outline"
          >
            <Download className="w-5 h-5" />
          </a>
        )}
      </div>
    </div>
  );
}
