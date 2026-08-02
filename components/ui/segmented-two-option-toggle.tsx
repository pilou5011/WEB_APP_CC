'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SegmentedTwoOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTwoOptionToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  leftOption: SegmentedTwoOption<T>;
  rightOption: SegmentedTwoOption<T>;
  className?: string;
  /** `bordered` : encadré segmenté (défaut). `plain` : style léger sans bordure externe. */
  variant?: 'bordered' | 'plain';
};

export function SegmentedTwoOptionToggle<T extends string>({
  value,
  onChange,
  leftOption,
  rightOption,
  className,
  variant = 'bordered',
}: SegmentedTwoOptionToggleProps<T>) {
  const isLeftSelected = value === leftOption.value;
  const isRightSelected = value === rightOption.value;
  const isPlain = variant === 'plain';

  const leftSelectedClass = isPlain
    ? 'bg-slate-100 text-slate-900 font-semibold'
    : 'bg-green-100 text-green-700 hover:bg-green-100 font-bold ring-2 ring-inset ring-green-500';

  const rightSelectedClass = isPlain
    ? 'bg-slate-100 text-slate-900 font-semibold'
    : 'bg-[#E8EDF2] text-slate-700 hover:bg-[#E8EDF2] font-bold ring-2 ring-inset ring-slate-500';

  const unselectedClass = isPlain
    ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200';

  const focusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1';

  return (
    <div
      className={cn(
        'inline-flex',
        isPlain ? 'gap-0.5' : 'overflow-hidden rounded-md border border-slate-300',
        className
      )}
      role="group"
      aria-label={`${leftOption.label} ou ${rightOption.label}`}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onChange(leftOption.value)}
        aria-pressed={isLeftSelected}
        className={cn(
          'px-3 text-xs transition-colors',
          isPlain ? 'h-9 rounded-md' : 'h-8 rounded-none',
          focusClass,
          isLeftSelected ? leftSelectedClass : unselectedClass
        )}
      >
        {leftOption.label}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onChange(rightOption.value)}
        aria-pressed={isRightSelected}
        className={cn(
          'px-3 text-xs transition-colors',
          isPlain ? 'h-9 rounded-md' : 'h-8 rounded-none border-l border-slate-300',
          focusClass,
          isRightSelected ? rightSelectedClass : unselectedClass
        )}
      >
        {rightOption.label}
      </Button>
    </div>
  );
}
