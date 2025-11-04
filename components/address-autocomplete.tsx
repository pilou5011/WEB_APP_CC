'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { searchAddresses, AddressSuggestion } from '@/lib/address-service';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  streetValue: string;
  postalCodeValue: string;
  cityValue: string;
  onStreetChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCoordinatesChange?: (latitude: number | null, longitude: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  streetLabel?: string;
  postalCodeLabel?: string;
  cityLabel?: string;
}

export function AddressAutocomplete({
  streetValue,
  postalCodeValue,
  cityValue,
  onStreetChange,
  onPostalCodeChange,
  onCityChange,
  onCoordinatesChange,
  disabled = false,
  required = false,
  streetLabel = 'Adresse',
  postalCodeLabel = 'Code postal',
  cityLabel = 'Ville'
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Suivre si l'utilisateur a commencé à taper
  const debounceTimer = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const selectingRef = useRef(false); // Pour éviter la fermeture pendant la sélection

  // Recherche avec debounce quand l'utilisateur tape dans le champ adresse
  useEffect(() => {
    // Ne rien faire si l'utilisateur n'a pas encore interagi avec le champ
    if (!hasUserInteracted) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Ne rechercher que si au moins 3 caractères dans le champ adresse
    if (streetValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      // Construire la requête complète avec tous les champs disponibles pour une meilleure précision
      const query = `${streetValue} ${postalCodeValue} ${cityValue}`.trim();
      const results = await searchAddresses(query, 5);
      setSuggestions(results);
      setLoading(false);
      setShowSuggestions(results.length > 0);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [streetValue, postalCodeValue, cityValue, hasUserInteracted]);

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ne pas fermer si on est en train de sélectionner
      if (selectingRef.current) {
        selectingRef.current = false;
        return;
      }
      
      // Vérifier si le clic est en dehors du conteneur
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    // Utiliser 'click' avec capture pour détecter les clics extérieurs
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, []);

  const handleSelectAddress = (suggestion: AddressSuggestion, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Marquer qu'on est en train de sélectionner pour éviter la fermeture prématurée
    selectingRef.current = true;
    
    // Fermer la liste immédiatement
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Réinitialiser l'état d'interaction pour éviter que la liste ne réapparaisse
    setHasUserInteracted(false);
    
    // Retirer le focus du champ adresse pour éviter que la liste ne réapparaisse
    if (streetInputRef.current) {
      streetInputRef.current.blur();
    }
    
    // Extraire les valeurs avec des fallbacks si nécessaire
    const streetValue = suggestion.street || suggestion.label.split(',')[0] || '';
    const postcodeValue = suggestion.postcode || '';
    const cityValue = suggestion.city || suggestion.label.split(' ').pop() || '';
    
    // Mettre à jour tous les champs de manière synchrone
    // Utiliser requestAnimationFrame pour garantir que les mises à jour se font dans le bon ordre
    requestAnimationFrame(() => {
      onStreetChange(streetValue);
      onPostalCodeChange(postcodeValue);
      onCityChange(cityValue);
      
      // Sauvegarder les coordonnées GPS en arrière-plan si la fonction est fournie
      if (onCoordinatesChange) {
        onCoordinatesChange(suggestion.latitude, suggestion.longitude);
      }
    });
    
    // Réinitialiser le flag après un court délai
    setTimeout(() => {
      selectingRef.current = false;
    }, 100);
  };

  const handleStreetFocus = () => {
    // Marquer que l'utilisateur a interagi seulement si le champ a du contenu
    // Mais ne pas déclencher de recherche si l'utilisateur n'a pas encore tapé
    if (streetValue.length >= 3 && hasUserInteracted) {
      // Réafficher les suggestions si elles existent déjà et que l'utilisateur a déjà interagi
      if (suggestions.length > 0) {
        setShowSuggestions(true);
      }
    }
  };

  const handleStreetChange = (value: string) => {
    // Marquer que l'utilisateur a commencé à taper
    if (!hasUserInteracted && value.length > 0) {
      setHasUserInteracted(true);
    }
    onStreetChange(value);
  };

  const handleOtherFieldFocus = () => {
    // Fermer les suggestions quand on clique sur un autre champ
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Champ Adresse avec suggestions */}
      <div className="relative">
        <Label htmlFor="street_address">
          {streetLabel} {required && '*'}
        </Label>
        <Input
          ref={streetInputRef}
          id="street_address"
          value={streetValue}
          onChange={(e) => handleStreetChange(e.target.value)}
          onFocus={handleStreetFocus}
          placeholder="Ex: 8 Boulevard du Port"
          className="mt-1.5"
          disabled={disabled}
          required={required}
          autoComplete="off"
          data-form-type="other"
        />
        
        {/* Liste déroulante des suggestions - positionné EN DESSOUS du champ */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute z-50 w-full mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // Empêcher la propagation du clic
            onMouseDown={(e) => {
              e.preventDefault(); // Empêcher le blur du champ input
              e.stopPropagation(); // Empêcher la propagation
            }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectAddress(suggestion, e);
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Empêcher le blur
                  e.stopPropagation(); // Empêcher la propagation
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-start gap-2 border-b last:border-b-0 cursor-pointer"
              >
                <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{suggestion.label}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {loading && (
          <p className="text-xs text-slate-500 mt-1">Recherche en cours...</p>
        )}
      </div>

      {/* Champs Code Postal et Ville */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="postal_code">
            {postalCodeLabel} {required && '*'}
          </Label>
          <Input
            id="postal_code"
            value={postalCodeValue}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            onFocus={handleOtherFieldFocus}
            placeholder="75001"
            maxLength={5}
            className="mt-1.5"
            disabled={disabled}
            required={required}
            autoComplete="off"
            data-form-type="other"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="city">
            {cityLabel} {required && '*'}
          </Label>
          <Input
            id="city"
            value={cityValue}
            onChange={(e) => onCityChange(e.target.value)}
            onFocus={handleOtherFieldFocus}
            placeholder="Ex: Paris"
            className="mt-1.5"
            disabled={disabled}
            required={required}
            autoComplete="off"
            data-form-type="other"
          />
        </div>
      </div>
    </div>
  );
}
