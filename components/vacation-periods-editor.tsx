'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export interface VacationPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD ou 2000-MM-DD pour récurrent
  endDate: string; // YYYY-MM-DD ou 2000-MM-DD pour récurrent
  isRecurring: boolean;
  inputType: 'weeks' | 'dates'; // Format de saisie utilisé
  startWeek?: number; // Semaine de début (1-52)
  endWeek?: number; // Semaine de fin (1-52)
  year?: number; // Année pour période spécifique
}

interface VacationPeriodsEditorProps {
  value: VacationPeriod[];
  onChange: (value: VacationPeriod[]) => void;
}

// Fonction pour obtenir la date de début d'une semaine ISO
function getDateFromWeek(week: number, year: number = new Date().getFullYear()): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

// Fonction pour obtenir le numéro de semaine ISO d'une date
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Fonction pour convertir une semaine en date (premier jour de la semaine)
function weekToDate(week: number, year: number): string {
  const date = getDateFromWeek(week, year);
  return date.toISOString().split('T')[0];
}

// Fonction pour obtenir le dernier jour d'une semaine
function getEndOfWeek(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return endDate;
}

// Fonction pour vérifier le chevauchement de deux périodes
function periodsOverlap(p1: VacationPeriod, p2: VacationPeriod): boolean {
  // Ne pas vérifier le chevauchement entre récurrente et spécifique
  // ou si l'une des périodes n'a pas de dates valides
  if (!p1.startDate || !p1.endDate || !p2.startDate || !p2.endDate) {
    return false;
  }

  // Convertir en dates pour comparaison
  let start1: Date, end1: Date, start2: Date, end2: Date;

  if (p1.inputType === 'weeks' && p1.startWeek && p1.endWeek) {
    const year1 = p1.isRecurring ? 2000 : (p1.year || new Date().getFullYear());
    start1 = new Date(weekToDate(p1.startWeek, year1));
    const end1Start = new Date(weekToDate(p1.endWeek, year1));
    end1 = getEndOfWeek(end1Start);
  } else {
    start1 = new Date(p1.startDate);
    end1 = new Date(p1.endDate);
  }

  if (p2.inputType === 'weeks' && p2.startWeek && p2.endWeek) {
    const year2 = p2.isRecurring ? 2000 : (p2.year || new Date().getFullYear());
    start2 = new Date(weekToDate(p2.startWeek, year2));
    const end2Start = new Date(weekToDate(p2.endWeek, year2));
    end2 = getEndOfWeek(end2Start);
  } else {
    start2 = new Date(p2.startDate);
    end2 = new Date(p2.endDate);
  }

  // Normaliser les années pour les périodes récurrentes (utiliser 2000)
  if (p1.isRecurring) {
    start1.setFullYear(2000);
    end1.setFullYear(2000);
  }
  if (p2.isRecurring) {
    start2.setFullYear(2000);
    end2.setFullYear(2000);
  }

  // Vérifier le chevauchement
  return start1 <= end2 && start2 <= end1;
}

export function VacationPeriodsEditor({ value, onChange }: VacationPeriodsEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<VacationPeriod | null>(null);
  const [periodType, setPeriodType] = useState<'recurring' | 'specific'>('specific');
  const [inputType, setInputType] = useState<'weeks' | 'dates'>('dates');
  const [tempStartWeek, setTempStartWeek] = useState<number | ''>('');
  const [tempEndWeek, setTempEndWeek] = useState<number | ''>('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempYear, setTempYear] = useState(new Date().getFullYear().toString());
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [deletePeriodDialogOpen, setDeletePeriodDialogOpen] = useState(false);

  const resetDialog = () => {
    setPeriodType('specific');
    setInputType('dates');
    setTempStartWeek('');
    setTempEndWeek('');
    setTempStartDate('');
    setTempEndDate('');
    setTempYear(new Date().getFullYear().toString());
    setEditingPeriod(null);
  };

  const handleAddPeriodClick = () => {
    resetDialog();
    setIsDialogOpen(true);
  };

  const handleEditPeriodClick = (period: VacationPeriod) => {
    setEditingPeriod(period);
    setPeriodType(period.isRecurring ? 'recurring' : 'specific');
    setInputType(period.inputType);
    
    if (period.inputType === 'weeks') {
      setTempStartWeek(period.startWeek || '');
      setTempEndWeek(period.endWeek || '');
      // Pour les semaines, utiliser l'année de la période si spécifique
      if (!period.isRecurring && period.year) {
        setTempYear(period.year.toString());
      } else {
        setTempYear(new Date().getFullYear().toString());
      }
    } else {
      // Pour les dates, extraire directement les dates
      setTempStartDate(period.startDate || '');
      setTempEndDate(period.endDate || '');
      // Extraire l'année des dates si période spécifique
      if (!period.isRecurring && period.startDate) {
        const yearFromDate = period.startDate.split('-')[0];
        setTempYear(yearFromDate);
      } else {
        setTempYear(new Date().getFullYear().toString());
      }
    }
    
    setIsDialogOpen(true);
  };

  const handleConfirmPeriod = () => {
    let newPeriod: VacationPeriod;

    if (inputType === 'weeks') {
      if (!tempStartWeek || !tempEndWeek) {
        toast.error('Veuillez renseigner les semaines de début et de fin');
        return;
      }

      if (tempStartWeek > tempEndWeek) {
        toast.error('La semaine de fin doit être supérieure ou égale à la semaine de début');
        return;
      }

      const startWeek = Number(tempStartWeek);
      const endWeek = Number(tempEndWeek);
      const year = periodType === 'specific' ? Number(tempYear) : undefined;

      let startDate: string;
      let endDate: string;

      if (periodType === 'recurring') {
        startDate = weekToDate(startWeek, 2000);
        const endWeekStart = new Date(weekToDate(endWeek, 2000));
        const endWeekEnd = getEndOfWeek(endWeekStart);
        endDate = endWeekEnd.toISOString().split('T')[0];
      } else {
        if (!year) {
          toast.error('Veuillez renseigner l\'année');
          return;
        }
        startDate = weekToDate(startWeek, year);
        const endWeekStart = new Date(weekToDate(endWeek, year));
        const endWeekEnd = getEndOfWeek(endWeekStart);
        endDate = endWeekEnd.toISOString().split('T')[0];
      }

      newPeriod = {
        id: editingPeriod?.id || `period-${Date.now()}`,
        startDate,
        endDate,
        isRecurring: periodType === 'recurring',
        inputType: 'weeks',
        startWeek,
        endWeek,
        year
      };
    } else {
      if (!tempStartDate || !tempEndDate) {
        toast.error('Veuillez renseigner les dates de début et de fin');
        return;
      }

      const startParts = tempStartDate.split('-');
      const endParts = tempEndDate.split('-');

      let startDate: string;
      let endDate: string;

      if (periodType === 'recurring') {
        startDate = `2000-${startParts[1]}-${startParts[2]}`;
        endDate = `2000-${endParts[1]}-${endParts[2]}`;
      } else {
        // Extraire l'année directement des dates
        const year = Number(startParts[0]);
        startDate = tempStartDate;
        endDate = tempEndDate;
        
        // Vérifier que les deux dates ont la même année
        if (startParts[0] !== endParts[0]) {
          toast.error('Les dates de début et de fin doivent être de la même année');
          return;
        }
      }

      if (startDate > endDate) {
        toast.error('La date de fin doit être postérieure à la date de début');
        return;
      }

      newPeriod = {
        id: editingPeriod?.id || `period-${Date.now()}`,
        startDate,
        endDate,
        isRecurring: periodType === 'recurring',
        inputType: 'dates',
        year: periodType === 'specific' ? Number(startParts[0]) : undefined
      };
    }

    // Vérifier les chevauchements avec les autres périodes (sauf celle en édition)
    const otherPeriods = editingPeriod 
      ? value.filter(p => p.id !== editingPeriod.id)
      : value;

    const overlapping = otherPeriods.find(p => {
      // Vérifier seulement les chevauchements entre périodes du même type (récurrent/specific)
      if (p.isRecurring !== newPeriod.isRecurring) {
        return false;
      }
      return periodsOverlap(p, newPeriod);
    });

    if (overlapping) {
      toast.error('Cette période chevauche avec une autre période existante');
      return;
    }

    if (editingPeriod) {
      onChange(value.map(p => p.id === editingPeriod.id ? newPeriod : p));
      toast.success('Période de fermeture modifiée');
    } else {
      onChange([...value, newPeriod]);
      toast.success('Période de fermeture ajoutée');
    }

    setIsDialogOpen(false);
    resetDialog();
  };

  const handleDeletePeriodClick = (id: string) => {
    setDeletingPeriodId(id);
    setDeletePeriodDialogOpen(true);
  };

  const handleDeletePeriodConfirm = () => {
    if (deletingPeriodId) {
      onChange(value.filter(period => period.id !== deletingPeriodId));
      toast.success('Période de fermeture supprimée');
      setDeletePeriodDialogOpen(false);
      setDeletingPeriodId(null);
    }
  };

  // Générer les options de semaines (S1 à S52)
  const weekOptions = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Périodes de fermeture</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPeriodClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une période de fermeture
        </Button>
      </div>

      {/* Dialog pour ajouter/modifier une période */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetDialog();
      }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Modifier une période de fermeture' : 'Ajouter une période de fermeture'}
            </DialogTitle>
            <DialogDescription>
              Choisissez le type de période et le format de saisie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Type de période */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Type de période</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={periodType === 'specific' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('specific')}
                  className="flex-1"
                >
                  Ponctuel
                </Button>
                <Button
                  type="button"
                  variant={periodType === 'recurring' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('recurring')}
                  className="flex-1"
                >
                  Annuel
                </Button>
              </div>
            </div>

            {/* Format de saisie */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Format de saisie</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inputType === 'dates' ? 'default' : 'outline'}
                  onClick={() => setInputType('dates')}
                  className="flex-1"
                >
                  Dates précises
                </Button>
                <Button
                  type="button"
                  variant={inputType === 'weeks' ? 'default' : 'outline'}
                  onClick={() => setInputType('weeks')}
                  className="flex-1"
                >
                  Semaines (S1 à S52)
                </Button>
              </div>
            </div>

            {/* Année (seulement pour période spécifique avec saisie par semaines) */}
            {periodType === 'specific' && inputType === 'weeks' && (
              <div>
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  type="number"
                  min="2000"
                  max="2100"
                  value={tempYear}
                  onChange={(e) => setTempYear(e.target.value)}
                  className="mt-1.5 w-32"
                  placeholder="2024"
                />
              </div>
            )}

            {/* Saisie par semaines */}
            {inputType === 'weeks' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-600">Semaine de début</Label>
                    <Select
                      value={tempStartWeek.toString()}
                      onValueChange={(val) => setTempStartWeek(Number(val))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map(week => (
                          <SelectItem key={week} value={week.toString()}>
                            S{week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm mt-6">à</span>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-600">Semaine de fin</Label>
                    <Select
                      value={tempEndWeek.toString()}
                      onValueChange={(val) => setTempEndWeek(Number(val))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map(week => (
                          <SelectItem key={week} value={week.toString()}>
                            S{week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Saisie par dates */}
            {inputType === 'dates' && (
              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-xs text-slate-600">Date de début</Label>
                  <Input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
                <span className="text-sm mt-6">au</span>
                <div>
                  <Label className="text-xs text-slate-600">Date de fin</Label>
                  <Input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmPeriod}
              disabled={
                (inputType === 'weeks' && (!tempStartWeek || !tempEndWeek)) ||
                (inputType === 'dates' && (!tempStartDate || !tempEndDate)) ||
                (periodType === 'specific' && inputType === 'weeks' && !tempYear)
              }
            >
              {editingPeriod ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liste des périodes */}
      {value.length === 0 ? (
        <p className="text-sm text-slate-500 italic">Aucune période de fermeture ajoutée</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.map((period) => {
                let periodDisplay: string;

                if (period.inputType === 'weeks' && period.startWeek && period.endWeek) {
                  const weekStr = period.startWeek === period.endWeek 
                    ? `S${period.startWeek}`
                    : `S${period.startWeek} à S${period.endWeek}`;
                  
                  if (period.isRecurring) {
                    periodDisplay = `${weekStr} (annuel)`;
                  } else {
                    periodDisplay = `${weekStr} - ${period.year}`;
                  }
                } else {
                  const start = new Date(period.startDate);
                  const end = new Date(period.endDate);
                  
                  if (period.isRecurring) {
                    periodDisplay = `${start.toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' })} au ${end.toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' })} (annuel)`;
                  } else {
                    periodDisplay = `${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
                  }
                }

                return (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className="px-2 py-1 rounded bg-blue-50 border border-blue-200 inline-block">
                        <span className="text-xs font-medium text-blue-700">
                          {period.isRecurring ? 'Annuel' : 'Ponctuel'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{periodDisplay}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPeriodClick(period)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePeriodClick(period.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de confirmation de suppression de période */}
      <AlertDialog open={deletePeriodDialogOpen} onOpenChange={setDeletePeriodDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette période de fermeture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette période de fermeture ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePeriodConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function validateVacationPeriods(periods: VacationPeriod[]): { valid: boolean; message?: string } {
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    
    if (period.inputType === 'weeks') {
      if (!period.startWeek || !period.endWeek) {
        return { valid: false, message: `Semaines manquantes pour la période ${i + 1}` };
      }
      if (period.startWeek > period.endWeek) {
        return { valid: false, message: `La semaine de fin doit être supérieure ou égale à la semaine de début pour la période ${i + 1}` };
      }
      if (!period.isRecurring && !period.year) {
        return { valid: false, message: `Année manquante pour la période ponctuelle ${i + 1}` };
      }
    } else {
      if (!period.startDate || !period.endDate) {
        return { valid: false, message: `Dates manquantes pour la période ${i + 1}` };
      }
      if (period.startDate > period.endDate) {
        return { valid: false, message: `La date de fin doit être postérieure à la date de début pour la période ${i + 1}` };
      }
      if (!period.isRecurring && !period.year) {
        return { valid: false, message: `Année manquante pour la période ponctuelle ${i + 1}` };
      }
    }

    // Vérifier les chevauchements
    for (let j = i + 1; j < periods.length; j++) {
      const otherPeriod = periods[j];
      if (period.isRecurring === otherPeriod.isRecurring && periodsOverlap(period, otherPeriod)) {
        return { valid: false, message: `Les périodes ${i + 1} et ${j + 1} se chevauchent` };
      }
    }
  }
  return { valid: true };
}

export function formatVacationPeriods(periods: VacationPeriod[]): string {
  if (periods.length === 0) return '';
  
  return periods
    .filter(p => {
      if (p.inputType === 'weeks') {
        return p.startWeek && p.endWeek;
      }
      return p.startDate && p.endDate;
    })
    .map(p => {
      if (p.inputType === 'weeks' && p.startWeek && p.endWeek) {
        const weekStr = p.startWeek === p.endWeek 
          ? `S${p.startWeek}`
          : `S${p.startWeek} à S${p.endWeek}`;
        
        if (p.isRecurring) {
          return `${weekStr} (annuel)`;
        } else {
          return `${weekStr} - ${p.year}`;
        }
      } else {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        
        if (p.isRecurring) {
          const startStr = start.toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' });
          const endStr = end.toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' });
          return `${startStr} au ${endStr} (annuel)`;
        } else {
          return `${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
        }
      }
    })
    .join(' | ');
}
