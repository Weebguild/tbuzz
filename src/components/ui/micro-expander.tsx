'use client';

import * as React from 'react';
import {
  motion,
  type HTMLMotionProps,
  type Variants,
  AnimatePresence,
} from 'motion/react';
import { Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicroExpanderProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  text: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  isLoading?: boolean;
}

const MicroExpander = React.forwardRef<HTMLButtonElement, MicroExpanderProps>(
  (
    {
      text,
      icon,
      variant = 'default',
      isLoading = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const containerVariants: Variants = {
      initial: { width: '48px' },
      hover: { width: 'auto' },
      loading: { width: '48px' },
    };

    const textVariants: Variants = {
      initial: { opacity: 0, x: -10 },
      hover: {
        opacity: 1,
        x: 0,
        transition: { delay: 0.15, duration: 0.3, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        x: -5,
        transition: { duration: 0.1, ease: 'linear' },
      },
    };

    const variantStyles = {
      default: 'bg-primary text-primary-foreground border border-primary',
      outline:
        'bg-transparent border border-input text-foreground hover:border-primary',
      ghost:
        'bg-accent/50 border border-transparent text-accent-foreground hover:bg-accent',
      destructive:
        'bg-destructive text-destructive-foreground border border-destructive hover:bg-destructive/90',
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading) return;
      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative inline-flex h-12 cursor-pointer items-center justify-start gap-2 overflow-hidden rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          className
        )}
        variants={containerVariants}
        initial="initial"
        animate={isLoading ? 'loading' : isHovered ? 'hover' : 'initial'}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={handleClick}
        disabled={isLoading}
        {...props}
        aria-label={text}
      >
        <div className="flex h-full items-center justify-center">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ rotate: { repeat: Infinity, duration: 1, ease: 'linear' } }}
              >
                <Loader2 className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                {icon || <Plus className="h-5 w-5" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isHovered && !isLoading && (
            <motion.span
              key="text"
              variants={textVariants}
              initial="initial"
              animate="hover"
              exit="exit"
              className="pr-2"
            >
              {text}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

MicroExpander.displayName = 'MicroExpander';

export { MicroExpander };
