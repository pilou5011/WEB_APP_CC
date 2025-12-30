'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Collection, CollectionCategory, CollectionSubcategory } from '@/lib/supabase';
import { getCurrentUserCompanyId } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Euro, Edit, X, Search, Settings, Filter, Check, ChevronsUpDown, Tag, Trash2, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CategoriesManager } from '@/components/categories-manager';

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [subcategoryFilterOpen, setSubcategoryFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    recommended_sale_price: '',
    barcode: '',
    category_id: '',
    subcategory_id: ''
  });
  const [hasSubProducts, setHasSubProducts] = useState(false);
  const [subProducts, setSubProducts] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubProductIndex, setDeleteSubProductIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CollectionSubcategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [addingNewSubcategory, setAddingNewSubcategory] = useState(false);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CollectionCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<CollectionSubcategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<CollectionCategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<CollectionSubcategory | null>(null);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deleteSubcategoryDialogOpen, setDeleteSubcategoryDialogOpen] = useState(false);

  useEffect(() => {
    loadCollections();
    loadCategories();
    loadSubcategories();
  }, []);

  const loadCategories = async () => {
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data, error } = await supabase
        .from('collection_categories')
        .select('*')
        .eq('company_id', companyId)
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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data, error } = await supabase
        .from('collection_subcategories')
        .select('*')
        .eq('company_id', companyId)
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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une catégorie avec le même nom existe déjà (non supprimée)
      const { data: existing } = await supabase
        .from('collection_categories')
        .select('id')
        .eq('name', newCategoryName.trim())
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        toast.error('Cette catégorie existe déjà');
        setAddingNewCategory(false);
        return;
      }

      const { data, error } = await supabase
        .from('collection_categories')
        .insert([{ name: newCategoryName.trim(), company_id: companyId }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)));
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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une sous-catégorie avec le même nom existe déjà pour cette catégorie (non supprimée)
      const { data: existing } = await supabase
        .from('collection_subcategories')
        .select('id')
        .eq('category_id', formData.category_id)
        .eq('name', newSubcategoryName.trim())
        .eq('company_id', companyId)
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
          company_id: companyId,
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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une autre catégorie avec le même nom existe déjà (non supprimée)
      if (editCategoryName.trim() !== editingCategory.name) {
        const { data: existing } = await supabase
          .from('collection_categories')
          .select('id')
          .eq('name', editCategoryName.trim())
          .eq('company_id', companyId)
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
        .eq('id', editingCategory.id)
        .eq('company_id', companyId);

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

    setDeletingCategory(true);
    try {
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('collection_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingCategory.id)
        .eq('company_id', companyId);

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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      // Vérifier si une autre sous-catégorie avec le même nom existe déjà pour cette catégorie (non supprimée)
      if (editSubcategoryName.trim() !== editingSubcategory.name) {
        const { data: existing } = await supabase
          .from('collection_subcategories')
          .select('id')
          .eq('category_id', editingSubcategory.category_id)
          .eq('name', editSubcategoryName.trim())
          .eq('company_id', companyId)
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
        .eq('id', editingSubcategory.id)
        .eq('company_id', companyId);

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
      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { error } = await supabase
        .from('collection_subcategories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingSubcategory.id)
        .eq('company_id', companyId);

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

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Erreur lors du chargement des collections');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer et trier les collections
  useEffect(() => {
    let filtered: Collection[] = [...collections];

    // Filtrage par recherche textuelle
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(collection => {
        return (
          collection.name.toLowerCase().includes(searchLower) ||
          collection.barcode?.toLowerCase().includes(searchLower) ||
          collection.price.toString().includes(searchLower) ||
          collection.recommended_sale_price?.toString().includes(searchLower)
        );
      });
    }

    // Filtrage par catégorie
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(collection => {
        return collection.category_id && selectedCategories.includes(collection.category_id);
      });
    }

    // Filtrage par sous-catégorie
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(collection => {
        return collection.subcategory_id && selectedSubcategories.includes(collection.subcategory_id);
      });
    }

    // Trier par ordre alphabétique (déjà trié depuis la base, mais on s'assure)
    const sorted = [...filtered];
    sorted.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    setFilteredCollections(sorted);
  }, [collections, searchTerm, selectedCategories, selectedSubcategories]);

  // Grouper les collections par catégorie
  const collectionsByCategory = () => {
    const grouped: Record<string, Collection[]> = {};
    const noCategory: Collection[] = [];
    
    filteredCollections.forEach(collection => {
      const categoryId = collection.category_id;
      if (categoryId) {
        if (!grouped[categoryId]) {
          grouped[categoryId] = [];
        }
        grouped[categoryId].push(collection);
      } else {
        noCategory.push(collection);
      }
    });

    // Trier les catégories par nom
    const sortedCategoryIds = Object.keys(grouped).sort((a, b) => {
      const categoryA = categories.find(c => c.id === a);
      const categoryB = categories.find(c => c.id === b);
      if (!categoryA || !categoryB) return 0;
      return categoryA.name.localeCompare(categoryB.name);
    });

    // Créer un objet ordonné avec les catégories triées
    const ordered: Record<string, Collection[]> = {};
    sortedCategoryIds.forEach(categoryId => {
      ordered[categoryId] = grouped[categoryId];
    });

    // Ajouter les collections sans catégorie à la fin
    if (noCategory.length > 0) {
      ordered['no-category'] = noCategory;
    }

    return ordered;
  };

  // Obtenir les sous-catégories disponibles pour les catégories sélectionnées
  const availableSubcategories = () => {
    if (selectedCategories.length === 0) {
      return subcategories;
    }
    return subcategories.filter(sub => selectedCategories.includes(sub.category_id));
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

      // Validation du code barre s'il est renseigné
      if (formData.barcode && !/^\d{13}$/.test(formData.barcode)) {
        toast.error('Le code barre doit contenir exactement 13 chiffres');
        setSubmitting(false);
        return;
      }

      const recommendedSalePrice = formData.recommended_sale_price ? parseFloat(formData.recommended_sale_price) : null;
      if (recommendedSalePrice !== null && (isNaN(recommendedSalePrice) || recommendedSalePrice < 0)) {
        toast.error('Le prix de vente conseillé doit être un nombre positif');
        setSubmitting(false);
        return;
      }

      const companyId = await getCurrentUserCompanyId();
      if (!companyId) {
        throw new Error('Non autorisé');
      }

      const { data, error } = await supabase
        .from('collections')
        .insert([{
          name: formData.name,
          company_id: companyId,
          price: price,
          recommended_sale_price: recommendedSalePrice,
          barcode: formData.barcode || null,
          category_id: formData.category_id || null,
          subcategory_id: formData.subcategory_id || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Create sub-products if hasSubProducts is true
      if (hasSubProducts && subProducts.length > 0) {
        const validSubProducts = subProducts.filter(sp => sp.trim() !== '');
        if (validSubProducts.length > 0) {
          const subProductsToInsert = validSubProducts.map(name => ({
            collection_id: data.id,
            company_id: companyId,
            name: name.trim()
          }));

          const { error: subProductsError } = await supabase
            .from('sub_products')
            .insert(subProductsToInsert);

          if (subProductsError) throw subProductsError;
        }
      }

      toast.success('Collection ajoutée avec succès');
      await loadCollections();
      setDialogOpen(false);
      setFormData({ name: '', price: '', recommended_sale_price: '', barcode: '', category_id: '', subcategory_id: '' });
      setHasSubProducts(false);
      setSubProducts(['']);
      setShowNewCategoryInput(false);
      setShowNewSubcategoryInput(false);
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Erreur lors de la création de la collection');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestion des Collections</h1>
            <p className="text-slate-600">Collections de cartes de vœux</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="shadow-lg"
            >
              Retour à l'accueil
            </Button>
            
            <Button 
              size="lg" 
              className="shadow-lg"
              onClick={() => router.push('/collections/new')}
            >
              <Plus className="mr-2 h-5 w-5" />
              Ajouter une collection
            </Button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom, code barre, prix..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Filtres par catégorie et sous-catégorie */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtre par catégorie */}
            <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedCategories.length === 0
                        ? 'Catégorie'
                        : selectedCategories.length === 1
                        ? categories.find(c => c.id === selectedCategories[0])?.name || 'Catégorie'
                        : `${selectedCategories.length} catégories`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher une catégorie..." />
                  <CommandList>
                    <CommandEmpty>Aucune catégorie trouvée.</CommandEmpty>
                    <CommandGroup>
                      {categories.map((category) => {
                        const isSelected = selectedCategories.includes(category.id);
                        return (
                          <CommandItem
                            key={category.id}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedCategories(selectedCategories.filter((c) => c !== category.id));
                                // Retirer aussi les sous-catégories de cette catégorie
                                const subcatsToRemove = subcategories
                                  .filter(sub => sub.category_id === category.id)
                                  .map(sub => sub.id);
                                setSelectedSubcategories(selectedSubcategories.filter(sub => !subcatsToRemove.includes(sub)));
                              } else {
                                setSelectedCategories([...selectedCategories, category.id]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des catégories sélectionnées */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map((categoryId) => {
                  const category = categories.find(c => c.id === categoryId);
                  if (!category) return null;
                  return (
                    <Badge
                      key={categoryId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {category.name}
                      <button
                        onClick={() => {
                          setSelectedCategories(selectedCategories.filter((c) => c !== categoryId));
                          // Retirer aussi les sous-catégories de cette catégorie
                          const subcatsToRemove = subcategories
                            .filter(sub => sub.category_id === categoryId)
                            .map(sub => sub.id);
                          setSelectedSubcategories(selectedSubcategories.filter(sub => !subcatsToRemove.includes(sub)));
                        }}
                        className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Filtre par sous-catégorie */}
            <Popover open={subcategoryFilterOpen} onOpenChange={setSubcategoryFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={subcategoryFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedSubcategories.length === 0
                        ? 'Sous-catégorie'
                        : selectedSubcategories.length === 1
                        ? subcategories.find(s => s.id === selectedSubcategories[0])?.name || 'Sous-catégorie'
                        : `${selectedSubcategories.length} sous-catégories`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher une sous-catégorie..." />
                  <CommandList>
                    <CommandEmpty>Aucune sous-catégorie trouvée.</CommandEmpty>
                    <CommandGroup>
                      {availableSubcategories().map((subcategory) => {
                        const isSelected = selectedSubcategories.includes(subcategory.id);
                        const category = categories.find(c => c.id === subcategory.category_id);
                        return (
                          <CommandItem
                            key={subcategory.id}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategory.id));
                              } else {
                                setSelectedSubcategories([...selectedSubcategories, subcategory.id]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="text-sm">
                              {category ? `${category.name} - ` : ''}{subcategory.name}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des sous-catégories sélectionnées */}
            {selectedSubcategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedSubcategories.map((subcategoryId) => {
                  const subcategory = subcategories.find(s => s.id === subcategoryId);
                  if (!subcategory) return null;
                  const category = categories.find(c => c.id === subcategory.category_id);
                  return (
                    <Badge
                      key={subcategoryId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {category ? `${category.name} - ` : ''}{subcategory.name}
                      <button
                        onClick={() => {
                          setSelectedSubcategories(selectedSubcategories.filter((s) => s !== subcategoryId));
                        }}
                        className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Bouton pour réinitialiser les filtres */}
            {(selectedCategories.length > 0 || selectedSubcategories.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                }}
                className="text-xs"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          {/* Compteur de résultats */}
          {(searchTerm || selectedCategories.length > 0 || selectedSubcategories.length > 0) && (
            <p className="text-sm text-slate-600">
              {filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''} trouvée{filteredCollections.length !== 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
            </p>
          )}
        </div>

        {/* Categories Manager */}
        <CategoriesManager
          open={manageCategoriesDialogOpen}
          onOpenChange={setManageCategoriesDialogOpen}
          categories={categories}
          subcategories={subcategories}
          onCategoriesUpdated={() => {
            loadCategories();
            loadSubcategories();
          }}
        />

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
                Êtes-vous sûr de vouloir supprimer le sous-produit "{subProducts[deleteSubProductIndex || 0] || 'sans nom'}" ? Cette action ne peut pas être annulée.
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCollections.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">
                {searchTerm ? 'Aucune collection trouvée' : 'Aucune collection'}
              </p>
              <p className="text-slate-500 text-sm">
                {searchTerm 
                  ? `Aucun résultat pour "${searchTerm}". Essayez un autre terme de recherche.`
                  : 'Commencez par ajouter votre première collection'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(collectionsByCategory()).map(([categoryId, categoryCollections]) => {
              const category = categoryId === 'no-category' ? null : categories.find(c => c.id === categoryId);
              return (
                <div key={categoryId} className="space-y-2">
                  <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-slate-600" />
                    {category ? category.name : 'Sans catégorie'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {categoryCollections.map((collection) => {
                      const collectionSubcategory = collection.subcategory_id 
                        ? subcategories.find(s => s.id === collection.subcategory_id)
                        : null;
                      return (
                        <Card
                          key={collection.id}
                          className="hover:shadow-md transition-all duration-200 border-slate-200 cursor-pointer"
                          onClick={() => router.push(`/collections/${collection.id}`)}
                        >
                          <CardHeader className="pb-2 pt-3 px-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-semibold leading-tight mb-1.5">
                                  {collection.name}
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  <span>{collection.price.toFixed(2)} €</span>
                                  {collection.recommended_sale_price && (
                                    <span className="text-slate-400">
                                      • Conseillé: {collection.recommended_sale_price.toFixed(2)} €
                                    </span>
                                  )}
                                </CardDescription>
                                {collectionSubcategory && (
                                  <p className="text-xs text-slate-400 mt-1">
                                    {collectionSubcategory.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

