'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DraftRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onDiscard: () => void;
  draftDate: string;
}

export function DraftRecoveryDialog({ 
  open, 
  onOpenChange, 
  onResume, 
  onDiscard, 
  draftDate 
}: DraftRecoveryDialogProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Brouillon détecté</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Vous aviez commencé une mise à jour de stock le{' '}
              <span className="font-semibold text-[#0B1F33]">{formatDate(draftDate)}</span>.
            </p>
            <p>
              Voulez-vous reprendre là où vous vous étiez arrêté ?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            Supprimer le brouillon
          </AlertDialogCancel>
          <AlertDialogAction onClick={onResume}>
            Reprendre
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}









