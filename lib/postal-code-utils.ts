/**
 * Convertit un code postal français en numéro de département
 * @param postalCode - Code postal à 5 chiffres (ex: "75001", "13000", "97133")
 * @returns Numéro de département (ex: "75", "13", "971") ou null si invalide
 */
export function getDepartmentFromPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode || typeof postalCode !== 'string') {
    return null;
  }

  // Nettoyer le code postal (supprimer les espaces)
  const cleaned = postalCode.trim().replace(/\s/g, '');

  // Vérifier que c'est un code postal valide (5 chiffres)
  if (!/^\d{5}$/.test(cleaned)) {
    return null;
  }

  const code = parseInt(cleaned, 10);

  // DOM (971-977) : Guadeloupe, Martinique, Guyane, Réunion, Mayotte, etc.
  if (code >= 97100 && code <= 97899) {
    const prefix = Math.floor(code / 1000); // 971, 972, 973, etc.
    return prefix.toString(); // Retourne "971", "972", etc. (3 caractères)
  }

  // Cas particuliers de la Corse
  // 20xxx = Corse, mais 20000-20199 = Corse du Sud (2A), 20200-20699 = Haute-Corse (2B)
  // Pour simplifier, on retourne "20" et on laissera l'utilisateur corriger si besoin
  // Note: Les codes postaux corses peuvent commencer par 20xxx mais aussi 201xx ou 206xx
  if (code >= 20000 && code <= 20699) {
    // On peut affiner : 20000-20199 = 2A, 20200-20699 = 2B
    // Mais pour simplifier, on retourne "20" qui sera affiché comme "20 (Corse)"
    return '20';
  }

  // Cas standard : les 2 premiers chiffres correspondent au département
  // Exemples: 75001 -> 75, 13000 -> 13, 69001 -> 69, 33000 -> 33
  const department = Math.floor(code / 1000);

  // Validation : le département doit être entre 01 et 95 (ou 2A/2B pour la Corse)
  if (department >= 1 && department <= 95) {
    return department.toString().padStart(2, '0');
  }

  // Codes postaux invalides ou hors métropole/DOM
  return null;
}

/**
 * Formate le numéro de département pour l'affichage
 * @param departmentCode - Code du département (ex: "75", "2A", "971")
 * @returns Libellé formaté (ex: "75", "2A (Corse du Sud)", "971 (Guadeloupe)")
 */
export function formatDepartment(departmentCode: string | null | undefined): string {
  if (!departmentCode) {
    return 'Non renseigné';
  }

  const deptNames: Record<string, string> = {
    '01': 'Ain',
    '02': 'Aisne',
    '03': 'Allier',
    '04': 'Alpes-de-Haute-Provence',
    '05': 'Hautes-Alpes',
    '06': 'Alpes-Maritimes',
    '07': 'Ardèche',
    '08': 'Ardennes',
    '09': 'Ariège',
    '10': 'Aube',
    '11': 'Aude',
    '12': 'Aveyron',
    '13': 'Bouches-du-Rhône',
    '14': 'Calvados',
    '15': 'Cantal',
    '16': 'Charente',
    '17': 'Charente-Maritime',
    '18': 'Cher',
    '19': 'Corrèze',
    '20': 'Corse',
    '21': 'Côte-d\'Or',
    '22': 'Côtes-d\'Armor',
    '23': 'Creuse',
    '24': 'Dordogne',
    '25': 'Doubs',
    '26': 'Drôme',
    '27': 'Eure',
    '28': 'Eure-et-Loir',
    '29': 'Finistère',
    '30': 'Gard',
    '31': 'Haute-Garonne',
    '32': 'Gers',
    '33': 'Gironde',
    '34': 'Hérault',
    '35': 'Ille-et-Vilaine',
    '36': 'Indre',
    '37': 'Indre-et-Loire',
    '38': 'Isère',
    '39': 'Jura',
    '40': 'Landes',
    '41': 'Loir-et-Cher',
    '42': 'Loire',
    '43': 'Haute-Loire',
    '44': 'Loire-Atlantique',
    '45': 'Loiret',
    '46': 'Lot',
    '47': 'Lot-et-Garonne',
    '48': 'Lozère',
    '49': 'Maine-et-Loire',
    '50': 'Manche',
    '51': 'Marne',
    '52': 'Haute-Marne',
    '53': 'Mayenne',
    '54': 'Meurthe-et-Moselle',
    '55': 'Meuse',
    '56': 'Morbihan',
    '57': 'Moselle',
    '58': 'Nièvre',
    '59': 'Nord',
    '60': 'Oise',
    '61': 'Orne',
    '62': 'Pas-de-Calais',
    '63': 'Puy-de-Dôme',
    '64': 'Pyrénées-Atlantiques',
    '65': 'Hautes-Pyrénées',
    '66': 'Pyrénées-Orientales',
    '67': 'Bas-Rhin',
    '68': 'Haut-Rhin',
    '69': 'Rhône',
    '70': 'Haute-Saône',
    '71': 'Saône-et-Loire',
    '72': 'Sarthe',
    '73': 'Savoie',
    '74': 'Haute-Savoie',
    '75': 'Paris',
    '76': 'Seine-Maritime',
    '77': 'Seine-et-Marne',
    '78': 'Yvelines',
    '79': 'Deux-Sèvres',
    '80': 'Somme',
    '81': 'Tarn',
    '82': 'Tarn-et-Garonne',
    '83': 'Var',
    '84': 'Vaucluse',
    '85': 'Vendée',
    '86': 'Vienne',
    '87': 'Haute-Vienne',
    '88': 'Vosges',
    '89': 'Yonne',
    '90': 'Territoire de Belfort',
    '91': 'Essonne',
    '92': 'Hauts-de-Seine',
    '93': 'Seine-Saint-Denis',
    '94': 'Val-de-Marne',
    '95': 'Val-d\'Oise',
    '971': 'Guadeloupe',
    '972': 'Martinique',
    '973': 'Guyane',
    '974': 'La Réunion',
    '976': 'Mayotte',
    '977': 'Saint-Barthélemy',
    '978': 'Saint-Martin',
  };

  const name = deptNames[departmentCode];
  if (name) {
    return `${departmentCode} - ${name}`;
  }

  // Si non trouvé, retourner juste le code
  return departmentCode;
}

