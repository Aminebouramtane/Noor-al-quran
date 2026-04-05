const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  async getLessons(labelName?: string) {
    const params = labelName ? `?label_name=${labelName}` : '';
    const response = await fetch(`${API_BASE_URL}/api/lessons${params}`);
    if (!response.ok) throw new Error('Failed to fetch lessons');
    return response.json();
  },

  async getLessonAudio(
    labelName: string,
    options?: { availableOnly?: boolean; sheikhName?: string }
  ) {
    const params = new URLSearchParams();
    params.set('available_only', String(options?.availableOnly ?? true));
    if (options?.sheikhName) params.set('sheikh_name', options.sheikhName);
    const response = await fetch(`${API_BASE_URL}/api/lessons/${labelName}/audio?${params.toString()}`);
    if (!response.ok) throw new Error(`Failed to fetch audio for ${labelName}`);
    return response.json();
  },

  getAudioUrl(audioId: string) {
    return `${API_BASE_URL}/api/audio/${audioId}`;
  },

  async getMetadata() {
    const response = await fetch(`${API_BASE_URL}/api/metadata`);
    if (!response.ok) throw new Error('Failed to fetch metadata');
    return response.json();
  },

  async getSheikhs() {
    const response = await fetch(`${API_BASE_URL}/api/sheikhs`);
    if (!response.ok) throw new Error('Failed to fetch sheikhs');
    return response.json();
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/api/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },

  async getQuranSurahs() {
    const response = await fetch(`${API_BASE_URL}/api/quran/surahs`);
    if (!response.ok) throw new Error('Failed to fetch surahs');
    return response.json();
  },

  async getQuranSurah(surahNo: number) {
    const response = await fetch(`${API_BASE_URL}/api/quran/surah/${surahNo}`);
    if (!response.ok) throw new Error(`Failed to fetch surah ${surahNo}`);
    return response.json();
  },

  async uploadAudio(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to upload audio');
    return response.json();
  },

  async analyzeAudio(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to analyze audio');
    return response.json();
  },
};
