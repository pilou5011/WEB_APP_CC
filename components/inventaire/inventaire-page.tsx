'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildInventoryWorkbook,
  downloadInventoryXlsx,
  loadInventoryMatrixForDate,
} from '@/lib/inventaire';

function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateFr(dateYmd: string): string {
  const [y, m, d] = dateYmd.split('-');
  if (!y || !m || !d) return dateYmd;
  return `${d}/${m}/${y}`;
}

export function InventaireClientPage() {
  const [dateYmd, setDateYmd] = useState<string>(todayYmdLocal);
  const [exporting, setExporting] = useState(false);

  const canExport = useMemo(() => Boolean(dateYmd) && !exporting, [dateYmd, exporting]);

  const handleExport = async () => {
    if (!dateYmd) {
      toast.error('Veuillez sélectionner une date d\'inventaire');
      return;
    }

    setExporting(true);
    try {
      const matrix = await loadInventoryMatrixForDate(dateYmd);
      if (matrix.products.length === 0) {
        toast.error('Aucun produit disponible à cette date');
        return;
      }
      if (matrix.clients.length === 0) {
        toast.error('Aucun client disponible à cette date');
        return;
      }

      const buffer = await buildInventoryWorkbook(matrix, dateYmd);
      downloadInventoryXlsx(buffer, dateYmd);
      toast.success('Inventaire Excel téléchargé');
    } catch (error) {
      console.error('[Inventaire] Export error:', error);
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la génération de l\'inventaire';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-[#0B1F33]">Inventaire</CardTitle>
            <CardDescription className="text-base text-slate-600">
              Exportez les stocks, prix de cession HT et valeurs de stock de vos clients à une
              date donnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="inventory-date" className="text-xs text-slate-600">
                Date d&apos;inventaire
              </Label>
              <Input
                id="inventory-date"
                type="date"
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
                className="mt-1 w-40"
                disabled={exporting}
              />
              <p className="mt-2 text-sm text-slate-500">
                Stocks calculés jusqu&apos;au{' '}
                <span className="font-medium text-slate-700">
                  {dateYmd ? formatDateFr(dateYmd) : '—'}
                </span>{' '}
                à 23:59:59 (heure locale).
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Le fichier Excel contient trois onglets : <strong>Stocks</strong>,{' '}
              <strong>Prix par produit</strong> (prix actuels) et{' '}
              <strong>Valeur par produit</strong>. L&apos;export n&apos;est pas enregistré dans
              la Bibliothèque.
            </div>

            <Button
              size="lg"
              onClick={() => void handleExport()}
              disabled={!canExport}
              className="bg-[#0B1F33] hover:bg-[#0B1F33]/90"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Préparation de l&apos;export…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter l&apos;inventaire Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
