import React from 'react';
import { Home, School, BookOpen, BarChart2, User, Mic } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, path: '/home' },
  { id: 'lessons', label: 'التجويد', icon: School, path: '/lessons' },
  { id: 'quran', label: 'المصحف', icon: BookOpen, path: '/reading' },
  { id: 'nlp', label: 'التلاوة', icon: Mic, path: '/nlp-reading' },
  { id: 'stats', label: 'الإحصائيات', icon: BarChart2, path: '/stats' },
  { id: 'profile', label: 'حسابي', icon: User, path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-3 pb-8 px-4 rtl bg-surface/90 backdrop-blur-xl rounded-t-3xl border-t border-outline-variant/30 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]" dir="rtl">
      {navItems.map((item) => {
        const isActive =
          item.path === '/home'
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-300 active:scale-90",
              isActive ? "text-primary" : "text-outline hover:text-on-surface"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-1", isActive && "fill-current")} />
            <span className="font-sans text-[10px] font-medium">{item.label}</span>
            {isActive && <div className="w-1 h-1 bg-secondary rounded-full mt-1" />}
          </button>
        );
      })}
    </nav>
  );
}
