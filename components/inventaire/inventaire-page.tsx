'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildInventoryWorkbook,
  downloadInventoryXlsx,
  formatMissingPurchasePriceAlert,
  listProductsMissingPurchasePrice,
  loadInventoryMatrixForDate,
  type InventoryMatrix,
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
  const [checkingPrices, setCheckingPrices] = useState(false);
  const [inventory, setInventory] = useState<InventoryMatrix | null>(null);

  const canExport = useMemo(() => Boolean(dateYmd) && !exporting, [dateYmd, exporting]);
  const productsMissingPurchasePrice = useMemo(
    () => (inventory ? listProductsMissingPurchasePrice(inventory) : []),
    [inventory]
  );

  useEffect(() => {
    if (!dateYmd) {
      setInventory(null);
      setCheckingPrices(false);
      return;
    }

    let cancelled = false;
    setCheckingPrices(true);
    setInventory(null);

    loadInventoryMatrixForDate(dateYmd)
      .then((matrix) => {
        if (!cancelled) setInventory(matrix);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[Inventaire] Vérification des prix d\'achat:', error);
        const message =
          error instanceof Error
            ? error.message
            : 'Impossible de vérifier les prix d\'achat';
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setCheckingPrices(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateYmd]);

  const handleExport = async () => {
    if (!dateYmd) {
      toast.error('Veuillez sélectionner une date d\'inventaire');
      return;
    }

    setExporting(true);
    try {
      const matrix = await loadInventoryMatrixForDate(dateYmd);
      setInventory(matrix);
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
              Exportez les stocks, les prix d&apos;achat HT et les valeurs de stock de vos clients à une
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

            {checkingPrices ? (
              <p className="text-sm text-slate-500">Vérification des prix d&apos;achat…</p>
            ) : null}

            {productsMissingPurchasePrice.length > 0 ? (
              <Alert className="border-amber-200 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {formatMissingPurchasePriceAlert(productsMissingPurchasePrice.length)}
                </AlertTitle>
                <AlertDescription>
                  <p>
                    Ces produits ne pourront pas être correctement valorisés dans l&apos;export de
                    l&apos;inventaire. Leur valeur de stock ne pourra pas être calculée à partir du
                    Prix d&apos;achat (HT). Dans le fichier Excel, ces cellules restent « N/A » et
                    ne sont pas incluses dans les totaux.
                  </p>
                  <Accordion
                    type="single"
                    collapsible
                    className="mt-2"
                    key={`${dateYmd}-${productsMissingPurchasePrice.length}`}
                  >
                    <AccordionItem value="produits" className="border-none">
                      <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                        Voir les produits concernés
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
                          {productsMissingPurchasePrice.map((product) => (
                            <li key={product.id}>{product.name}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Le fichier Excel contient trois onglets : <strong>Stocks</strong>,{' '}
              <strong>Prix par produit</strong> (prix d&apos;achat HT) et{' '}
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
