'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedTwoOptionToggle } from '@/components/ui/segmented-two-option-toggle';
import type { DashboardRevenueOperator } from '@/lib/dashboard';
import { formatDashboardCurrency } from '@/lib/dashboard';

const REVENUE_AMOUNT_DEBOUNCE_MS = 300;

type DashboardRevenueFilterProps = {
  operator: DashboardRevenueOperator | null;
  amount: number | null;
  disabled?: boolean;
  onChange: (operator: DashboardRevenueOperator | null, amount: number | null) => void;
};

function sanitizeRevenueAmountInput(value: string): string {
  return value.replace(/\D/g, '');
}

function parseRevenueAmountInput(value: string): number | null {
  const digits = sanitizeRevenueAmountInput(value);
  if (!digits) {
    return null;
  }

  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function formatRevenueAmountInput(amount: number | null): string {
  if (amount === null) {
    return '';
  }

  return String(Math.trunc(amount));
}

function displayOperator(operator: DashboardRevenueOperator | null): DashboardRevenueOperator {
  return operator ?? 'gt';
}

export function DashboardRevenueFilter({
  operator,
  amount,
  disabled = false,
  onChange,
}: DashboardRevenueFilterProps) {
  const activeOperator = displayOperator(operator);
  const [amountInput, setAmountInput] = useState(formatRevenueAmountInput(amount));
  const isEditingRef = useRef(false);
  const amountInputRef = useRef(amountInput);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  amountInputRef.current = amountInput;

  useEffect(() => {
    if (!isEditingRef.current) {
      setAmountInput(formatRevenueAmountInput(amount));
    }
  }, [amount]);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => clearDebounce, [clearDebounce]);

  const applyAmount = useCallback(
    (rawValue: string, nextOperator: DashboardRevenueOperator | null = operator) => {
      const parsed = parseRevenueAmountInput(rawValue);
      const appliedOperator = parsed === null ? null : displayOperator(nextOperator);
      const appliedAmount = parsed;

      if (appliedOperator === operator && appliedAmount === amount) {
        return;
      }

      onChange(appliedOperator, appliedAmount);

      if (!isEditingRef.current) {
        setAmountInput(formatRevenueAmountInput(parsed));
      }
    },
    [amount, onChange, operator]
  );

  const scheduleApply = useCallback(() => {
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      applyAmount(amountInputRef.current);
    }, REVENUE_AMOUNT_DEBOUNCE_MS);
  }, [applyAmount, clearDebounce]);

  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeRevenueAmountInput(value);
    setAmountInput(sanitized);
    scheduleApply();
  };

  const handleAmountFocus = () => {
    isEditingRef.current = true;
  };

  const handleAmountBlur = () => {
    isEditingRef.current = false;
  };

  const handleOperatorChange = (nextOperator: DashboardRevenueOperator) => {
    clearDebounce();
    const parsed = parseRevenueAmountInput(amountInputRef.current);
    const nextAmount = parsed ?? amount;

    if (displayOperator(operator) === nextOperator && nextAmount === amount) {
      return;
    }

    onChange(nextOperator, nextAmount);
  };

  const previewAmount = parseRevenueAmountInput(amountInput);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">CA HT</Label>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTwoOptionToggle
            value={activeOperator}
            onChange={handleOperatorChange}
            leftOption={{ value: 'gt', label: 'Supérieur à' }}
            rightOption={{ value: 'lt', label: 'Inférieur à' }}
            variant="plain"
            className="h-9 w-[13.5rem] shrink-0"
          />
          <div className="relative min-w-[7rem] flex-1">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amountInput}
              onChange={(event) => handleAmountChange(event.target.value)}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              disabled={disabled}
              placeholder="Montant"
              className="h-9 w-full pr-8 text-sm"
              aria-label="Montant du CA HT"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              €
            </span>
          </div>
        </div>
        {previewAmount !== null && previewAmount > 0 && (
          <p className="text-xs text-slate-500">
            {activeOperator === 'gt' ? 'Supérieur à' : 'Inférieur à'} :{' '}
            {formatDashboardCurrency(previewAmount)}
          </p>
        )}
      </div>
    </div>
  );
}
