const clientRevenueCache = new Map<string, Promise<Map<string, number>>>();

export function getClientRevenueCacheKey(
  companyId: string,
  fiscalYearKey: string | null
): string {
  return `${companyId}|fiscal:${fiscalYearKey ?? 'all'}`;
}

export function getOrLoadClientRevenueMap(
  cacheKey: string,
  loader: () => Promise<Map<string, number>>
): Promise<Map<string, number>> {
  const cached = clientRevenueCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = loader();
  clientRevenueCache.set(cacheKey, promise);
  return promise;
}

export function clearClientRevenueCacheForCompany(companyId: string): void {
  for (const key of Array.from(clientRevenueCache.keys())) {
    if (key.startsWith(`${companyId}|`)) {
      clientRevenueCache.delete(key);
    }
  }
}
