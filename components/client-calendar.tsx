'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { WeekSchedule } from '@/components/opening-hours-editor';
import { VacationPeriod } from '@/components/vacation-periods-editor';
import { MarketDaysSchedule } from '@/components/market-days-editor';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface ClientCalendarProps {
  openingHours: WeekSchedule | null;
  vacationPeriods: VacationPeriod[];
  marketDaysSchedule?: MarketDaysSchedule | null;
  clientName: string;
}

type DayStatus = 'open' | 'closed_weekly' | 'closed_vacation';

// Mapping des noms de jours en français vers les clés du schedule
const DAY_NAME_TO_KEY: Record<string, keyof WeekSchedule> = {
  'Lundi': 'monday',
  'Mardi': 'tuesday',
  'Mercredi': 'wednesday',
  'Jeudi': 'thursday',
  'Vendredi': 'friday',
  'Samedi': 'saturday',
  'Dimanche': 'sunday'
};

// Mapping des jours de la semaine JavaScript (0-6) vers les clés du schedule
const JS_DAY_TO_KEY: Record<number, keyof WeekSchedule> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

export function ClientCalendar({ openingHours, vacationPeriods, marketDaysSchedule, clientName }: ClientCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fonction pour obtenir le statut d'un jour
  const getDayStatus = (date: Date): { status: DayStatus; reason?: string } => {
    const dayOfWeek = date.getDay();
    const dayKey = JS_DAY_TO_KEY[dayOfWeek];
    
    // Vérifier si le jour est dans une période de vacances
    const dateStr = date.toISOString().split('T')[0];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    for (const period of vacationPeriods) {
      if (period.inputType === 'weeks' && period.startWeek && period.endWeek) {
        // Vérifier si la date est dans la plage de semaines
        const periodYear = period.isRecurring ? year : (period.year || year);
        const startWeekDate = getWeekStartDate(period.startWeek, periodYear);
        const endWeekDate = getWeekEndDate(period.endWeek, periodYear);
        
        // Normaliser les dates pour la comparaison
        const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const startNormalized = new Date(startWeekDate.getFullYear(), startWeekDate.getMonth(), startWeekDate.getDate());
        const endNormalized = new Date(endWeekDate.getFullYear(), endWeekDate.getMonth(), endWeekDate.getDate());
        
        if (dateNormalized >= startNormalized && dateNormalized <= endNormalized) {
          return {
            status: 'closed_vacation',
            reason: 'Vacances'
          };
        }
        
        // Pour les périodes récurrentes, vérifier aussi si c'est la même semaine de l'année
        if (period.isRecurring) {
          const currentWeek = getWeekNumber(date);
          if (currentWeek >= period.startWeek && currentWeek <= period.endWeek) {
            return {
              status: 'closed_vacation',
              reason: 'Vacances (annuel)'
            };
          }
        }
      } else {
        // Vérifier si la date est dans la plage de dates
        let periodStart: Date;
        let periodEnd: Date;

        if (period.isRecurring) {
          // Pour les périodes récurrentes, utiliser l'année courante
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);
          
          // Normaliser à l'année courante
          periodStart = new Date(year, startDate.getMonth(), startDate.getDate());
          periodEnd = new Date(year, endDate.getMonth(), endDate.getDate());
        } else {
          periodStart = new Date(period.startDate);
          periodEnd = new Date(period.endDate);
        }

        // Normaliser les heures pour la comparaison (comparer uniquement les dates)
        const dateNormalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const startNormalized = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
        const endNormalized = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());

        if (dateNormalized >= startNormalized && dateNormalized <= endNormalized) {
          return {
            status: 'closed_vacation',
            reason: period.isRecurring ? 'Vacances (annuel)' : 'Vacances'
          };
        }
      }
    }

    // Vérifier si le jour est fermé hebdomadairement
    if (openingHours && openingHours[dayKey]) {
      const daySchedule = openingHours[dayKey];
      
      // Si le jour n'est pas ouvert (isOpen === false) et n'est pas "notSet"
      if (daySchedule.isOpen === false && !daySchedule.notSet) {
        return {
          status: 'closed_weekly',
          reason: 'Fermeture hebdomadaire'
        };
      }
      
      // Si le jour est ouvert ou non renseigné, c'est ouvert
      if (daySchedule.isOpen === true || daySchedule.notSet === true) {
        return {
          status: 'open',
          reason: 'Ouvert'
        };
      }
    }

    // Par défaut, considérer comme ouvert si pas d'infos
    return {
      status: 'open',
      reason: 'Ouvert'
    };
  };

  // Fonction pour obtenir le premier jour d'une semaine ISO
  const getWeekStartDate = (week: number, year: number): Date => {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  };

  // Fonction pour obtenir le dernier jour d'une semaine ISO
  const getWeekEndDate = (week: number, year: number): Date => {
    const startDate = getWeekStartDate(week, year);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return endDate;
  };
  
  // Fonction pour obtenir le numéro de semaine ISO d'une date
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Fonction pour formater une heure
  const formatTime = (time: string | undefined): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (m === 0) {
      return `${h}h`;
    } else {
      return `${h}h${m.toString().padStart(2, '0')}`;
    }
  };

  // Fonction pour obtenir les horaires d'ouverture d'un jour
  const getOpeningHoursForDay = (date: Date): string[] => {
    const dayOfWeek = date.getDay();
    const dayKey = JS_DAY_TO_KEY[dayOfWeek];
    
    if (!openingHours || !openingHours[dayKey]) {
      return [];
    }

    const daySchedule = openingHours[dayKey];
    
    if (!daySchedule.isOpen || daySchedule.notSet) {
      return [];
    }

    const hours: string[] = [];

    if (daySchedule.hasLunchBreak) {
      // Avec pause déjeuner
      if (daySchedule.morningOpen && daySchedule.morningClose) {
        hours.push(`${formatTime(daySchedule.morningOpen)} - ${formatTime(daySchedule.morningClose)}`);
      }
      if (daySchedule.afternoonOpen && daySchedule.afternoonClose) {
        hours.push(`${formatTime(daySchedule.afternoonOpen)} - ${formatTime(daySchedule.afternoonClose)}`);
      }
    } else {
      // Sans pause déjeuner
      if (daySchedule.openTime && daySchedule.closeTime) {
        hours.push(`${formatTime(daySchedule.openTime)} - ${formatTime(daySchedule.closeTime)}`);
      }
    }

    return hours;
  };

  // Fonction pour obtenir les horaires de marché d'un jour
  const getMarketHoursForDay = (date: Date): string[] => {
    if (!marketDaysSchedule) {
      return [];
    }

    const dayNames: Record<number, string> = {
      1: 'Lundi',
      2: 'Mardi',
      3: 'Mercredi',
      4: 'Jeudi',
      5: 'Vendredi',
      6: 'Samedi',
      0: 'Dimanche'
    };

    const dayName = dayNames[date.getDay()];
    const marketHours = marketDaysSchedule[dayName as keyof MarketDaysSchedule];

    if (!marketHours || marketHours.length === 0) {
      return [];
    }

    return marketHours.map(range => {
      const start = formatTime(range.start);
      const end = formatTime(range.end);
      return `${start} - ${end}`;
    });
  };

  // Gestion du clic sur un jour
  const handleDayClick = (date: Date | undefined) => {
    if (date) {
      // Créer une nouvelle instance de date pour éviter les problèmes de référence
      const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(dateCopy);
      setIsDialogOpen(true);
    }
  };

  // Navigation entre les mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };


  // Customiser le rendu des jours du calendrier
  const modifiers = useMemo(() => ({
    open: (date: Date) => {
      const { status } = getDayStatus(date);
      return status === 'open';
    },
    closedWeekly: (date: Date) => {
      const { status } = getDayStatus(date);
      return status === 'closed_weekly';
    },
    closedVacation: (date: Date) => {
      const { status } = getDayStatus(date);
      return status === 'closed_vacation';
    }
  }), [openingHours, vacationPeriods]);

  const modifiersClassNames = {
    open: '!bg-green-100 hover:!bg-green-200 !text-green-900 font-medium',
    closedWeekly: '!bg-red-100 hover:!bg-red-200 !text-red-900 font-medium',
    closedVacation: '!bg-orange-100 hover:!bg-orange-200 !text-orange-900 font-medium'
  };

  return (
    <div className="space-y-4">
      {/* Contrôles de navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Aujourd'hui
          </Button>
        </div>
      </div>

      {/* Calendrier */}
      <TooltipProvider>
        <div className="flex justify-start">
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={(date) => {
              if (date) {
                handleDayClick(date);
                // Ne pas changer le mois au clic, seulement ouvrir le dialog
              }
            }}
            month={currentDate}
            onMonthChange={setCurrentDate}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            weekStartsOn={1}
            className="rounded-md border"
            classNames={{
              day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              day_today: 'bg-accent text-accent-foreground'
            }}
          />
        </div>
      </TooltipProvider>

      {/* Dialog pour afficher les détails d'un jour */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'Détails du jour'}
            </DialogTitle>
            <DialogDescription>
              Horaires et informations pour cette journée
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && (
            <div className="space-y-4 py-4">
              {(() => {
                const { status, reason } = getDayStatus(selectedDate);
                const openingHoursList = getOpeningHoursForDay(selectedDate);
                const marketHoursList = getMarketHoursForDay(selectedDate);

                if (status === 'closed_weekly' || status === 'closed_vacation') {
                  return (
                    <div className="text-center py-6">
                      <div className="text-lg font-medium text-slate-700 mb-2">
                        {reason || 'Fermé ce jour'}
                      </div>
                      <p className="text-sm text-slate-500">
                        {status === 'closed_weekly' 
                          ? 'Fermeture hebdomadaire'
                          : 'Fermeture pour vacances'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Horaires d'ouverture */}
                    {openingHoursList.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-slate-600" />
                          <Label className="text-sm font-semibold text-slate-700">
                            Horaires d'ouverture
                          </Label>
                        </div>
                        <div className="space-y-2">
                          {openingHoursList.map((hours, index) => (
                            <div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                              <p className="text-sm font-medium text-slate-800">{hours}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-500">Aucun horaire d'ouverture renseigné</p>
                      </div>
                    )}

                    {/* Horaires de marché */}
                    {marketHoursList.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CalendarDays className="h-4 w-4 text-slate-600" />
                            <Label className="text-sm font-semibold text-slate-700">
                              Horaires du marché
                            </Label>
                          </div>
                          <div className="space-y-2">
                            {marketHoursList.map((hours, index) => (
                              <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-sm font-medium text-blue-800">{hours}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

