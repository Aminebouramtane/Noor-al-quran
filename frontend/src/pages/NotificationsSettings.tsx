import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Moon, BookMarked, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

type NotificationSettingsState = {
  dailyReminder: boolean;
  lessonReminder: boolean;
  achievementAlerts: boolean;
  nightMode: boolean;
};

const NOTIFICATION_SETTINGS_KEY = 'noor:notificationSettings';

const loadSettings = (): NotificationSettingsState => {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) {
      return {
        dailyReminder: true,
        lessonReminder: true,
        achievementAlerts: false,
        nightMode: false,
      };
    }

    return {
      dailyReminder: true,
      lessonReminder: true,
      achievementAlerts: false,
      nightMode: false,
      ...JSON.parse(raw),
    } as NotificationSettingsState;
  } catch {
    return {
      dailyReminder: true,
      lessonReminder: true,
      achievementAlerts: false,
      nightMode: false,
    };
  }
};

const saveSettings = (settings: NotificationSettingsState) => {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
};

function Switch({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
      aria-pressed={enabled}
    >
      <span
        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'right-1' : 'right-6'}`}
      />
    </button>
  );
}

export default function NotificationsSettings() {
  const navigate = useNavigate();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [lessonReminder, setLessonReminder] = useState(true);
  const [achievementAlerts, setAchievementAlerts] = useState(false);
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    const next = loadSettings();
    setDailyReminder(next.dailyReminder);
    setLessonReminder(next.lessonReminder);
    setAchievementAlerts(next.achievementAlerts);
    setNightMode(next.nightMode);
  }, []);

  useEffect(() => {
    saveSettings({ dailyReminder, lessonReminder, achievementAlerts, nightMode });
  }, [dailyReminder, lessonReminder, achievementAlerts, nightMode]);

  const sendTestNotification = async () => {
    if (!('Notification' in window)) {
      window.alert('المتصفح لا يدعم الإشعارات');
      return;
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;

    if (permission !== 'granted') {
      window.alert('يرجى السماح بالإشعارات من المتصفح أولاً');
      return;
    }

    new Notification('نور القرآن', {
      body: 'هذا إشعار تجريبي من إعدادات الإشعارات.',
      icon: '/favicon.ico',
    });
  };

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
          <h2 className="text-3xl font-headline font-bold text-on-surface mb-2">الإشعارات</h2>
          <p className="text-on-surface-variant">تحكم في تذكيرات القراءة والتنبيهات اليومية.</p>
        </section>

        <section className="space-y-3">
          {[
            {
              title: 'تذكير القراءة اليومي',
              subtitle: 'تنبيه يومي لموعد وردك القرآني',
              icon: Bell,
              value: dailyReminder,
              setValue: setDailyReminder,
            },
            {
              title: 'تذكير الدروس',
              subtitle: 'تنبيه لمراجعة دروس التجويد',
              icon: BookMarked,
              value: lessonReminder,
              setValue: setLessonReminder,
            },
            {
              title: 'تنبيهات الإنجازات',
              subtitle: 'إشعار عند تحقيق هدف جديد',
              icon: Trophy,
              value: achievementAlerts,
              setValue: setAchievementAlerts,
            },
            {
              title: 'الوضع الليلي للإشعارات',
              subtitle: 'تقليل الإشعارات خلال الليل',
              icon: Moon,
              value: nightMode,
              setValue: setNightMode,
            },
          ].map((item) => (
            <div key={item.title} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-on-surface-variant">{item.subtitle}</p>
                </div>
              </div>
              <Switch enabled={item.value} onChange={item.setValue} />
            </div>
          ))}
        </section>

        <section className="mt-8 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20">
          <p className="font-semibold mb-2">اختبار الإشعار</p>
          <p className="text-sm text-on-surface-variant mb-4">اضغط الزر للتأكد أن الإشعارات تعمل على هذا الجهاز.</p>
          <button
            onClick={sendTestNotification}
            className="px-5 py-3 rounded-full bg-primary text-white font-medium active:scale-95 transition-transform"
          >
            إرسال إشعار تجريبي
          </button>
        </section>
      </main>
    </div>
  );
}
