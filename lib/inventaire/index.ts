export {
  getInventoryEndOfDayIso,
  buildInventoryMatrix,
  buildLatestNewStockMaps,
  getHistoricalProductStock,
  resolveCessionPriceHt,
  computeValueCell,
  clampNonNegativeInt,
  existedAtOrBefore,
  sortInventoryClients,
  sortInventoryProducts,
  sumNumericCells,
  type InventoryMatrix,
  type InventoryPriceCell,
  type InventoryClientRow,
  type InventoryProductRow,
} from '@/lib/inventaire/types';

export { loadInventoryMatrixForDate } from '@/lib/inventaire/data-access';
export { buildInventoryWorkbook, downloadInventoryXlsx } from '@/lib/inventaire/excel';
