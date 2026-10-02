'use client';

import React, { useEffect, useState } from 'react';
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
import type { DeliveryNote } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import {
  buildCashInvoiceImportPreview,
  type CashInvoiceImportLine,
  type CashInvoiceImportPreview,
} from '@/lib/delivery-notes/import-service';

export type CashInvoiceImportedPayload = {
  deliveryNoteId: string;
  deliveryNumber: string;
  lines: CashInvoiceImportLine[];
};

type ImportCashInvoiceDeliveryNoteSectionProps = {
  clientId: string;
  validatedNotes: DeliveryNote[];
  onImported: (payload: CashInvoiceImportedPayload) => void;
};

export function ImportCashInvoiceDeliveryNoteSection({
  clientId: _clientId,
  validatedNotes,
  onImported,
}: ImportCashInvoiceDeliveryNoteSectionProps) {
  const [preparingImport, setPreparingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<CashInvoiceImportPreview | null>(null);

  useEffect(() => {
    setSelectedNoteId((prev) => (validatedNotes.some((n) => n.id === prev) ? prev : ''));
  }, [validatedNotes]);

  const handlePrepareImport = async () => {
    if (!selectedNoteId) {
      toast.error('Sélectionnez un bon de livraison');
      return;
    }

    setPreparingImport(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const previewData = await buildCashInvoiceImportPreview(companyId, selectedNoteId);
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
    if (!preview) return;

    setImporting(true);
    try {
      // Re-vérifier juste avant d'alimenter le brouillon (données potentiellement obsolètes)
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) throw new Error('Non autorisé');

      const fresh = await buildCashInvoiceImportPreview(companyId, preview.deliveryNoteId);
      onImported({
        deliveryNoteId: fresh.deliveryNoteId,
        deliveryNumber: fresh.deliveryNumber,
        lines: fresh.lines,
      });
      toast.success(
        `Bon de livraison ${fresh.deliveryNumber} importé dans la facture — il sera marqué comme utilisé à la génération`
      );
      setConfirmOpen(false);
      setPreview(null);
      setSelectedNoteId('');
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  if (validatedNotes.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Aucun bon de livraison validé disponible pour ce client.
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
            {validatedNotes.map((note) => (
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
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;import du bon de livraison</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left text-slate-700">
                {preview && (
                  <>
                    <p className="text-sm">
                      Les produits de <strong>{preview.deliveryNumber}</strong> seront ajoutés à la
                      facture en cours. Les sous-produits sont agrégés sur le produit parent. Le bon
                      ne sera marqué comme utilisé qu&apos;après génération réussie de la facture.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produit</TableHead>
                          <TableHead className="text-center">Quantité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.lines.map((line) => (
                          <TableRow key={line.productId}>
                            <TableCell>{line.productName}</TableCell>
                            <TableCell className="text-center font-medium">{line.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport} disabled={importing}>
              {importing ? 'Import en cours...' : 'Importer dans la facture'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
