/**
 * Service de géocodage et validation d'adresses françaises
 * Utilise l'API Adresse Data Gouv (Base Adresse Nationale)
 * Documentation : https://adresse.data.gouv.fr/api-doc/adresse
 */

export interface AddressSuggestion {
  label: string;        // "8 Boulevard du Port 80000 Amiens"
  street: string;       // "8 Boulevard du Port"
  postcode: string;     // "80000"
  city: string;         // "Amiens"
  latitude: number;     // 49.8941708
  longitude: number;    // 2.2956951
  score: number;        // 0.97 (pertinence de 0 à 1)
}

/**
 * Recherche d'adresses avec autocomplétion
 * @param query - La requête de recherche (minimum 3 caractères)
 * @param limit - Nombre maximum de résultats (par défaut: 5)
 * @returns Liste des suggestions d'adresses
 */
export async function searchAddresses(
  query: string, 
  limit: number = 5
): Promise<AddressSuggestion[]> {
  // Validation : minimum 3 caractères
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Mapper les résultats au format AddressSuggestion
    return data.features.map((feature: any) => {
      // Construire la rue avec numéro et nom de rue si disponibles
      let street = '';
      if (feature.properties.housenumber && feature.properties.street) {
        street = `${feature.properties.housenumber} ${feature.properties.street}`;
      } else if (feature.properties.name) {
        street = feature.properties.name;
      } else if (feature.properties.street) {
        street = feature.properties.street;
      }
      
      return {
        label: feature.properties.label,
        street: street,
        postcode: feature.properties.postcode || '',
        city: feature.properties.city || '',
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        score: feature.properties.score
      };
    });
  } catch (error) {
    console.error('Erreur lors de la recherche d\'adresses:', error);
    return [];
  }
}

/**
 * Géocodage : convertir une adresse en coordonnées GPS
 * @param street - Numéro et nom de rue
 * @param postcode - Code postal (5 chiffres)
 * @param city - Nom de la ville
 * @returns Coordonnées GPS ou null si non trouvé
 */
export async function geocodeAddress(
  street: string, 
  postcode: string, 
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Construire la requête complète
    const query = `${street} ${postcode} ${city}`.trim();
    
    if (!query || query.length < 5) {
      return null;
    }

    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return {
        latitude: coords[1],
        longitude: coords[0]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors du géocodage de l\'adresse:', error);
    return null;
  }
}

/**
 * Valider qu'une adresse existe sur le territoire français
 * @param street - Numéro et nom de rue
 * @param postcode - Code postal
 * @param city - Ville
 * @returns true si l'adresse existe et est validée, false sinon
 */
export async function validateAddress(
  street: string, 
  postcode: string, 
  city: string
): Promise<boolean> {
  const coordinates = await geocodeAddress(street, postcode, city);
  return coordinates !== null;
}

