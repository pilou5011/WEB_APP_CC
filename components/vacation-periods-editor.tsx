'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

export interface VacationPeriod {
  id: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
}

interface VacationPeriodsEditorProps {
  value: VacationPeriod[];
  onChange: (value: VacationPeriod[]) => void;
}

export function VacationPeriodsEditor({ value, onChange }: VacationPeriodsEditorProps) {
  const handleAddPeriod = () => {
    const newPeriod: VacationPeriod = {
      id: `period-${Date.now()}`,
      startDate: '',
      endDate: '',
      isRecurring: false
    };
    onChange([...value, newPeriod]);
  };

  const handleRemovePeriod = (id: string) => {
    onChange(value.filter(period => period.id !== id));
  };

  const handleUpdatePeriod = (id: string, field: keyof VacationPeriod, fieldValue: string | boolean) => {
    onChange(
      value.map(period =>
        period.id === id ? { ...period, [field]: fieldValue } : period
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Périodes de vacances</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPeriod}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une période
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Aucune période de vacances ajoutée</p>
      ) : (
        <div className="space-y-3">
          {value.map((period, index) => (
            <div key={period.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-slate-700">Période {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePeriod(period.id)}
                  className="h-8 w-8 p-0 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-600">Date de début</Label>
                    <Input
                      type="date"
                      value={period.startDate}
                      onChange={(e) => handleUpdatePeriod(period.id, 'startDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <span className="text-sm mt-6">au</span>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-600">Date de fin</Label>
                    <Input
                      type="date"
                      value={period.endDate}
                      onChange={(e) => handleUpdatePeriod(period.id, 'endDate', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`recurring-${period.id}`}
                    checked={period.isRecurring}
                    onCheckedChange={(checked) =>
                      handleUpdatePeriod(period.id, 'isRecurring', checked === true)
                    }
                  />
                  <Label
                    htmlFor={`recurring-${period.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    Se répète chaque année
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function validateVacationPeriods(periods: VacationPeriod[]): { valid: boolean; message?: string } {
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    
    if (period.startDate && !period.endDate) {
      return { valid: false, message: `Date de fin manquante pour la période ${i + 1}` };
    }
    if (!period.startDate && period.endDate) {
      return { valid: false, message: `Date de début manquante pour la période ${i + 1}` };
    }
    if (period.startDate && period.endDate && period.startDate > period.endDate) {
      return { valid: false, message: `La date de fin doit être après la date de début pour la période ${i + 1}` };
    }
  }
  return { valid: true };
}

export function formatVacationPeriods(periods: VacationPeriod[]): string {
  if (periods.length === 0) return '';
  
  return periods
    .filter(p => p.startDate && p.endDate)
    .map(p => {
      const start = new Date(p.startDate).toLocaleDateString('fr-FR');
      const end = new Date(p.endDate).toLocaleDateString('fr-FR');
      const recurring = p.isRecurring ? ' (récurrent)' : '';
      return `${start} au ${end}${recurring}`;
    })
    .join(' | ');
}

