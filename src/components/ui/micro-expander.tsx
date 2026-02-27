import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicroExpanderProps {
  text: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

const variantStyles = {
  default: 'bg-primary text-primary-foreground border border-primary',
  outline: 'bg-transparent border border-input text-foreground hover:border-primary',
  ghost: 'bg-accent/50 border border-transparent text-accent-foreground hover:bg-accent',
  destructive: 'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90',
};

function MicroExpander({
  text,
  icon,
  variant = 'default',
  isLoading = false,
  className,
  onClick,
  disabled,
}: MicroExpanderProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);
  const showText = isHovered && !isLoading;

  return (
    <motion.button
      animate={{ scale: isPressed ? 0.88 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20, mass: 0.4 }}
      className={cn(
        'relative inline-flex h-10 min-w-[40px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-full text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        showText ? 'px-3 pr-4' : 'w-10 justify-center',
        variantStyles[variant],
        className,
      )}
      style={{ transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), padding 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s, border-color 0.15s, color 0.15s' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={(e) => {
        if (isLoading) return;
        onClick?.(e);
      }}
      disabled={isLoading || disabled}
      aria-label={text}
    >
      <span className="flex shrink-0 items-center justify-center">
        {isLoading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          icon || <Plus className="h-[18px] w-[18px]" />
        )}
      </span>

      <AnimatePresence>
        {showText && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden text-xs font-semibold"
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

MicroExpander.displayName = 'MicroExpander';

export { MicroExpander };
