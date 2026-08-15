/** FAQ page /logiciel-depot-vente — partagée UI + JSON-LD. */
export const DEPOT_VENTE_FAQ_ITEMS: ReadonlyArray<readonly [string, string]> = [
  [
    'Qu’est-ce qu’un logiciel de dépôt-vente ?',
    'Un logiciel de dépôt-vente sert à suivre les produits confiés chez des revendeurs, à enregistrer les relevés de stock, à déterminer ce qui a été vendu et à s’appuyer sur ces ventes pour la facturation. Gaston Stock est conçu autour de ce cycle métier.',
  ],
  [
    'Gaston Stock peut il gérer des factures en compte ferme ?',
    'Oui, bien que l’intérêt principal de Gaston Stock soit de simplifier la facturation en dépôt-vente, vous pouvez également gérer des factures en compte ferme. Gaston Stock vous permet de gérer toutes les opérations de manière simple et efficace.',
  ],
  [
    'Comment suivre un stock déposé chez un revendeur ?',
    'Dans Gaston Stock, chaque client/revendeur dispose d’un suivi de stock. Vous enregistrez les dépôts, puis lors d’un passage vous saisissez le stock compté : l’application aide à recalculer ce qui a été vendu et à mettre à jour le stock restant.',
  ],
  [
    'Peut-on gérer plusieurs revendeurs avec Gaston Stock ?',
    'Oui. Vous gérez vos clients/revendeurs, leurs stocks et leurs documents (factures, relevés, bons de dépôt) dans une même application, plutôt que de multiplier les fichiers par point de vente.',
  ],
  [
    'Comment facturer les produits vendus en dépôt-vente ?',
    'Après un relevé, vous facturez à partir des quantités vendues calculées (et non du stock encore présent chez le revendeur). Les documents sont générés dans l’application (factures, avoirs selon les cas).',
  ],
  [
    'Gaston Stock est-il compatible avec la facturation électronique ?',
    'Oui. Gaston Stock génère des factures électroniques conformes aux réglementations en vigueur, et vous permet de les envoyer directement par email ou de les imprimer.',
  ],
  [
    'À quelles entreprises s’adresse Gaston Stock ?',
    'Aux entreprise grossistes en dépôt-vente, ou qui déposent simplement des produits chez plusieurs revendeurs et facturent uniquement sur la base des ventes réellement constatées.',
  ],
];
