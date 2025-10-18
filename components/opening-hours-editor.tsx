'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export type DaySchedule = {
  isOpen: boolean;
  hasLunchBreak: boolean;
  morningOpen?: string;
  morningClose?: string;
  afternoonOpen?: string;
  afternoonClose?: string;
  openTime?: string;
  closeTime?: string;
};

export type WeekSchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

interface OpeningHoursEditorProps {
  value: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

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
  const [hour, minute] = (value || ':').split(':');
  
  const updateTime = (newHour?: string, newMinute?: string) => {
    const h = newHour || hour || '00';
    const m = newMinute || minute || '00';
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

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const updateDay = (dayKey: keyof WeekSchedule, updates: Partial<DaySchedule>) => {
    onChange({
      ...value,
      [dayKey]: { ...value[dayKey], ...updates }
    });
  };

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => {
        const dayKey = key as keyof WeekSchedule;
        const schedule = value[dayKey] || { isOpen: false, hasLunchBreak: false };

        return (
          <Card key={key} className="p-4 border-slate-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{label}</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${key}-open`} className="text-sm">
                    {schedule.isOpen ? 'Ouvert' : 'Fermé'}
                  </Label>
                  <Switch
                    id={`${key}-open`}
                    checked={schedule.isOpen || false}
                    onCheckedChange={(checked) => 
                      updateDay(dayKey, { 
                        isOpen: checked,
                        hasLunchBreak: false,
                        morningOpen: undefined,
                        morningClose: undefined,
                        afternoonOpen: undefined,
                        afternoonClose: undefined,
                        openTime: undefined,
                        closeTime: undefined
                      })
                    }
                  />
                </div>
              </div>

              {schedule.isOpen && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${key}-lunch`}
                      checked={schedule.hasLunchBreak || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateDay(dayKey, { 
                            hasLunchBreak: true,
                            openTime: undefined,
                            closeTime: undefined
                          });
                        } else {
                          updateDay(dayKey, { 
                            hasLunchBreak: false,
                            morningOpen: undefined,
                            morningClose: undefined,
                            afternoonOpen: undefined,
                            afternoonClose: undefined
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`${key}-lunch`} className="text-sm font-normal">
                      Fermeture le midi
                    </Label>
                  </div>

                  {schedule.hasLunchBreak ? (
                    <div className="grid grid-cols-2 gap-3">
                      <TimeSelector
                        value={schedule.morningOpen}
                        onChange={(val) => updateDay(dayKey, { morningOpen: val })}
                        label="Ouverture matin"
                      />

                      <TimeSelector
                        value={schedule.morningClose}
                        onChange={(val) => updateDay(dayKey, { morningClose: val })}
                        label="Fermeture matin"
                      />

                      <TimeSelector
                        value={schedule.afternoonOpen}
                        onChange={(val) => updateDay(dayKey, { afternoonOpen: val })}
                        label="Ouverture après-midi"
                      />

                      <TimeSelector
                        value={schedule.afternoonClose}
                        onChange={(val) => updateDay(dayKey, { afternoonClose: val })}
                        label="Fermeture après-midi"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <TimeSelector
                        value={schedule.openTime}
                        onChange={(val) => updateDay(dayKey, { openTime: val })}
                        label="Ouverture"
                      />

                      <TimeSelector
                        value={schedule.closeTime}
                        onChange={(val) => updateDay(dayKey, { closeTime: val })}
                        label="Fermeture"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// Helper pour formater les horaires pour l'affichage
export function formatWeekSchedule(schedule: any): string {
  if (!schedule) return 'Non renseigné';

  const lines: string[] = [];
  
  DAYS.forEach(({ key, label }) => {
    const day = schedule[key]; // Utiliser directement la clé string au lieu du type
    
    if (!day) {
      lines.push(`${label}: Non renseigné`);
      return;
    }
    
    if (day.isOpen === false || day.isOpen === undefined) {
      lines.push(`${label}: Fermé`);
      return;
    }
    
    if (day.isOpen === true) {
      if (day.hasLunchBreak === true) {
        const morningOpen = day.morningOpen || '--:--';
        const morningClose = day.morningClose || '--:--';
        const afternoonOpen = day.afternoonOpen || '--:--';
        const afternoonClose = day.afternoonClose || '--:--';
        lines.push(`${label}: ${morningOpen} - ${morningClose} / ${afternoonOpen} - ${afternoonClose}`);
      } else {
        const openTime = day.openTime || '--:--';
        const closeTime = day.closeTime || '--:--';
        lines.push(`${label}: ${openTime} - ${closeTime}`);
      }
    }
  });

  return lines.join('\n');
}

// Helper pour initialiser un horaire vide
export function getDefaultWeekSchedule(): WeekSchedule {
  const defaultDay: DaySchedule = {
    isOpen: false,
    hasLunchBreak: false
  };

  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
    sunday: { ...defaultDay }
  };
}

