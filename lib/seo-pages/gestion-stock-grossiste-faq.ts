/** FAQ page /gestion-stock-grossiste-depot-vente — partagée UI + JSON-LD. */
export const GESTION_STOCK_GROSSISTE_FAQ_ITEMS: ReadonlyArray<readonly [string, string]> = [
  [
    'Quelle différence entre stock en entrepôt et stock chez les clients ?',
    'Le stock en entrepôt est sous votre contrôle direct. Le stock chez les clients est dispersé : il évolue entre vos passages. Gaston Stock se concentre sur ce stock chez les revendeurs et le cycle dépôt → relevé → ventes → facturation.',
  ],
  [
    'Comment suivre les ventes réalisées chez plusieurs revendeurs ?',
    'À chaque relevé, la différence entre le stock de référence et le stock restant indique les ventes. Exemple : 100 déposés, 63 restants → 37 vendus. Vous pouvez ensuite facturer ces quantités client par client. Avec Gaston Stock, repartez directement des derniers relevés et renseignez uniquement les nouveaux stocks constatés.',
  ],
  [
    'Comment centraliser la gestion des stocks de plusieurs clients ?',
    'Gaston Stock regroupe clients, produits, stocks, relevés et facturation dans une application web unique. Vous évitez de maintenir un fichier Excel (ou plusieurs) par revendeur.',
  ],
  [
    'Gaston Stock est-il un logiciel généraliste de gestion de stock ?',
    'Non. Ce n’est pas un ERP ni un WMS d’entrepôt généraliste. Il est conçu pour le dépôt-vente et le suivi du stock confié chez plusieurs revendeurs, avec facturation des ventes réellement constatées.',
  ],
  [
    'Gaston Stock convient-il aux entreprises qui distribuent leurs produits chez plusieurs revendeurs ?',
    'Oui, dès lors que votre organisation repose sur du stock chez les clients et des relevés pour connaître les ventes. Les premiers utilisateurs sont notamment des distributeurs en carterie ; le même principe s’applique à d’autres activités de dépôt-vente.',
  ],
];
