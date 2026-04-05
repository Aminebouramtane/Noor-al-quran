import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative w-full h-screen bg-surface flex flex-col items-center justify-between py-20 px-8 overflow-hidden rtl" dir="rtl">
      {/* Subtle Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none" 
        style={{ 
          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBh7QffUrl_Q6ClyVew-qABOzmXxJ4dDKy7eQKd_grr5qD6nxrUkURGDiGymgUygUBTrfXhcgsDzP3p1MO4pZxFqRHH0aogbd4e2iaiap3XXrjYkU7O5FeTqhOtBhQVjN6kk68jdsIEmeSh0WNIAynzPAyKUBShFmAGQMjdBYqWnKwj7yGBEJ0txRBp5NabXH-hjMO1B-NnWFFOsBZL41y-QuItgdz7Xs3egEVxNxKTvj29zTeoOWd2_cnTJOydUL0QREG6HdvfiTWY')",
          backgroundSize: '400px'
        }}
      />
      
      {/* Background Atmospheric Accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-container/10 blur-[80px] rounded-full" />

      <div className="relative flex-1 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-40 h-40 mb-8 flex items-center justify-center"
        >
          <div className="absolute inset-0 border-2 border-secondary/20 rounded-full" />
          <div className="w-32 h-32 quran-gradient rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
            <BookOpen className="text-on-primary w-16 h-16" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="space-y-2"
        >
          <h1 className="font-headline text-5xl font-bold text-primary tracking-tight leading-relaxed">
            نور القرآن
          </h1>
          <p className="font-label text-secondary font-medium tracking-[0.2em] text-sm uppercase opacity-80">
            Noor Al-Quran
          </p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="relative w-full flex flex-col items-center gap-6"
      >
        <div className="w-12 h-1 bg-surface-container-high rounded-full overflow-hidden">
          <motion.div 
            animate={{ x: [-48, 48] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="w-1/3 h-full bg-secondary" 
          />
        </div>
        <p className="text-on-surface-variant font-body text-base font-light italic">
          رِحلةٌ نَحوَ النُّورِ وَالهُدَى
        </p>
        <div className="pt-4 flex items-center gap-2 opacity-40">
          <div className="text-[10px] font-label uppercase tracking-widest flex items-center gap-2">
            <span>✦</span>
            <span>Premium Digital Manuscript</span>
            <span>✦</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
