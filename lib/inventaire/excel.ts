import {
  sumNumericCells,
  type InventoryMatrix,
  type InventoryPriceCell,
} from '@/lib/inventaire/types';

const HEADER_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFE8EDF2' },
};
const TOTAL_FILL = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: 'FFDDE7F0' },
};
const TITLE_FONT = { bold: true, size: 14, color: { argb: 'FF0B1F33' } };
const HEADER_FONT = { bold: true, size: 11 };
const MONEY_FMT = '#,##0.00';
const INT_FMT = '0';

function formatDateFr(dateYmd: string): string {
  const [y, m, d] = dateYmd.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Génère un Buffer XLSX à 3 onglets : Stocks, Prix par produit, Valeur par produit.
 * Totaux uniquement sur Stocks et Valeur (pas sur Prix).
 * Import dynamique d'exceljs pour rester compatible Next.js (client).
 */
export async function buildInventoryWorkbook(
  matrix: InventoryMatrix,
  dateYmd: string
): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'GastonStock';
  workbook.created = new Date();

  const { clients, products, stocks, prices, values } = matrix;
  const colCount = 3 + products.length + 1;

  const writeTitleBlock = (
    sheet: import('exceljs').Worksheet,
    title: string,
    cols: number
  ) => {
    sheet.mergeCells(1, 1, 1, Math.max(cols, 3));
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = TITLE_FONT;

    sheet.mergeCells(2, 1, 2, Math.max(cols, 3));
    const dateCell = sheet.getCell(2, 1);
    dateCell.value = `Date d'inventaire : ${formatDateFr(dateYmd)} (état à 23:59:59)`;
    dateCell.font = { size: 11, italic: true, color: { argb: 'FF475569' } };
    sheet.getRow(3).height = 8;
  };

  const applyHeaderRow = (row: import('exceljs').Row, cols: number) => {
    row.font = HEADER_FONT;
    row.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= cols; c++) {
      row.getCell(c).fill = HEADER_FILL;
      row.getCell(c).border = {
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    }
    row.height = 32;
  };

  const setIdHeaders = (row: import('exceljs').Row) => {
    row.getCell(1).value = 'Nom commercial';
    row.getCell(2).value = 'Nom juridique';
    row.getCell(3).value = 'client_number';
  };

  const writePriceOrValue = (
    cell: import('exceljs').Cell,
    value: InventoryPriceCell,
    asMoney: boolean
  ) => {
    if (value === 'N/A') {
      cell.value = 'N/A';
      cell.alignment = { horizontal: 'center' };
      return;
    }
    cell.value = value;
    if (asMoney) cell.numFmt = MONEY_FMT;
  };

  // —— Onglet Stocks ——
  {
    const sheet = workbook.addWorksheet('Stocks', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
    });
    writeTitleBlock(sheet, 'Inventaire — Stocks', colCount);

    const headerRow = sheet.getRow(4);
    setIdHeaders(headerRow);
    products.forEach((p, i) => {
      headerRow.getCell(4 + i).value = p.name;
    });
    headerRow.getCell(4 + products.length).value = 'Total client';
    applyHeaderRow(headerRow, colCount);

    const colTotals = new Array(products.length).fill(0) as number[];
    let grandTotal = 0;

    clients.forEach((client, rowIdx) => {
      const row = sheet.getRow(5 + rowIdx);
      row.getCell(1).value = client.name || '';
      row.getCell(2).value = client.company_name || '';
      row.getCell(3).value = client.client_number || '';

      let rowTotal = 0;
      products.forEach((product, i) => {
        const qty = stocks[client.id]?.[product.id] ?? 0;
        const cell = row.getCell(4 + i);
        cell.value = qty;
        cell.numFmt = INT_FMT;
        colTotals[i] += qty;
        rowTotal += qty;
      });
      row.getCell(4 + products.length).value = rowTotal;
      row.getCell(4 + products.length).numFmt = INT_FMT;
      row.getCell(4 + products.length).font = { bold: true };
      grandTotal += rowTotal;
    });

    const totalRow = sheet.getRow(5 + clients.length);
    totalRow.getCell(1).value = 'Total général';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = '';
    products.forEach((_, i) => {
      const cell = totalRow.getCell(4 + i);
      cell.value = colTotals[i];
      cell.numFmt = INT_FMT;
    });
    totalRow.getCell(4 + products.length).value = grandTotal;
    totalRow.getCell(4 + products.length).numFmt = INT_FMT;
    totalRow.font = { bold: true };
    for (let c = 1; c <= colCount; c++) {
      totalRow.getCell(c).fill = TOTAL_FILL;
    }

    if (clients.length > 0 && products.length > 0) {
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + clients.length, column: colCount },
      };
    }

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 16;
    for (let i = 0; i < products.length; i++) {
      sheet.getColumn(4 + i).width = Math.min(28, Math.max(12, products[i].name.length + 2));
    }
    sheet.getColumn(4 + products.length).width = 14;
  }

  // —— Onglet Prix par produit (sans totaux) ——
  {
    const sheet = workbook.addWorksheet('Prix par produit', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
    });
    const priceColCount = 3 + products.length;
    writeTitleBlock(sheet, 'Inventaire — Prix de cession HT (actuels)', priceColCount);

    const headerRow = sheet.getRow(4);
    setIdHeaders(headerRow);
    products.forEach((p, i) => {
      headerRow.getCell(4 + i).value = p.name;
    });
    applyHeaderRow(headerRow, priceColCount);

    clients.forEach((client, rowIdx) => {
      const row = sheet.getRow(5 + rowIdx);
      row.getCell(1).value = client.name || '';
      row.getCell(2).value = client.company_name || '';
      row.getCell(3).value = client.client_number || '';
      products.forEach((product, i) => {
        writePriceOrValue(row.getCell(4 + i), prices[client.id]?.[product.id] ?? 'N/A', true);
      });
    });

    if (clients.length > 0 && products.length > 0) {
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + clients.length, column: priceColCount },
      };
    }

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 16;
    for (let i = 0; i < products.length; i++) {
      sheet.getColumn(4 + i).width = Math.min(28, Math.max(12, products[i].name.length + 2));
    }
  }

  // —— Onglet Valeur par produit ——
  {
    const sheet = workbook.addWorksheet('Valeur par produit', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 4 }],
    });
    writeTitleBlock(sheet, 'Inventaire — Valeur de stock HT', colCount);

    const headerRow = sheet.getRow(4);
    setIdHeaders(headerRow);
    products.forEach((p, i) => {
      headerRow.getCell(4 + i).value = p.name;
    });
    headerRow.getCell(4 + products.length).value = 'Total client';
    applyHeaderRow(headerRow, colCount);

    const colTotals = new Array(products.length).fill(0) as number[];
    let grandTotal = 0;

    clients.forEach((client, rowIdx) => {
      const row = sheet.getRow(5 + rowIdx);
      row.getCell(1).value = client.name || '';
      row.getCell(2).value = client.company_name || '';
      row.getCell(3).value = client.client_number || '';

      const rowCells: InventoryPriceCell[] = [];
      products.forEach((product, i) => {
        const cellValue = values[client.id]?.[product.id] ?? 'N/A';
        writePriceOrValue(row.getCell(4 + i), cellValue, true);
        rowCells.push(cellValue);
        if (typeof cellValue === 'number') {
          colTotals[i] += cellValue;
        }
      });
      const rowTotal = sumNumericCells(rowCells);
      row.getCell(4 + products.length).value = rowTotal;
      row.getCell(4 + products.length).numFmt = MONEY_FMT;
      row.getCell(4 + products.length).font = { bold: true };
      grandTotal += rowTotal;
    });

    const totalRow = sheet.getRow(5 + clients.length);
    totalRow.getCell(1).value = 'Total général';
    totalRow.getCell(2).value = '';
    totalRow.getCell(3).value = '';
    products.forEach((_, i) => {
      const cell = totalRow.getCell(4 + i);
      cell.value = Math.round(colTotals[i] * 100) / 100;
      cell.numFmt = MONEY_FMT;
    });
    totalRow.getCell(4 + products.length).value = Math.round(grandTotal * 100) / 100;
    totalRow.getCell(4 + products.length).numFmt = MONEY_FMT;
    totalRow.font = { bold: true };
    for (let c = 1; c <= colCount; c++) {
      totalRow.getCell(c).fill = TOTAL_FILL;
    }

    if (clients.length > 0 && products.length > 0) {
      sheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + clients.length, column: colCount },
      };
    }

    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 28;
    sheet.getColumn(3).width = 16;
    for (let i = 0; i < products.length; i++) {
      sheet.getColumn(4 + i).width = Math.min(28, Math.max(12, products[i].name.length + 2));
    }
    sheet.getColumn(4 + products.length).width = 14;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function downloadInventoryXlsx(buffer: ArrayBuffer, dateYmd: string) {
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventaire_${dateYmd}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
