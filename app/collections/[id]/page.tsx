'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, Collection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Euro, Package, Edit, Trash2, Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SubProduct } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [existingSubProducts, setExistingSubProducts] = useState<SubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    recommended_sale_price: '',
    barcode: ''
  });
  const [hasSubProducts, setHasSubProducts] = useState(false);
  const [subProducts, setSubProducts] = useState<{ id: string | null; name: string }[]>([]);
  const [deleteSubProductIndex, setDeleteSubProductIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCollectionData();
  }, [collectionId]);

  const loadCollectionData = async () => {
    try {
      const { data: collectionData, error: collectionError } = await supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) throw collectionError;

      if (!collectionData) {
        toast.error('Collection non trouvée');
        router.push('/collections');
        return;
      }

      setCollection(collectionData);
      setFormData({
        name: collectionData.name,
        price: collectionData.price.toString(),
        recommended_sale_price: collectionData.recommended_sale_price?.toString() || '',
        barcode: collectionData.barcode || ''
      });

      // Load sub-products
      const { data: subProductsData, error: subProductsError } = await supabase
        .from('sub_products')
        .select('*')
        .eq('collection_id', collectionId)
        .order('created_at', { ascending: true });

      if (subProductsError) throw subProductsError;
      
      if (subProductsData && subProductsData.length > 0) {
        setExistingSubProducts(subProductsData);
        setHasSubProducts(true);
        setSubProducts(subProductsData.map(sp => ({ id: sp.id, name: sp.name })));
      } else {
        setHasSubProducts(false);
        setSubProducts([{ id: null, name: '' }]);
      }
    } catch (error) {
      console.error('Error loading collection data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collection) return;
    
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

      const { error } = await supabase
        .from('collections')
        .update({
          name: formData.name,
          price: price,
          recommended_sale_price: recommendedSalePrice,
          barcode: formData.barcode || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId);

      if (error) throw error;

      // Handle sub-products
      if (hasSubProducts) {
        const validSubProducts = subProducts.filter(sp => sp.name.trim() !== '');
        
        // Get existing IDs
        const existingIds = existingSubProducts.map(sp => sp.id);
        const currentIds = validSubProducts.filter(sp => sp.id !== null).map(sp => sp.id as string);
        
        // Delete removed sub-products
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('sub_products')
            .delete()
            .in('id', toDelete);
          if (deleteError) throw deleteError;
        }

        // Update or insert sub-products
        for (const sp of validSubProducts) {
          if (sp.id) {
            // Update existing
            const { error: updateError } = await supabase
              .from('sub_products')
              .update({
                name: sp.name.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('id', sp.id);
            if (updateError) throw updateError;
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('sub_products')
              .insert({
                collection_id: collectionId,
                name: sp.name.trim()
              });
            if (insertError) throw insertError;
          }
        }
      } else {
        // Remove all sub-products if hasSubProducts is false
        if (existingSubProducts.length > 0) {
          const { error: deleteError } = await supabase
            .from('sub_products')
            .delete()
            .eq('collection_id', collectionId);
          if (deleteError) throw deleteError;
        }
      }

      toast.success('Collection modifiée avec succès');
      await loadCollectionData();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Erreur lors de la modification de la collection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);

      if (error) throw error;

      toast.success('Collection supprimée avec succès');
      router.push('/collections');
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Erreur lors de la suppression de la collection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl">{collection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-2 text-base">
                    <Euro className="h-5 w-5" />
                    <span>{collection.price.toFixed(2)} €</span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action ne peut pas être annulée. Cela supprimera définitivement la collection "{collection.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Euro className="h-5 w-5" />
                    <span className="text-sm font-medium">Prix de cession (HT)</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{collection.price.toFixed(2)} €</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Package className="h-5 w-5" />
                    <span className="text-sm font-medium">Date de création</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {new Date(collection.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle>Modifier la collection</CardTitle>
              <CardDescription>
                Modifiez les informations de la collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la collection</Label>
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
                    <Label htmlFor="price">Prix de cession (HT)</Label>
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
                </div>

                <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-sub-products-edit"
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
                    <Label htmlFor="has-sub-products-edit" className="font-normal cursor-pointer">
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

                <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                  {submitting ? 'Modification en cours...' : 'Modifier la collection'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

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

