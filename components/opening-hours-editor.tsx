'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type DaySchedule = {
  isOpen: boolean;
  hasLunchBreak: boolean;
  morningOpen?: string;
  morningClose?: string;
  afternoonOpen?: string;
  afternoonClose?: string;
  openTime?: string;
  closeTime?: string;
  notSet?: boolean; // Indique que le jour n'est pas renseigné
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

type DayKey = keyof WeekSchedule;

type TimeSlot = {
  id: string;
  hasLunchBreak: boolean;
  morningOpen?: string;
  morningClose?: string;
  afternoonOpen?: string;
  afternoonClose?: string;
  openTime?: string;
  closeTime?: string;
  assignedDays: DayKey[];
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

// Convertir WeekSchedule en TimeSlots et jours fermés
function weekScheduleToTimeSlots(schedule: WeekSchedule): { timeSlots: TimeSlot[], closedDays: DayKey[] } {
  const timeSlots: TimeSlot[] = [];
  const closedDays: DayKey[] = [];
  const processedDays = new Set<DayKey>();

  DAYS.forEach(({ key }) => {
    const dayKey = key as DayKey;
    const day = schedule[dayKey];

    // Seulement ajouter aux jours fermés si explicitement fermé (pas notSet)
    if (!day?.isOpen && !day?.notSet) {
      closedDays.push(dayKey);
      processedDays.add(dayKey);
    }
    
    // Ignorer les jours "notSet" - ils ne seront assignés nulle part
    if (day?.notSet) {
      processedDays.add(dayKey);
    }
  });

  DAYS.forEach(({ key }) => {
    const dayKey = key as DayKey;
    if (processedDays.has(dayKey)) return;

    const day = schedule[dayKey];
    if (!day?.isOpen) return;

    // Chercher un slot existant avec les mêmes horaires
    const existingSlot = timeSlots.find(slot => 
      slot.hasLunchBreak === day.hasLunchBreak &&
      slot.morningOpen === day.morningOpen &&
      slot.morningClose === day.morningClose &&
      slot.afternoonOpen === day.afternoonOpen &&
      slot.afternoonClose === day.afternoonClose &&
      slot.openTime === day.openTime &&
      slot.closeTime === day.closeTime
    );

    if (existingSlot) {
      existingSlot.assignedDays.push(dayKey);
    } else {
      timeSlots.push({
        id: Math.random().toString(36).substr(2, 9),
        hasLunchBreak: day.hasLunchBreak,
        morningOpen: day.morningOpen,
        morningClose: day.morningClose,
        afternoonOpen: day.afternoonOpen,
        afternoonClose: day.afternoonClose,
        openTime: day.openTime,
        closeTime: day.closeTime,
        assignedDays: [dayKey]
      });
    }
    processedDays.add(dayKey);
  });

  return { timeSlots, closedDays };
}

// Convertir TimeSlots et jours fermés en WeekSchedule
function timeSlotsToWeekSchedule(timeSlots: TimeSlot[], closedDays: DayKey[]): WeekSchedule {
  const schedule = getDefaultWeekSchedule();
  
  // Collecter tous les jours assignés
  const assignedDays = new Set<DayKey>();
  
  closedDays.forEach(dayKey => {
    schedule[dayKey] = { isOpen: false, hasLunchBreak: false };
    assignedDays.add(dayKey);
  });

  timeSlots.forEach(slot => {
    slot.assignedDays.forEach(dayKey => {
      schedule[dayKey] = {
        isOpen: true,
        hasLunchBreak: slot.hasLunchBreak,
        morningOpen: slot.morningOpen,
        morningClose: slot.morningClose,
        afternoonOpen: slot.afternoonOpen,
        afternoonClose: slot.afternoonClose,
        openTime: slot.openTime,
        closeTime: slot.closeTime
      };
      assignedDays.add(dayKey);
    });
  });
  
  // Marquer les jours non assignés comme "non renseignés"
  DAYS.forEach(({ key }) => {
    const dayKey = key as DayKey;
    if (!assignedDays.has(dayKey)) {
      schedule[dayKey] = { isOpen: false, hasLunchBreak: false, notSet: true };
    }
  });

  return schedule;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [closedDays, setClosedDays] = useState<DayKey[]>([]);

  // Initialiser depuis value
  useEffect(() => {
    const { timeSlots: initialSlots, closedDays: initialClosed } = weekScheduleToTimeSlots(value);
    setTimeSlots(initialSlots);
    setClosedDays(initialClosed);
  }, []);

  // Mettre à jour value quand timeSlots ou closedDays changent
  const updateSchedule = (newTimeSlots: TimeSlot[], newClosedDays: DayKey[]) => {
    setTimeSlots(newTimeSlots);
    setClosedDays(newClosedDays);
    onChange(timeSlotsToWeekSchedule(newTimeSlots, newClosedDays));
  };

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: Math.random().toString(36).substr(2, 9),
      hasLunchBreak: false,
      assignedDays: []
    };
    updateSchedule([...timeSlots, newSlot], closedDays);
  };

  const removeTimeSlot = (id: string) => {
    updateSchedule(timeSlots.filter(slot => slot.id !== id), closedDays);
  };

  const updateTimeSlot = (id: string, updates: Partial<TimeSlot>) => {
    updateSchedule(
      timeSlots.map(slot => slot.id === id ? { ...slot, ...updates } : slot),
      closedDays
    );
  };

  const toggleDayInSlot = (slotId: string, dayKey: DayKey) => {
    const newTimeSlots = timeSlots.map(slot => {
      if (slot.id === slotId) {
        // Toggle ce jour dans ce slot
        if (slot.assignedDays.includes(dayKey)) {
          return { ...slot, assignedDays: slot.assignedDays.filter(d => d !== dayKey) };
        } else {
          return { ...slot, assignedDays: [...slot.assignedDays, dayKey] };
        }
      } else {
        // Retirer ce jour des autres slots
        return { ...slot, assignedDays: slot.assignedDays.filter(d => d !== dayKey) };
      }
    });

    // Retirer ce jour des jours fermés
    const newClosedDays = closedDays.filter(d => d !== dayKey);
    updateSchedule(newTimeSlots, newClosedDays);
  };

  const toggleClosedDay = (dayKey: DayKey) => {
    if (closedDays.includes(dayKey)) {
      // Retirer des jours fermés
      updateSchedule(timeSlots, closedDays.filter(d => d !== dayKey));
    } else {
      // Ajouter aux jours fermés et retirer de tous les slots
      const newTimeSlots = timeSlots.map(slot => ({
        ...slot,
        assignedDays: slot.assignedDays.filter(d => d !== dayKey)
      }));
      updateSchedule(newTimeSlots, [...closedDays, dayKey]);
    }
  };

  const getDayLabel = (dayKey: DayKey): string => {
    return DAYS.find(d => d.key === dayKey)?.label || dayKey;
  };

  return (
    <div className="space-y-6">
      {/* Section jours de fermeture */}
      <Card className="p-4 border-slate-200 bg-slate-50">
        <Label className="text-base font-semibold mb-3 block">Jour(s) de fermeture</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(({ key, label }) => {
            const dayKey = key as DayKey;
            const isClosed = closedDays.includes(dayKey);
            return (
              <Button
                key={key}
                type="button"
                variant={isClosed ? "default" : "outline"}
                size="sm"
                onClick={() => toggleClosedDay(dayKey)}
                className={isClosed ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Section horaires d'ouverture */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Horaires d'ouverture</Label>
          <Button type="button" onClick={addTimeSlot} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un horaire
          </Button>
        </div>

        {timeSlots.length === 0 && (
          <Card className="p-6 border-slate-200 border-dashed">
            <p className="text-center text-slate-500 text-sm">
              Aucun horaire défini. Cliquez sur "Ajouter un horaire" pour commencer.
            </p>
          </Card>
        )}

        {timeSlots.map((slot, index) => (
          <Card key={slot.id} className="p-4 border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Horaire #{index + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTimeSlot(slot.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Jours assignés */}
              <div>
                <Label className="text-xs text-slate-600 mb-2 block">Jours concernés</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(({ key, label }) => {
                    const dayKey = key as DayKey;
                    const isAssigned = slot.assignedDays.includes(dayKey);
                    const isClosed = closedDays.includes(dayKey);
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant={isAssigned ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDayInSlot(slot.id, dayKey)}
                        disabled={isClosed}
                        className={isAssigned ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Switch fermeture le midi */}
              <div className="flex items-center gap-2">
                <Switch
                  id={`${slot.id}-lunch`}
                  checked={slot.hasLunchBreak}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateTimeSlot(slot.id, {
                        hasLunchBreak: true,
                        openTime: undefined,
                        closeTime: undefined
                      });
                    } else {
                      updateTimeSlot(slot.id, {
                        hasLunchBreak: false,
                        morningOpen: undefined,
                        morningClose: undefined,
                        afternoonOpen: undefined,
                        afternoonClose: undefined
                      });
                    }
                  }}
                />
                <Label htmlFor={`${slot.id}-lunch`} className="text-sm font-normal">
                  Fermeture le midi
                </Label>
              </div>

              {/* Horaires */}
              {slot.hasLunchBreak ? (
                <div className="grid grid-cols-2 gap-3">
                  <TimeSelector
                    value={slot.morningOpen}
                    onChange={(val) => updateTimeSlot(slot.id, { morningOpen: val })}
                    label="Ouverture matin"
                  />
                  <TimeSelector
                    value={slot.morningClose}
                    onChange={(val) => updateTimeSlot(slot.id, { morningClose: val })}
                    label="Fermeture matin"
                  />
                  <TimeSelector
                    value={slot.afternoonOpen}
                    onChange={(val) => updateTimeSlot(slot.id, { afternoonOpen: val })}
                    label="Ouverture après-midi"
                  />
                  <TimeSelector
                    value={slot.afternoonClose}
                    onChange={(val) => updateTimeSlot(slot.id, { afternoonClose: val })}
                    label="Fermeture après-midi"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <TimeSelector
                    value={slot.openTime}
                    onChange={(val) => updateTimeSlot(slot.id, { openTime: val })}
                    label="Ouverture"
                  />
                  <TimeSelector
                    value={slot.closeTime}
                    onChange={(val) => updateTimeSlot(slot.id, { closeTime: val })}
                    label="Fermeture"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
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
    
    // Vérifier si le jour est marqué comme "non renseigné"
    if (day.notSet === true) {
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

// Helper pour comparer deux horaires (format HH:MM)
function compareTime(time1: string | undefined, time2: string | undefined): number {
  if (!time1 || !time2) return 0;
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  return minutes1 - minutes2;
}

// Helper pour valider la cohérence des horaires d'un jour
function validateDaySchedule(day: DaySchedule, dayLabel: string): { valid: boolean; message?: string } {
  if (!day?.isOpen || day?.notSet) {
    return { valid: true };
  }

  if (day.hasLunchBreak) {
    // Avec fermeture midi
    const morningOpen = day.morningOpen;
    const morningClose = day.morningClose;
    const afternoonOpen = day.afternoonOpen;
    const afternoonClose = day.afternoonClose;

    // Vérifier que tous les horaires sont renseignés
    if (!morningOpen || !morningClose || !afternoonOpen || !afternoonClose) {
      return {
        valid: false,
        message: `${dayLabel} : Tous les horaires doivent être renseignés`
      };
    }

    // Fermeture matin > Ouverture matin
    if (compareTime(morningClose, morningOpen) <= 0) {
      return {
        valid: false,
        message: `${dayLabel} : L'heure de fermeture du matin doit être postérieure à l'heure d'ouverture du matin`
      };
    }

    // Ouverture après-midi > Fermeture matin
    if (compareTime(afternoonOpen, morningClose) <= 0) {
      return {
        valid: false,
        message: `${dayLabel} : L'heure d'ouverture de l'après-midi doit être postérieure à l'heure de fermeture du matin`
      };
    }

    // Fermeture après-midi > Ouverture après-midi
    if (compareTime(afternoonClose, afternoonOpen) <= 0) {
      return {
        valid: false,
        message: `${dayLabel} : L'heure de fermeture de l'après-midi doit être postérieure à l'heure d'ouverture de l'après-midi`
      };
    }

    // Fermeture après-midi > Ouverture matin (dans tous les cas)
    if (compareTime(afternoonClose, morningOpen) <= 0) {
      return {
        valid: false,
        message: `${dayLabel} : L'heure de fermeture doit être postérieure à l'heure d'ouverture`
      };
    }
  } else {
    // Sans fermeture midi
    const openTime = day.openTime;
    const closeTime = day.closeTime;

    // Vérifier que tous les horaires sont renseignés
    if (!openTime || !closeTime) {
      return {
        valid: false,
        message: `${dayLabel} : Tous les horaires doivent être renseignés`
      };
    }

    // Fermeture > Ouverture
    if (compareTime(closeTime, openTime) <= 0) {
      return {
        valid: false,
        message: `${dayLabel} : L'heure de fermeture doit être postérieure à l'heure d'ouverture`
      };
    }
  }

  return { valid: true };
}

// Helper pour valider que tous les jours sont renseignés
export function validateWeekSchedule(schedule: WeekSchedule): { valid: boolean; message?: string } {
  const unassignedDays: string[] = [];
  
  DAYS.forEach(({ key, label }) => {
    const dayKey = key as DayKey;
    const day = schedule[dayKey];
    
    // Vérifier si le jour est marqué comme non renseigné
    if (day?.notSet === true) {
      unassignedDays.push(label);
    }
  });
  
  if (unassignedDays.length > 0) {
    // Vérifier si au moins un jour est assigné (horaire ouvert ou fermé explicite)
    const hasAnyAssignedDay = DAYS.some(({ key }) => {
      const dayKey = key as DayKey;
      const day = schedule[dayKey];
      return day && !day.notSet;
    });
    
    // Si des jours sont assignés mais pas tous, retourner une erreur
    if (hasAnyAssignedDay) {
      return {
        valid: false,
        message: 'Tous les jours de la semaine doivent être renseignés. Veuillez définir les horaires d\'ouverture ou marquer les jours de fermeture manquants.'
      };
    }
  }
  
  // Valider la cohérence des horaires pour chaque jour
  for (const { key, label } of DAYS) {
    const dayKey = key as DayKey;
    const day = schedule[dayKey];
    
    const validation = validateDaySchedule(day, label);
    if (!validation.valid) {
      return validation;
    }
  }
  
  return { valid: true };
}

