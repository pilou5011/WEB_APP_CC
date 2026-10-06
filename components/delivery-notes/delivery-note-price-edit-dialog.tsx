'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type DeliveryNotePriceEditValues = {
  price_type: 'default' | 'custom';
  custom_price: string;
  recommended_sale_price_type: 'default' | 'custom';
  custom_recommended_sale_price: string;
};

type DeliveryNotePriceEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  defaultPriceHt: number;
  defaultRecommendedTtc: number | null;
  initial: DeliveryNotePriceEditValues;
  onSave: (values: DeliveryNotePriceEditValues) => void;
};

/**
 * Dialogue d'édition des prix BL — même UX que Facturer (dépôt),
 * sans le champ « Info produit pour facture ».
 */
export function DeliveryNotePriceEditDialog({
  open,
  onOpenChange,
  productName,
  defaultPriceHt,
  defaultRecommendedTtc,
  initial,
  onSave,
}: DeliveryNotePriceEditDialogProps) {
  const [form, setForm] = useState<DeliveryNotePriceEditValues>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.price_type === 'custom') {
      const parsed = parseFloat(form.custom_price.replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        toast.error('Prix de cession invalide');
        return;
      }
    }

    if (form.recommended_sale_price_type === 'custom') {
      const parsed = parseFloat(form.custom_recommended_sale_price.replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        toast.error('Prix de vente conseillé invalide');
        return;
      }
    }

    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le prix</DialogTitle>
            <DialogDescription>
              Modifiez le prix de &quot;{productName}&quot; pour ce bon de livraison
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
              <p className="text-sm text-slate-600">
                Prix de cession par défaut :
                <span className="font-semibold text-[#0B1F33] ml-2">
                  {defaultPriceHt.toFixed(2)} €
                </span>
              </p>
              {defaultRecommendedTtc !== null && (
                <p className="text-sm text-slate-600">
                  Prix de vente conseillé par défaut :
                  <span className="font-semibold text-[#0B1F33] ml-2">
                    {defaultRecommendedTtc.toFixed(2)} €
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-3 border border-slate-200 rounded-lg p-4">
              <Label>Prix de cession (HT)</Label>
              <RadioGroup
                value={form.price_type}
                onValueChange={(val: 'default' | 'custom') =>
                  setForm({ ...form, price_type: val })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="bl-edit-price-default" />
                  <Label htmlFor="bl-edit-price-default" className="font-normal cursor-pointer">
                    Utiliser le prix par défaut
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="bl-edit-price-custom" />
                  <Label htmlFor="bl-edit-price-custom" className="font-normal cursor-pointer">
                    Utiliser un prix spécifique
                  </Label>
                </div>
              </RadioGroup>

              {form.price_type === 'custom' && (
                <div className="pt-2">
                  <Label htmlFor="bl-edit-custom-price">Prix personnalisé (€)</Label>
                  <Input
                    id="bl-edit-custom-price"
                    type="text"
                    inputMode="decimal"
                    value={form.custom_price}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setForm({ ...form, custom_price: value });
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Ex: 2.50"
                    className="mt-1.5"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-3 border border-slate-200 rounded-lg p-4">
              <Label>Prix de vente conseillé (TTC)</Label>
              <RadioGroup
                value={form.recommended_sale_price_type}
                onValueChange={(val) => {
                  if (val === 'default' || val === 'custom') {
                    setForm({ ...form, recommended_sale_price_type: val });
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="bl-edit-recommended-default" />
                  <Label
                    htmlFor="bl-edit-recommended-default"
                    className="font-normal cursor-pointer"
                  >
                    Utiliser le prix par défaut
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="bl-edit-recommended-custom" />
                  <Label
                    htmlFor="bl-edit-recommended-custom"
                    className="font-normal cursor-pointer"
                  >
                    Utiliser un prix spécifique
                  </Label>
                </div>
              </RadioGroup>

              {form.recommended_sale_price_type === 'custom' && (
                <div className="pt-2">
                  <Label htmlFor="bl-edit-custom-recommended">Prix personnalisé (€)</Label>
                  <Input
                    id="bl-edit-custom-recommended"
                    type="text"
                    inputMode="decimal"
                    value={form.custom_recommended_sale_price}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setForm({ ...form, custom_recommended_sale_price: value });
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Ex: 4.90"
                    className="mt-1.5"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
