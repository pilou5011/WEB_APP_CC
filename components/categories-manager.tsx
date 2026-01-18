'use client';

import { useState } from 'react';
import { ProductCategory, ProductSubcategory, supabase } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface CategoriesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  subcategories: ProductSubcategory[];
  onCategoriesUpdated: () => void;
}

export function CategoriesManager({
  open,
  onOpenChange,
  categories,
  subcategories,
  onCategoriesUpdated
}: CategoriesManagerProps) {
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  
  const [editingSubcategory, setEditingSubcategory] = useState<ProductSubcategory | null>(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [deletingSubcategory, setDeletingSubcategory] = useState<ProductSubcategory | null>(null);
  const [deleteSubcategoryDialogOpen, setDeleteSubcategoryDialogOpen] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const handleEditCategoryClick = (category: ProductCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une autre catégorie avec le même nom existe déjà (non supprimée)
      if (editCategoryName.trim() !== editingCategory.name) {
        const { data: existing } = await supabase
          .from('product_categories')
          .select('id')
          .eq('name', editCategoryName.trim())
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .neq('id', editingCategory.id)
          .maybeSingle();

        if (existing) {
          toast.error('Ce nom existe déjà');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('product_categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      toast.success('Catégorie modifiée avec succès');
      setEditingCategory(null);
      setEditCategoryName('');
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategoryClick = (category: ProductCategory) => {
    setDeletingCategory(category);
    setDeleteCategoryDialogOpen(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!deletingCategory) return;

    setSubmitting(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('product_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingCategory.id)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Catégorie supprimée avec succès');
      setDeleteCategoryDialogOpen(false);
      setDeletingCategory(null);
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubcategoryClick = (subcategory: ProductSubcategory) => {
    setEditingSubcategory(subcategory);
    setEditSubcategoryName(subcategory.name);
  };

  const handleCancelEditSubcategory = () => {
    setEditingSubcategory(null);
    setEditSubcategoryName('');
  };

  const handleSaveEditSubcategory = async () => {
    if (!editingSubcategory || !editSubcategoryName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    setSubmitting(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une autre sous-catégorie avec le même nom existe déjà pour cette catégorie (non supprimée)
      if (editSubcategoryName.trim() !== editingSubcategory.name) {
        const { data: existing } = await supabase
          .from('product_subcategories')
          .select('id')
          .eq('category_id', editingSubcategory.category_id)
          .eq('name', editSubcategoryName.trim())
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .neq('id', editingSubcategory.id)
          .maybeSingle();

        if (existing) {
          toast.error('Cette sous-catégorie existe déjà pour cette catégorie');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('product_subcategories')
        .update({ name: editSubcategoryName.trim() })
        .eq('id', editingSubcategory.id)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      toast.success('Sous-catégorie modifiée avec succès');
      setEditingSubcategory(null);
      setEditSubcategoryName('');
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubcategoryClick = (subcategory: ProductSubcategory) => {
    setDeletingSubcategory(subcategory);
    setDeleteSubcategoryDialogOpen(true);
  };

  const handleDeleteSubcategoryConfirm = async () => {
    if (!deletingSubcategory) return;

    setSubmitting(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('product_subcategories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingSubcategory.id)
        .eq('company_id', companyId);

      if (error) throw error;

      toast.success('Sous-catégorie supprimée avec succès');
      setDeleteSubcategoryDialogOpen(false);
      setDeletingSubcategory(null);
      onCategoriesUpdated();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gérer les catégories et sous-catégories
            </DialogTitle>
            <DialogDescription>
              Modifiez ou supprimez les catégories et sous-catégories existantes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Catégories */}
            <div>
              <h3 className="font-semibold mb-3">Catégories</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Aucune catégorie créée
                  </p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-white"
                    >
                      {editingCategory?.id === category.id ? (
                        <>
                          <Input
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditCategory();
                              } else if (e.key === 'Escape') {
                                handleCancelEditCategory();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveEditCategory}
                            disabled={submitting}
                          >
                            {submitting ? '...' : 'Enregistrer'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEditCategory}
                            disabled={submitting}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{category.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCategoryClick(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategoryClick(category)}
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
            </div>

            {/* Sous-catégories */}
            <div>
              <h3 className="font-semibold mb-3">Sous-catégories</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Créez d'abord une catégorie
                  </p>
                ) : (
                  categories.map((category) => {
                    const categorySubcategories = getSubcategoriesForCategory(category.id);
                    return (
                      <div key={category.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                        <div className="font-medium text-sm text-slate-700 mb-2">
                          {category.name}
                        </div>
                        {categorySubcategories.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">Aucune sous-catégorie</p>
                        ) : (
                          <div className="space-y-2">
                            {categorySubcategories.map((subcategory) => (
                              <div
                                key={subcategory.id}
                                className="flex items-center gap-2 p-2 border border-slate-200 rounded bg-white"
                              >
                                {editingSubcategory?.id === subcategory.id ? (
                                  <>
                                    <Input
                                      value={editSubcategoryName}
                                      onChange={(e) => setEditSubcategoryName(e.target.value)}
                                      className="flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEditSubcategory();
                                        } else if (e.key === 'Escape') {
                                          handleCancelEditSubcategory();
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={handleSaveEditSubcategory}
                                      disabled={submitting}
                                    >
                                      {submitting ? '...' : 'Enregistrer'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEditSubcategory}
                                      disabled={submitting}
                                    >
                                      Annuler
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="flex-1 text-sm">{subcategory.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditSubcategoryClick(subcategory)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteSubcategoryClick(subcategory)}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression de catégorie */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie "{deletingCategory?.name}" ?
              Toutes les sous-catégories associées seront également supprimées.
                Les produits utilisant cette catégorie ne seront pas supprimés, mais leur catégorie sera réinitialisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategoryConfirm}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation de suppression de sous-catégorie */}
      <AlertDialog open={deleteSubcategoryDialogOpen} onOpenChange={setDeleteSubcategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette sous-catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la sous-catégorie "{deletingSubcategory?.name}" ?
                Les produits utilisant cette sous-catégorie ne seront pas supprimés, mais leur sous-catégorie sera réinitialisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubcategoryConfirm}
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

