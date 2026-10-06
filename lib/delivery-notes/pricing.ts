/**
 * Résolution des prix BL — alignée sur Facturer (dépôt) :
 * client_products.custom_* ?? products.*
 */

export type ProductPriceDefaults = {
  price: number;
  recommended_sale_price: number | null;
};

export type ClientProductPriceOverride = {
  custom_price: number | null;
  custom_recommended_sale_price: number | null;
};

export type DeliveryNoteLinePriceState = {
  unit_price_ht: number | null;
  recommended_sale_price_ttc: number | null;
  unit_price_ht_is_custom: boolean;
  recommended_sale_price_ttc_is_custom: boolean;
};

export type EffectiveDeliveryNotePrices = {
  cessionHt: number;
  recommendedTtc: number | null;
  lockedFromDeposit: boolean;
};

/** Comparaison monétaire (2 décimales), comme dans le reste de l'app. */
export function moneyEquals(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export function formatPriceHt(value: number): string {
  return `${value.toFixed(2)} €`;
}

export function formatPriceTtc(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(2)} €`;
}

/**
 * Prix de référence Facturer (dépôt) / catalogue pour un produit.
 * lockedFromDeposit = produit déjà associé au client (présent dans client_products).
 */
export function resolveReferencePrices(
  product: ProductPriceDefaults | null | undefined,
  clientOverride: ClientProductPriceOverride | null | undefined
): EffectiveDeliveryNotePrices {
  const lockedFromDeposit = Boolean(clientOverride);
  const catalogHt = product?.price ?? 0;
  const catalogTtc = product?.recommended_sale_price ?? null;

  if (!clientOverride) {
    return {
      cessionHt: catalogHt,
      recommendedTtc: catalogTtc,
      lockedFromDeposit: false,
    };
  }

  return {
    cessionHt: clientOverride.custom_price ?? catalogHt,
    recommendedTtc:
      clientOverride.custom_recommended_sale_price ?? catalogTtc,
    lockedFromDeposit: true,
  };
}

/**
 * Prix effectifs affichés / utilisés pour une ligne BL.
 * - Brouillon non custom → référence live
 * - Custom → valeur stockée
 * - Validé/importé avec valeur figée → valeur stockée
 * - Ancien BL (null) → référence (catalogue / dépôt)
 */
export function resolveEffectiveDeliveryNotePrices(params: {
  line: DeliveryNoteLinePriceState;
  product: ProductPriceDefaults | null | undefined;
  clientOverride: ClientProductPriceOverride | null | undefined;
  /** true = draft (héritage live) ; false = validated/imported (préférer figé) */
  isDraft: boolean;
}): EffectiveDeliveryNotePrices {
  const reference = resolveReferencePrices(params.product, params.clientOverride);

  const cessionHt =
    params.line.unit_price_ht_is_custom && params.line.unit_price_ht != null
      ? params.line.unit_price_ht
      : !params.isDraft && params.line.unit_price_ht != null
        ? params.line.unit_price_ht
        : reference.cessionHt;

  const recommendedTtc =
    params.line.recommended_sale_price_ttc_is_custom &&
    params.line.recommended_sale_price_ttc != null
      ? params.line.recommended_sale_price_ttc
      : !params.isDraft && params.line.recommended_sale_price_ttc != null
        ? params.line.recommended_sale_price_ttc
        : reference.recommendedTtc;

  return {
    cessionHt,
    recommendedTtc,
    // En brouillon : locked si présent dépôt. Après validation : jamais éditable via stylet BL.
    lockedFromDeposit: params.isDraft ? reference.lockedFromDeposit : true,
  };
}

export type PriceConflict = {
  productId: string;
  productName: string;
  blPriceHt: number;
  depositPriceHt: number;
};

/**
 * Conflits HT entre prix figés BL et prix effectifs Facturer (dépôt).
 * Seuls les produits déjà présents en dépôt sont comparés.
 */
/**
 * Prix à afficher dans le PDF d'un BL (validé) : valeurs effectives de la ligne,
 * jamais un recalcul catalogue isolé. Compatible anciens BL (unit_price_ht null).
 */
export function resolveDeliveryNotePdfPrices(params: {
  line: DeliveryNoteLinePriceState;
  product: ProductPriceDefaults | null | undefined;
  clientOverride?: ClientProductPriceOverride | null;
}): EffectiveDeliveryNotePrices {
  return resolveEffectiveDeliveryNotePrices({
    line: params.line,
    product: params.product,
    clientOverride: params.clientOverride ?? null,
    isDraft: false,
  });
}

/**
 * Mise à jour des custom_* Facturer (dépôt) à partir d'une ligne BL importée.
 * - n'écrit que si le BL a un prix spécifique (flag is_custom)
 * - n'écrase jamais une valeur custom_* déjà non nulle en dépôt
 * - undefined = ne pas modifier le champ
 */
export function resolveDepositCustomPriceUpdatesFromBl(params: {
  unit_price_ht: number | null;
  recommended_sale_price_ttc: number | null;
  unit_price_ht_is_custom: boolean;
  recommended_sale_price_ttc_is_custom: boolean;
  existingCustomPrice: number | null | undefined;
  existingCustomRecommendedSalePrice: number | null | undefined;
}): {
  custom_price?: number;
  custom_recommended_sale_price?: number;
} {
  const updates: {
    custom_price?: number;
    custom_recommended_sale_price?: number;
  } = {};

  if (
    params.unit_price_ht_is_custom &&
    params.unit_price_ht != null &&
    (params.existingCustomPrice === null || params.existingCustomPrice === undefined)
  ) {
    updates.custom_price = params.unit_price_ht;
  }

  if (
    params.recommended_sale_price_ttc_is_custom &&
    params.recommended_sale_price_ttc != null &&
    (params.existingCustomRecommendedSalePrice === null ||
      params.existingCustomRecommendedSalePrice === undefined)
  ) {
    updates.custom_recommended_sale_price = params.recommended_sale_price_ttc;
  }

  return updates;
}

export function findCessionPriceConflicts(
  lines: Array<{
    productId: string;
    productName: string;
    blCessionHt: number;
    depositCessionHt: number | null;
  }>
): PriceConflict[] {
  const conflicts: PriceConflict[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.depositCessionHt === null) continue;
    if (seen.has(line.productId)) continue;
    seen.add(line.productId);
    if (!moneyEquals(line.blCessionHt, line.depositCessionHt)) {
      conflicts.push({
        productId: line.productId,
        productName: line.productName,
        blPriceHt: line.blCessionHt,
        depositPriceHt: line.depositCessionHt,
      });
    }
  }

  return conflicts;
}
