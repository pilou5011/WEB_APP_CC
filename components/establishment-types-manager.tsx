'use client';

import { useState } from 'react';
import { EstablishmentType, supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface EstablishmentTypesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: EstablishmentType[];
  onTypesUpdated: () => void;
}

export function EstablishmentTypesManager({
  open,
  onOpenChange,
  types,
  onTypesUpdated
}: EstablishmentTypesManagerProps) {
  const [editingType, setEditingType] = useState<EstablishmentType | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingType, setDeletingType] = useState<EstablishmentType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEditClick = (type: EstablishmentType) => {
    setEditingType(type);
    setEditName(type.name);
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editingType || !editName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('establishment_types')
        .update({ name: editName.trim() })
        .eq('id', editingType.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce nom existe déjà');
        } else {
          throw error;
        }
        setSubmitting(false);
        return;
      }

      toast.success('Type modifié avec succès');
      setEditingType(null);
      setEditName('');
      onTypesUpdated();
    } catch (error) {
      console.error('Error updating type:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (type: EstablishmentType) => {
    setDeletingType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('establishment_types')
        .delete()
        .eq('id', deletingType.id);

      if (error) throw error;

      toast.success('Type supprimé avec succès');
      setDeleteDialogOpen(false);
      setDeletingType(null);
      onTypesUpdated();
    } catch (error) {
      console.error('Error deleting type:', error);
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
              Gérer les types d'établissement
            </DialogTitle>
            <DialogDescription>
              Modifiez ou supprimez les types d'établissement existants
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {types.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucun type d'établissement créé
              </p>
            ) : (
              types.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-white"
                >
                  {editingType?.id === type.id ? (
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
                      <span className="flex-1 font-medium">{type.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditClick(type)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteClick(type)}
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
            <AlertDialogTitle>Supprimer ce type d'établissement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le type "{deletingType?.name}" ?
              Les clients utilisant ce type ne seront pas supprimés, mais leur type sera réinitialisé.
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


