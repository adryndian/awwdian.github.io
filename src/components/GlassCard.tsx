'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/10 backdrop-blur-xl',
        'border border-white/20',
        'shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
        'before:absolute before:inset-0',
        'before:bg-gradient-to-br before:from-white/10 before:to-transparent',
        'before:pointer-events-none',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
