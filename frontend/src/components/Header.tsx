import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/home': 'الرئيسية',
  '/lessons': 'دروس التجويد',
  '/reading': 'المصحف',
  '/stats': 'الإحصائيات',
  '/profile': 'حسابي',
  '/settings/notifications': 'الإشعارات',
  '/settings/sound': 'إعدادات الصوت',
  '/help': 'المساعدة',
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? 'نور القرآن';

  return (
    <header className="fixed top-0 w-full flex justify-between items-center px-6 h-16 rtl bg-surface/90 border-b border-outline-variant/20 backdrop-blur-md z-50" dir="rtl">
      <button className="text-outline hover:bg-surface-container-low rounded-full p-2 scale-95 transition-transform duration-200" aria-label="القائمة">
        <Menu className="w-6 h-6" />
      </button>
      <div className="text-center leading-none">
        <h1 className="font-headline text-xl text-primary font-bold">نور القرآن</h1>
        <p className="text-[10px] text-on-surface-variant font-label mt-1">{title}</p>
      </div>
      <button className="text-outline hover:bg-surface-container-low rounded-full p-2 scale-95 transition-transform duration-200" aria-label="الإشعارات">
        <Bell className="w-6 h-6" />
      </button>
    </header>
  );
}
