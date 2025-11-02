'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export interface MarketDaySchedule {
  day: string;
  timeRanges: { start: string; end: string }[];
}

export interface MarketDaysSchedule {
  Lundi: { start: string; end: string }[];
  Mardi: { start: string; end: string }[];
  Mercredi: { start: string; end: string }[];
  Jeudi: { start: string; end: string }[];
  Vendredi: { start: string; end: string }[];
  Samedi: { start: string; end: string }[];
  Dimanche: { start: string; end: string }[];
}

interface MarketDaysEditorProps {
  value: MarketDaysSchedule;
  onChange: (value: MarketDaysSchedule) => void;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

// Générer les options d'heures (00 à 23)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Options de minutes
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Composant pour sélectionner une heure avec deux listes déroulantes
interface TimeSelectorProps {
  value: string | undefined;
  onChange: (time: string) => void;
  label: string;
}

function TimeSelector({ value, onChange, label }: TimeSelectorProps) {
  const timeParts = value && value.includes(':') ? value.split(':') : ['', ''];
  const hour = timeParts[0] || '';
  const minute = timeParts[1] || '';
  
  const updateTime = (newHour?: string, newMinute?: string) => {
    const h = newHour !== undefined ? newHour : (hour || '00');
    const m = newMinute !== undefined ? newMinute : (minute || '00');
    onChange(`${h}:${m}`);
  };

  return (
    <div>
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="flex gap-1 mt-1">
        <Select
          value={hour || ''}
          onValueChange={(val) => updateTime(val, minute)}
        >
          <SelectTrigger className="w-16">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            {HOUR_OPTIONS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center text-slate-600">:</span>
        <Select
          value={minute || ''}
          onValueChange={(val) => updateTime(hour, val)}
        >
          <SelectTrigger className="w-16">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            {MINUTE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function getDefaultMarketDaysSchedule(): MarketDaysSchedule {
  return {
    Lundi: [],
    Mardi: [],
    Mercredi: [],
    Jeudi: [],
    Vendredi: [],
    Samedi: [],
    Dimanche: []
  };
}

export function formatMarketDaysScheduleData(schedule: MarketDaysSchedule): { day: string; hours: string }[] {
  return DAYS.map(day => {
    const ranges = schedule[day];
    if (!ranges || ranges.length === 0) {
      return { day, hours: 'Pas de marché' };
    }
    
    const hoursText = ranges.map(range => `${range.start} - ${range.end}`).join(', ');
    return { day, hours: hoursText };
  }).filter(item => item.hours !== 'Pas de marché'); // Ne montrer que les jours avec marché
}

export function validateMarketDaysSchedule(schedule: MarketDaysSchedule): { valid: boolean; message?: string } {
  for (const day of DAYS) {
    const ranges = schedule[day];
    for (const range of ranges) {
      if (range.start && !range.end) {
        return { valid: false, message: `Heure de fin manquante pour ${day}` };
      }
      if (!range.start && range.end) {
        return { valid: false, message: `Heure de début manquante pour ${day}` };
      }
      if (range.start && range.end && range.start >= range.end) {
        return { valid: false, message: `Heure de fin doit être après l'heure de début pour ${day}` };
      }
    }
  }
  return { valid: true };
}

export function MarketDaysEditor({ value, onChange }: MarketDaysEditorProps) {
  const [selectedDays, setSelectedDays] = useState<(keyof MarketDaysSchedule)[]>(
    DAYS.filter(day => value[day].length > 0)
  );

  const handleDayToggle = (day: keyof MarketDaysSchedule) => {
    if (selectedDays.includes(day)) {
      // Retirer le jour et ses horaires
      setSelectedDays(selectedDays.filter(d => d !== day));
      onChange({
        ...value,
        [day]: []
      });
    } else {
      // Ajouter le jour avec une plage horaire vide
      setSelectedDays([...selectedDays, day]);
      onChange({
        ...value,
        [day]: [{ start: '', end: '' }]
      });
    }
  };

  const handleAddTimeRange = (day: keyof MarketDaysSchedule) => {
    onChange({
      ...value,
      [day]: [...value[day], { start: '', end: '' }]
    });
  };

  const handleRemoveTimeRange = (day: keyof MarketDaysSchedule, index: number) => {
    const newRanges = value[day].filter((_, i) => i !== index);
    onChange({
      ...value,
      [day]: newRanges
    });
    
    // Si plus de plages horaires, retirer le jour de la sélection
    if (newRanges.length === 0) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    }
  };

  const handleTimeChange = (day: keyof MarketDaysSchedule, index: number, field: 'start' | 'end', timeValue: string) => {
    const newRanges = [...value[day]];
    newRanges[index] = { ...newRanges[index], [field]: timeValue };
    onChange({
      ...value,
      [day]: newRanges
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Sélectionnez les jours de marché</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <Button
              key={day}
              type="button"
              variant={selectedDays.includes(day) ? "default" : "outline"}
              size="sm"
              onClick={() => handleDayToggle(day)}
              className={selectedDays.includes(day) ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {day}
            </Button>
          ))}
        </div>
      </div>

      {selectedDays.length > 0 && (
        <div className="space-y-3 mt-4">
          <Label className="text-sm font-medium">Horaires par jour</Label>
          {selectedDays.map((day) => (
            <div key={day} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{day}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTimeRange(day)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter horaire
                </Button>
              </div>
              
              <div className="space-y-3">
                {value[day].map((range, index) => (
                  <div key={index} className="flex items-end gap-3 border border-slate-200 rounded p-2 bg-white">
                    <TimeSelector
                      value={range.start}
                      onChange={(val) => handleTimeChange(day, index, 'start', val)}
                      label="Début"
                    />
                    <TimeSelector
                      value={range.end}
                      onChange={(val) => handleTimeChange(day, index, 'end', val)}
                      label="Fin"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTimeRange(day, index)}
                      className="h-8 w-8 p-0 mb-0.5 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

