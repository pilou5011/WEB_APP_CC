'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, CollectionCategory, CollectionSubcategory } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Euro, Package, Plus, X, Pencil, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function NewCollectionPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    recommended_sale_price: '',
    barcode: '',
    category_id: '',
    subcategory_id: ''
  });
  const [hasSubProducts, setHasSubProducts] = useState(false);
  const [subProducts, setSubProducts] = useState<{ id: string | null; name: string }[]>([]);
  const [deleteSubProductIndex, setDeleteSubProductIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CollectionSubcategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [addingNewSubcategory, setAddingNewSubcategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CollectionCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<CollectionSubcategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<CollectionCategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<CollectionSubcategory | null>(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deleteSubcategoryDialogOpen, setDeleteSubcategoryDialogOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadSubcategories();
    // Initialize with one empty sub-product if hasSubProducts is checked
    setSubProducts([{ id: null, name: '' }]);
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_categories')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_subcategories')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId);
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Veuillez saisir un nom de catégorie');
      return;
    }

    setAddingNewCategory(true);
    try {
      // Vérifier si une catégorie avec le même nom existe déjà (non supprimée)
      const { data: existing } = await supabase
        .from('collection_categories')
        .select('id')
        .eq('name', newCategoryName.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Cette catégorie existe déjà');
        setAddingNewCategory(false);
        return;
      }

      const { data, error } = await supabase
        .from('collection_categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      await loadCategories();
      setFormData({ ...formData, category_id: data.id, subcategory_id: '' });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      toast.success('Catégorie ajoutée');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Erreur lors de l\'ajout de la catégorie');
    } finally {
      setAddingNewCategory(false);
    }
  };

  const handleAddNewSubcategory = async () => {
    if (!newSubcategoryName.trim() || !formData.category_id) {
      toast.error('Veuillez sélectionner une catégorie et saisir un nom de sous-catégorie');
      return;
    }

    setAddingNewSubcategory(true);
    try {
      // Vérifier si une sous-catégorie avec le même nom existe déjà pour cette catégorie (non supprimée)
      const { data: existing } = await supabase
        .from('collection_subcategories')
        .select('id')
        .eq('category_id', formData.category_id)
        .eq('name', newSubcategoryName.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Cette sous-catégorie existe déjà pour cette catégorie');
        setAddingNewSubcategory(false);
        return;
      }

      const { data, error } = await supabase
        .from('collection_subcategories')
        .insert([{ 
          category_id: formData.category_id,
          name: newSubcategoryName.trim() 
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      await loadSubcategories();
      setFormData({ ...formData, subcategory_id: data.id });
      setNewSubcategoryName('');
      setShowNewSubcategoryInput(false);
      toast.success('Sous-catégorie ajoutée');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast.error('Erreur lors de l\'ajout de la sous-catégorie');
    } finally {
      setAddingNewSubcategory(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    try {
      // Vérifier si une autre catégorie avec le même nom existe déjà (non supprimée)
      if (editCategoryName.trim() !== editingCategory.name) {
        const { data: existing } = await supabase
          .from('collection_categories')
          .select('id')
          .eq('name', editCategoryName.trim())
          .is('deleted_at', null)
          .neq('id', editingCategory.id)
          .maybeSingle();

        if (existing) {
          toast.error('Ce nom existe déjà');
          return;
        }
      }

      const { error } = await supabase
        .from('collection_categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id);

      if (error) {
        throw error;
      }

      toast.success('Catégorie modifiée avec succès');
      await loadCategories();
      setEditingCategory(null);
      setEditCategoryName('');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const { error } = await supabase
        .from('collection_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingCategory.id);

      if (error) throw error;

      toast.success('Catégorie supprimée avec succès');
      await loadCategories();
      if (formData.category_id === deletingCategory.id) {
        setFormData({ ...formData, category_id: '', subcategory_id: '' });
      }
      setDeleteCategoryDialogOpen(false);
      setDeletingCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory || !editSubcategoryName.trim()) {
      toast.error('Le nom ne peut pas être vide');
      return;
    }

    try {
      // Vérifier si une autre sous-catégorie avec le même nom existe déjà pour cette catégorie (non supprimée)
      if (editSubcategoryName.trim() !== editingSubcategory.name) {
        const { data: existing } = await supabase
          .from('collection_subcategories')
          .select('id')
          .eq('category_id', editingSubcategory.category_id)
          .eq('name', editSubcategoryName.trim())
          .is('deleted_at', null)
          .neq('id', editingSubcategory.id)
          .maybeSingle();

        if (existing) {
          toast.error('Cette sous-catégorie existe déjà pour cette catégorie');
          return;
        }
      }

      const { error } = await supabase
        .from('collection_subcategories')
        .update({ name: editSubcategoryName.trim() })
        .eq('id', editingSubcategory.id);

      if (error) {
        throw error;
      }

      toast.success('Sous-catégorie modifiée avec succès');
      await loadSubcategories();
      setEditingSubcategory(null);
      setEditSubcategoryName('');
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;

    try {
      const { error } = await supabase
        .from('collection_subcategories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingSubcategory.id);

      if (error) throw error;

      toast.success('Sous-catégorie supprimée avec succès');
      await loadSubcategories();
      if (formData.subcategory_id === deletingSubcategory.id) {
        setFormData({ ...formData, subcategory_id: '' });
      }
      setDeleteSubcategoryDialogOpen(false);
      setDeletingSubcategory(null);
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const price = parseFloat(formData.price);

      if (isNaN(price) || price < 0) {
        toast.error('Le prix doit être un nombre positif');
        setSubmitting(false);
        return;
      }

      const recommendedSalePrice = formData.recommended_sale_price ? parseFloat(formData.recommended_sale_price) : null;
      if (recommendedSalePrice !== null && (isNaN(recommendedSalePrice) || recommendedSalePrice < 0)) {
        toast.error('Le prix de vente conseillé doit être un nombre positif');
        setSubmitting(false);
        return;
      }

      // Validation du code barre s'il est renseigné
      if (formData.barcode && !/^\d{13}$/.test(formData.barcode)) {
        toast.error('Le code barre doit contenir exactement 13 chiffres');
        setSubmitting(false);
        return;
      }

      // Vérifier si une collection avec le même nom existe déjà
      const { data: existingCollection, error: checkError } = await supabase
        .from('collections')
        .select('id, name')
        .eq('name', formData.name.trim())
        .is('deleted_at', null)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCollection) {
        toast.error(`Une collection avec le nom "${formData.name.trim()}" existe déjà. Les noms de collections doivent être uniques.`);
        setSubmitting(false);
        return;
      }

      // Create collection
      const { data: newCollection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          name: formData.name.trim(),
          price: price,
          recommended_sale_price: recommendedSalePrice,
          barcode: formData.barcode || null,
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null
        })
        .select()
        .single();

      if (collectionError) {
        // Vérifier si l'erreur est due à un nom dupliqué (contrainte unique en base)
        if (collectionError.code === '23505') {
          toast.error(`Une collection avec le nom "${formData.name.trim()}" existe déjà. Les noms de collections doivent être uniques.`);
        } else {
          throw collectionError;
        }
        setSubmitting(false);
        return;
      }

      // Handle sub-products if hasSubProducts is true
      if (hasSubProducts && newCollection) {
        const validSubProducts = subProducts.filter(sp => sp.name.trim() !== '');
        
        if (validSubProducts.length > 0) {
          const subProductsToInsert = validSubProducts.map(sp => ({
            collection_id: newCollection.id,
            name: sp.name.trim()
          }));

          const { error: subProductsError } = await supabase
            .from('sub_products')
            .insert(subProductsToInsert);

          if (subProductsError) throw subProductsError;
        }
      }

      toast.success('Collection créée avec succès');
      router.push(`/collections/${newCollection.id}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Erreur lors de la création de la collection');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/collections')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux collections
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
          >
            Retour à l'accueil
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-3xl">Créer une nouvelle collection</CardTitle>
              <CardDescription>
                Renseignez les informations de la nouvelle collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la collection *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Ex: Collection Hiver 2024"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Prix de cession (HT) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="Ex: 2.50"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="recommended_sale_price">Prix de vente conseillé (TTC)</Label>
                    <Input
                      id="recommended_sale_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.recommended_sale_price}
                      onChange={(e) => setFormData({ ...formData, recommended_sale_price: e.target.value })}
                      placeholder="Ex: 3.00"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">Optionnel</p>
                  </div>

                  <div>
                    <Label htmlFor="barcode">Code Barre Produit (optionnel)</Label>
                    <Input
                      id="barcode"
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      value={formData.barcode}
                      onChange={(e) => {
                        const value = e.target.value;
                        // N'accepter que les chiffres
                        if (value === '' || /^\d+$/.test(value)) {
                          setFormData({ ...formData, barcode: value });
                        }
                      }}
                      placeholder="13 chiffres (Ex: 3254560001234)"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">Exactement 13 chiffres</p>
                  </div>

                  {/* Catégorie */}
                  <div>
                    <Label htmlFor="category">Catégorie (optionnel)</Label>
                    {!showNewCategoryInput && !editingCategory ? (
                      <div className="flex gap-2 mt-1.5">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="flex-1 justify-between"
                            >
                              {formData.category_id
                                ? categories.find(c => c.id === formData.category_id)?.name
                                : 'Sélectionner une catégorie...'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Rechercher une catégorie..." />
                              <CommandList>
                                {categories.length === 0 ? (
                                  <CommandEmpty>
                                    <div className="py-6 text-center text-sm text-slate-400">
                                      Liste vide, veuillez ajouter un élément
                                    </div>
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {categories.map((category) => (
                                      <div key={category.id} className="flex items-center group">
                                        <CommandItem
                                          value={category.id}
                                          onSelect={() => {
                                            setFormData({ ...formData, category_id: category.id, subcategory_id: '' });
                                            setShowNewSubcategoryInput(false);
                                          }}
                                          className="flex-1"
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              formData.category_id === category.id ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {category.name}
                                        </CommandItem>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCategory(category);
                                            setEditCategoryName(category.name);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingCategory(category);
                                            setDeleteCategoryDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewCategoryInput(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : editingCategory ? (
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleEditCategory();
                            } else if (e.key === 'Escape') {
                              setEditingCategory(null);
                              setEditCategoryName('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleEditCategory}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(null);
                            setEditCategoryName('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          placeholder="Nouvelle catégorie..."
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewCategory();
                            } else if (e.key === 'Escape') {
                              setShowNewCategoryInput(false);
                              setNewCategoryName('');
                            }
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          onClick={handleAddNewCategory}
                          disabled={addingNewCategory}
                        >
                          {addingNewCategory ? '...' : 'Ajouter'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Sous-catégorie */}
                  {formData.category_id && (
                    <div>
                      <Label htmlFor="subcategory">Sous-catégorie (optionnel)</Label>
                      {!showNewSubcategoryInput && !editingSubcategory ? (
                        <div className="flex gap-2 mt-1.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="flex-1 justify-between"
                              >
                                {formData.subcategory_id
                                  ? getSubcategoriesForCategory(formData.category_id).find(s => s.id === formData.subcategory_id)?.name
                                  : 'Sélectionner une sous-catégorie...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Rechercher une sous-catégorie..." />
                                <CommandList>
                                  {getSubcategoriesForCategory(formData.category_id).length === 0 ? (
                                    <CommandEmpty>
                                      <div className="py-6 text-center text-sm text-slate-400">
                                        Liste vide, veuillez ajouter un élément
                                      </div>
                                    </CommandEmpty>
                                  ) : (
                                    <CommandGroup>
                                      {getSubcategoriesForCategory(formData.category_id).map((subcategory) => (
                                        <div key={subcategory.id} className="flex items-center group">
                                          <CommandItem
                                            value={subcategory.id}
                                            onSelect={() => {
                                              setFormData({ ...formData, subcategory_id: subcategory.id });
                                            }}
                                            className="flex-1"
                                          >
                                            <Check
                                              className={cn(
                                                'mr-2 h-4 w-4',
                                                formData.subcategory_id === subcategory.id ? 'opacity-100' : 'opacity-0'
                                              )}
                                            />
                                            {subcategory.name}
                                          </CommandItem>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingSubcategory(subcategory);
                                              setEditSubcategoryName(subcategory.name);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeletingSubcategory(subcategory);
                                              setDeleteSubcategoryDialogOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewSubcategoryInput(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : editingSubcategory ? (
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            value={editSubcategoryName}
                            onChange={(e) => setEditSubcategoryName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEditSubcategory();
                              } else if (e.key === 'Escape') {
                                setEditingSubcategory(null);
                                setEditSubcategoryName('');
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleEditSubcategory}
                          >
                            Enregistrer
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingSubcategory(null);
                              setEditSubcategoryName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1.5">
                          <Input
                            placeholder="Nouvelle sous-catégorie..."
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewSubcategory();
                              } else if (e.key === 'Escape') {
                                setShowNewSubcategoryInput(false);
                                setNewSubcategoryName('');
                              }
                            }}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            onClick={handleAddNewSubcategory}
                            disabled={addingNewSubcategory}
                          >
                            {addingNewSubcategory ? '...' : 'Ajouter'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowNewSubcategoryInput(false);
                              setNewSubcategoryName('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-sub-products"
                      checked={hasSubProducts}
                      onCheckedChange={(checked) => {
                        setHasSubProducts(checked === true);
                        if (checked === false) {
                          setSubProducts([{ id: null, name: '' }]);
                        } else if (subProducts.length === 0 || (subProducts.length === 1 && subProducts[0].name === '')) {
                          setSubProducts([{ id: null, name: '' }]);
                        }
                      }}
                    />
                    <Label htmlFor="has-sub-products" className="font-normal cursor-pointer">
                      Cette collection contient des sous-produits
                    </Label>
                  </div>

                  {hasSubProducts && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm">Sous-produits</Label>
                      {subProducts.map((subProduct, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="text"
                            value={subProduct.name}
                            onChange={(e) => {
                              const newSubProducts = [...subProducts];
                              newSubProducts[index] = { ...newSubProducts[index], name: e.target.value };
                              setSubProducts(newSubProducts);
                            }}
                            placeholder={`Nom du sous-produit ${index + 1}`}
                            className="flex-1"
                          />
                          {subProducts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteSubProductIndex(index);
                              }}
                              className="h-9 w-9 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSubProducts([...subProducts, { id: null, name: '' }])}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un sous-produit
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                    {submitting ? 'Création en cours...' : 'Créer la collection'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/collections')}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Delete Category Confirmation Dialog */}
        <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la catégorie "{deletingCategory?.name}" ?
                Toutes les sous-catégories associées seront également supprimées.
                Les collections utilisant cette catégorie ne seront pas supprimées, mais leur catégorie sera réinitialisée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCategory}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Subcategory Confirmation Dialog */}
        <AlertDialog open={deleteSubcategoryDialogOpen} onOpenChange={setDeleteSubcategoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette sous-catégorie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la sous-catégorie "{deletingSubcategory?.name}" ?
                Les collections utilisant cette sous-catégorie ne seront pas supprimées, mais leur sous-catégorie sera réinitialisée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSubcategory}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Sub-Product Confirmation Dialog */}
        <AlertDialog open={deleteSubProductIndex !== null} onOpenChange={(open) => !open && setDeleteSubProductIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le sous-produit ?</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer le sous-produit "{subProducts[deleteSubProductIndex || 0]?.name || 'sans nom'}" ? Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteSubProductIndex !== null) {
                    setSubProducts(subProducts.filter((_, i) => i !== deleteSubProductIndex));
                    setDeleteSubProductIndex(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

