'use client';

import { Check, ChevronsUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DashboardFilterOption = {
  value: string;
  label: string;
};

type DashboardFilterMultiSelectProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: DashboardFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  formatLabel?: (value: string) => string;
  disabled?: boolean;
};

export function DashboardFilterMultiSelect({
  label,
  placeholder,
  searchPlaceholder,
  options,
  selectedValues,
  onChange,
  formatLabel,
  disabled = false,
}: DashboardFilterMultiSelectProps) {
  const display = (value: string) => formatLabel?.(value) ?? value;

  const triggerLabel =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? display(
            options.find((option) => option.value === selectedValues[0])?.label ??
              selectedValues[0]
          )
        : `${selectedValues.length} sélectionnés`;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span className="flex items-center gap-2 truncate">
              <Filter className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate text-sm">{triggerLabel}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-[min(16rem,50vh)] overflow-y-auto">
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => {
                        onChange(
                          isSelected
                            ? selectedValues.filter((value) => value !== option.value)
                            : [...selectedValues, option.value]
                        );
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
