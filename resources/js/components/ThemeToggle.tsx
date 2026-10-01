import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = true }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useAppearance();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
      className={`group relative flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-2xl border transition-all duration-300 shadow-xs select-none cursor-pointer ${
        isDark
          ? 'bg-[#2A221C] hover:bg-[#352B23] border-[#3E3228] text-amber-200 hover:border-amber-400/40'
          : 'bg-white hover:bg-[#FAF7F2] border-amber-100/80 text-[#6F4E37] hover:border-amber-200'
      } ${className}`}
    >
      {/* Icon with smooth flip & scale animation */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-amber-400/20 text-amber-300' : 'bg-[#8B5E3C]/10 text-[#8B5E3C]'
      }`}>
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="w-4 h-4 text-amber-400" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="w-4 h-4 text-[#8B5E3C]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode Label */}
      {showLabel && (
        <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
            Tema
          </span>
          <span className="text-xs font-bold transition-colors">
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </span>
        </div>
      )}
    </motion.button>
  );
}
