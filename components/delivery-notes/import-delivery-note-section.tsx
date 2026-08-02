'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import type { DeliveryNote } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import {
  buildDeliveryNoteImportPreview,
  executeDeliveryNoteImport,
  fetchDeliveryNoteLines,
  type DeliveryNoteImportPreview,
} from '@/lib/delivery-notes';

type ImportDeliveryNoteSectionProps = {
  clientId: string;
  draftNotes: DeliveryNote[];
  onImported: () => void;
};

function formatPreviousDepot(value: number | null): string {
  return value === null ? '-' : String(value);
}

export function ImportDeliveryNoteSection({
  clientId,
  draftNotes,
  onImported,
}: ImportDeliveryNoteSectionProps) {
  const [preparingImport, setPreparingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<DeliveryNoteImportPreview | null>(null);

  useEffect(() => {
    setSelectedNoteId((prev) => (draftNotes.some((n) => n.id === prev) ? prev : ''));
  }, [draftNotes]);

  const handlePrepareImport = async () => {
    if (!selectedNoteId) {
      toast.error('Sélectionnez un bon de livraison');
      return;
    }

    setPreparingImport(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const lines = await fetchDeliveryNoteLines(selectedNoteId, companyId);
      if (lines.length === 0) {
        toast.error('Ce bon de livraison ne contient aucun produit');
        return;
      }

      const previewData = await buildDeliveryNoteImportPreview(clientId, companyId, lines);
      setPreview(previewData);
      setConfirmOpen(true);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la préparation');
    } finally {
      setPreparingImport(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedNoteId) return;

    setImporting(true);
    try {
      await executeDeliveryNoteImport({ deliveryNoteId: selectedNoteId });
      toast.success('Bon de livraison importé — les stocks ont été mis à jour');
      setConfirmOpen(false);
      setPreview(null);
      setSelectedNoteId('');
      onImported();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const renderPreviewTable = (rows: DeliveryNoteImportPreview['lines']) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produit</TableHead>
          <TableHead className="text-center">Ancien dépôt</TableHead>
          <TableHead className="text-center">Quantité importée</TableHead>
          <TableHead className="text-center">Nouveau dépôt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId}>
            <TableCell>{row.productName}</TableCell>
            <TableCell className="text-center">{formatPreviousDepot(row.previousDepot)}</TableCell>
            <TableCell className="text-center">{row.quantity}</TableCell>
            <TableCell className="text-center font-medium">{row.newDepot}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (draftNotes.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Aucun bon de livraison en brouillon disponible pour ce client.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Select value={selectedNoteId || undefined} onValueChange={setSelectedNoteId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un bon de livraison" />
          </SelectTrigger>
          <SelectContent>
            {draftNotes.map((note) => (
              <SelectItem key={note.id} value={note.id}>
                {note.delivery_number} — créé le{' '}
                {new Date(note.created_at).toLocaleDateString('fr-FR')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          className="w-full md:w-auto"
          onClick={handlePrepareImport}
          disabled={preparingImport || !selectedNoteId}
        >
          {preparingImport ? 'Préparation...' : 'Importer le bon de livraison'}
        </Button>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(isOpen) => {
          if (!importing) setConfirmOpen(isOpen);
        }}
      >
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;import du bon de livraison</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left text-slate-700">
                {preview && (
                  <p className="text-sm">
                    <strong>{preview.added.length}</strong> produit{preview.added.length > 1 ? 's' : ''}{' '}
                    ajouté{preview.added.length > 1 ? 's' : ''} ·{' '}
                    <strong>{preview.updated.length}</strong> produit{preview.updated.length > 1 ? 's' : ''}{' '}
                    mis à jour{preview.updated.length > 1 ? 's' : ''}
                  </p>
                )}
                {preview && preview.added.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-slate-900">Produits ajoutés</h4>
                    {renderPreviewTable(preview.added)}
                  </div>
                )}
                {preview && preview.updated.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-slate-900">Produits mis à jour</h4>
                    {renderPreviewTable(preview.updated)}
                  </div>
                )}
                <Separator />
                <p className="text-sm font-medium text-red-700">
                  Cette opération est irréversible. Les stocks du client seront immédiatement modifiés.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={importing}>
              {importing ? 'Import en cours...' : 'Importer le bon de livraison'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
