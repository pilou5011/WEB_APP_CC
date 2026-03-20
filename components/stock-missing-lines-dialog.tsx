'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StockMissingLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingProducts: string[];
  onBack: () => void;
  onContinue: () => void;
}

export function StockMissingLinesDialog({
  open,
  onOpenChange,
  missingProducts,
  onBack,
  onContinue,
}: StockMissingLinesDialogProps) {
  const maxToShow = 10;
  const displayed = missingProducts.slice(0, maxToShow);
  const isSubProductLine = (label: string) => label.startsWith('└ ');

  const totalProductCount = missingProducts.filter((p) => !isSubProductLine(p)).length;
  const displayedProductCount = displayed.filter((p) => !isSubProductLine(p)).length;
  const othersCount = Math.max(0, totalProductCount - displayedProductCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>⚠️ Produits non renseignés</DialogTitle>
          <DialogDescription>
            Certaines lignes du tableau de stock n&apos;ont ni <strong>Stock compté</strong> ni <strong>Nouveau dépôt</strong>.
            Vous pouvez revenir pour compléter, ou continuer la facture malgré ces manques.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {missingProducts.length === 0 ? null : (
            <>
              <p className="text-sm text-slate-700 font-medium">
                {totalProductCount === 1
                  ? '1 produit concerné :'
                  : `${totalProductCount} produits concernés :`}
              </p>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                {displayed.map((p) => {
                  const isSubLine = isSubProductLine(p);
                  return (
                    <li key={p} className={isSubLine ? 'list-none marker:hidden' : undefined}>
                      {p}
                    </li>
                  );
                })}
              </ul>
              {othersCount > 0 && (
                <p className="text-sm text-slate-600">
                  Et {othersCount} autre{othersCount > 1 ? 's' : ''} produit{othersCount > 1 ? 's' : ''} non renseigné{othersCount > 1 ? 's' : ''} également.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onBack}>
            Revenir à la mise à jour du stock
          </Button>
          <Button type="button" onClick={onContinue}>
            Continuer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

