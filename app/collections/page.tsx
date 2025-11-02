'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Collection } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Package, Euro, Edit, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    recommended_sale_price: '',
    barcode: ''
  });
  const [hasSubProducts, setHasSubProducts] = useState(false);
  const [subProducts, setSubProducts] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubProductIndex, setDeleteSubProductIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Erreur lors du chargement des collections');
    } finally {
      setLoading(false);
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

      const { data, error } = await supabase
        .from('collections')
        .insert([{
          name: formData.name,
          price: price,
          recommended_sale_price: recommendedSalePrice,
          barcode: formData.barcode || null
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
            name: name.trim()
          }));

          const { error: subProductsError } = await supabase
            .from('sub_products')
            .insert(subProductsToInsert);

          if (subProductsError) throw subProductsError;
        }
      }

      toast.success('Collection ajoutée avec succès');
      setCollections([data, ...collections]);
      setDialogOpen(false);
      setFormData({ name: '', price: '', recommended_sale_price: '', barcode: '' });
      setHasSubProducts(false);
      setSubProducts(['']);
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
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="shadow-lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Ajouter une collection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Nouvelle collection</DialogTitle>
                    <DialogDescription>
                      Ajoutez une nouvelle collection de cartes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
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

                    <div className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-sub-products"
                          checked={hasSubProducts}
                          onCheckedChange={(checked) => {
                            setHasSubProducts(checked === true);
                            if (checked === false) {
                              setSubProducts(['']);
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
                                value={subProduct}
                                onChange={(e) => {
                                  const newSubProducts = [...subProducts];
                                  newSubProducts[index] = e.target.value;
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
                            onClick={() => setSubProducts([...subProducts, ''])}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter un sous-produit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Ajout en cours...' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
        ) : collections.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">Aucune collection</p>
              <p className="text-slate-500 text-sm">
                Commencez par ajouter votre première collection
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200 relative group"
                onClick={() => router.push(`/collections/${collection.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{collection.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-2">
                        <Euro className="h-4 w-4" />
                        <span>{collection.price.toFixed(2)} €</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/collections/${collection.id}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-slate-500">
                    <span>
                      Créée le {new Date(collection.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span>
                      Modifiée le {new Date(collection.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

