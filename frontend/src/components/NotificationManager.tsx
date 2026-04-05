import { useEffect } from 'react';

const NOTIFICATION_SETTINGS_KEY = 'noor:notificationSettings';
const SURAH_COMPLETIONS_KEY = 'noor:surahCompletions';
const NOTIFICATION_STATE_KEY = 'noor:notificationState';

type NotificationSettingsState = {
  dailyReminder: boolean;
  lessonReminder: boolean;
  achievementAlerts: boolean;
  nightMode: boolean;
};

type NotificationState = {
  lastDailyReminderDate?: string;
  lastLessonReminderDate?: string;
  lastAchievementCount?: number;
};

const defaultSettings: NotificationSettingsState = {
  dailyReminder: true,
  lessonReminder: true,
  achievementAlerts: false,
  nightMode: false,
};

const loadSettings = (): NotificationSettingsState => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<NotificationSettingsState>) };
  } catch {
    return defaultSettings;
  }
};

const loadState = (): NotificationState => {
  try {
    return (JSON.parse(localStorage.getItem(NOTIFICATION_STATE_KEY) || '{}') as NotificationState) || {};
  } catch {
    return {};
  }
};

const saveState = (state: NotificationState) => {
  localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);
const getCurrentHour = () => new Date().getHours();

const getCompletionCount = () => {
  try {
    const raw = localStorage.getItem(SURAH_COMPLETIONS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.keys(parsed).length;
  } catch {
    return 0;
  }
};

const canNotifyNow = (nightMode: boolean) => {
  if (!nightMode) return true;
  const hour = getCurrentHour();
  return hour >= 6 && hour < 22;
};

const notify = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  new Notification(title, {
    body,
    icon: '/favicon.ico',
  });
};

export default function NotificationManager() {
  useEffect(() => {
    if (!('Notification' in window)) return;

    const evaluate = () => {
      const settings = loadSettings();
      const state = loadState();
      const todayKey = getTodayKey();

      if (!canNotifyNow(settings.nightMode)) return;

      if (settings.dailyReminder && state.lastDailyReminderDate !== todayKey) {
        const hour = getCurrentHour();
        if (hour >= 6 && hour <= 22) {
          notify('تذكير القراءة اليومي', 'حان وقت وردك القرآني اليوم. افتح المصحف وابدأ التلاوة.');
          state.lastDailyReminderDate = todayKey;
        }
      }

      if (settings.lessonReminder && state.lastLessonReminderDate !== todayKey) {
        const hour = getCurrentHour();
        if (hour >= 9 && hour <= 21) {
          notify('تذكير الدروس', 'راجع درسًا من دروس التجويد اليوم لتثبيت ما تعلمته.');
          state.lastLessonReminderDate = todayKey;
        }
      }

      if (settings.achievementAlerts) {
        const completionCount = getCompletionCount();
        if (completionCount > 0 && completionCount !== state.lastAchievementCount) {
          notify('تنبيهات الإنجازات', 'أحسنت! لقد حققت إنجازًا جديدًا في حفظ السور.');
          state.lastAchievementCount = completionCount;
        }
      }

      saveState(state);
    };

    evaluate();
    const timer = window.setInterval(evaluate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
