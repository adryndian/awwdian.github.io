'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  noPadding?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  hover = false, 
  onClick,
  noPadding = false 
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/10 backdrop-blur-xl',
        'border border-white/20',
        'shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
        !noPadding && 'p-4',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
