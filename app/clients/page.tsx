'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Client } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Package, X, Search, Check, ChevronsUpDown, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDepartment, getDepartmentFromPostalCode } from '@/lib/postal-code-utils';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [departmentFilterOpen, setDepartmentFilterOpen] = useState(false);
  const [cityFilterOpen, setCityFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  // Extraire les départements uniques depuis les clients
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    clients.forEach(client => {
      const dept = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
      if (dept) {
        deptSet.add(dept);
      }
    });
    return Array.from(deptSet).sort((a, b) => {
      // Trier numériquement si possible, sinon alphabétiquement
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [clients]);

  // Extraire les villes uniques depuis les clients
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    clients.forEach(client => {
      if (client.city) {
        citySet.add(client.city);
      }
    });
    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [clients]);


  // Filtrer et regrouper les clients par ville
  useEffect(() => {
    console.log('[FILTER] useEffect de filtrage déclenché', { 
      clientsCount: clients.length, 
      searchTerm, 
      selectedDepartments, 
      selectedCities 
    });
    
    // Créer une copie du tableau clients pour éviter de modifier l'original
    let filtered: Client[] = [...clients];
    
    // Filtrage par recherche textuelle
    if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(client => {
        return (
          client.name.toLowerCase().includes(searchLower) ||
          client.address?.toLowerCase().includes(searchLower) ||
          client.street_address?.toLowerCase().includes(searchLower) ||
          client.postal_code?.toLowerCase().includes(searchLower) ||
          client.city?.toLowerCase().includes(searchLower) ||
          client.phone?.toLowerCase().includes(searchLower) ||
          client.siret_number?.toLowerCase().includes(searchLower) ||
          client.tva_number?.toLowerCase().includes(searchLower) ||
          client.client_number?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtrage par département
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(client => {
        const dept = client.department || (client.postal_code ? getDepartmentFromPostalCode(client.postal_code) : null);
        return dept && selectedDepartments.includes(dept);
      });
    }

    // Filtrage par ville
    if (selectedCities.length > 0) {
      filtered = filtered.filter(client => {
        return client.city && selectedCities.includes(client.city);
      });
    }

    // Créer une copie pour le tri (ne pas modifier filtered directement)
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const cityA = (a.city || '').toLowerCase();
      const cityB = (b.city || '').toLowerCase();
      if (cityA !== cityB) {
        return cityA.localeCompare(cityB);
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    console.log('[FILTER] Clients filtrés:', sorted.length);
    setFilteredClients(sorted);
  }, [clients, searchTerm, selectedDepartments, selectedCities]);

  // Grouper les clients par ville
  const clientsByCity = useMemo(() => {
    const grouped: Record<string, Client[]> = {};
    
    filteredClients.forEach(client => {
      const city = client.city || 'Sans ville';
      if (!grouped[city]) {
        grouped[city] = [];
      }
      grouped[city].push(client);
    });

    // Trier les villes alphabétiquement
    const sortedCities = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    // Créer un objet ordonné avec les villes triées
    const ordered: Record<string, Client[]> = {};
    sortedCities.forEach(city => {
      ordered[city] = grouped[city];
    });

    return ordered;
  }, [filteredClients]);

  // Fonction helper pour formater l'adresse
  const formatAddress = (client: Client) => {
    if (client.street_address && client.postal_code && client.city) {
      return `${client.street_address}, ${client.postal_code} ${client.city}`;
    }
    return client.address || 'Adresse non renseignée';
  };

  const loadClients = async (silent = false) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      if (!silent) {
      toast.error('Erreur lors du chargement des clients');
      }
    } finally {
      if (!silent) {
      setLoading(false);
      }
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Gestion des Clients</h1>
            <p className="text-slate-600">Dépôts-ventes de cartes de vœux</p>
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
              onClick={() => router.push('/clients/new')}
            >
              <Plus className="mr-2 h-5 w-5" />
              Ajouter un client
            </Button>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom, adresse, numéro de client, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Filtres par département et ville */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtre par département */}
            <Popover open={departmentFilterOpen} onOpenChange={setDepartmentFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedDepartments.length === 0
                        ? 'Département'
                        : selectedDepartments.length === 1
                        ? formatDepartment(selectedDepartments[0])
                        : `${selectedDepartments.length} départements`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher un département..." />
                  <CommandList>
                    <CommandEmpty>Aucun département trouvé.</CommandEmpty>
                    <CommandGroup>
                      {availableDepartments.map((dept) => {
                        const isSelected = selectedDepartments.includes(dept);
                        return (
                          <CommandItem
                            key={dept}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
                              } else {
                                setSelectedDepartments([...selectedDepartments, dept]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {formatDepartment(dept)}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des départements sélectionnés */}
            {selectedDepartments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedDepartments.map((dept) => (
                  <Badge
                    key={dept}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {formatDepartment(dept)}
                    <button
                      onClick={() => {
                        setSelectedDepartments(selectedDepartments.filter((d) => d !== dept));
                      }}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Filtre par ville */}
            <Popover open={cityFilterOpen} onOpenChange={setCityFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={cityFilterOpen}
                  className="w-[250px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm">
                      {selectedCities.length === 0
                        ? 'Ville'
                        : selectedCities.length === 1
                        ? selectedCities[0]
                        : `${selectedCities.length} villes`}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher une ville..." />
                  <CommandList>
                    <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
                    <CommandGroup>
                      {availableCities.map((city) => {
                        const isSelected = selectedCities.includes(city);
                        return (
                          <CommandItem
                            key={city}
                            onSelect={() => {
                              if (isSelected) {
                                setSelectedCities(selectedCities.filter((c) => c !== city));
                              } else {
                                setSelectedCities([...selectedCities, city]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {city}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Badges des villes sélectionnées */}
            {selectedCities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCities.map((city) => (
                  <Badge
                    key={city}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {city}
                    <button
                      onClick={() => {
                        setSelectedCities(selectedCities.filter((c) => c !== city));
                      }}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Bouton pour réinitialiser les filtres */}
            {(selectedDepartments.length > 0 || selectedCities.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDepartments([]);
                  setSelectedCities([]);
                }}
                className="text-xs"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          {/* Compteur de résultats */}
          {(searchTerm || selectedDepartments.length > 0 || selectedCities.length > 0) && (
            <p className="text-sm text-slate-600">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
            </p>
          )}
        </div>



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
        ) : filteredClients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">
                {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
              </p>
              <p className="text-slate-500 text-sm">
                {searchTerm 
                  ? `Aucun résultat pour "${searchTerm}". Essayez un autre terme de recherche.`
                  : 'Commencez par ajouter votre premier client'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(clientsByCity).map(([city, cityClients]) => (
              <div key={city} className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-slate-600" />
                  {city}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cityClients.map((client) => (
                <Card
                  key={client.id}
                      className="hover:shadow-md transition-all duration-200 border-slate-200 cursor-pointer"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-semibold leading-tight mb-1.5">
                              {client.name}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                              {formatAddress(client)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                    </Card>
                  ))}
                      </div>
                    </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}