'use client';

import { useState } from 'react';
import { PaymentMethod, supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethodsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: PaymentMethod[];
  onMethodsUpdated: () => void;
}

export function PaymentMethodsManager({
  open,
  onOpenChange,
  methods,
  onMethodsUpdated
}: PaymentMethodsManagerProps) {
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEditClick = (method: PaymentMethod) => {
    setEditingMethod(method);
    setEditName(method.name);
  };

  const handleCancelEdit = () => {
    setEditingMethod(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editingMethod || !editName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    try {
      // Vérifier si une autre méthode avec le même nom existe déjà (non supprimée)
      if (editName.trim() !== editingMethod.name) {
        const { data: existing } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('name', editName.trim())
          .is('deleted_at', null)
          .neq('id', editingMethod.id)
          .maybeSingle();

        if (existing) {
          toast.error('Ce nom existe déjà');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('payment_methods')
        .update({ name: editName.trim() })
        .eq('id', editingMethod.id);

      if (error) {
        throw error;
      }

      toast.success('Méthode de paiement modifiée avec succès');
      setEditingMethod(null);
      setEditName('');
      onMethodsUpdated();
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (method: PaymentMethod) => {
    setDeletingMethod(method);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMethod) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingMethod.id);

      if (error) throw error;

      toast.success('Méthode de paiement supprimée avec succès');
      setDeleteDialogOpen(false);
      setDeletingMethod(null);
      onMethodsUpdated();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gérer les méthodes de paiement
            </DialogTitle>
            <DialogDescription>
              Modifiez ou supprimez les méthodes de paiement existantes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {methods.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucune méthode de paiement créée
              </p>
            ) : (
              methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-white"
                >
                  {editingMethod?.id === method.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={submitting}
                      >
                        {submitting ? '...' : 'Enregistrer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={submitting}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{method.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClick(method)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(method)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette méthode de paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la méthode "{deletingMethod?.name}" ?
              Les clients utilisant cette méthode ne seront pas supprimés, mais leur méthode de paiement sera réinitialisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

