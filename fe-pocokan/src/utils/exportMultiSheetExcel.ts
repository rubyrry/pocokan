import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export interface MultiSheetExportColumn {
  header: string;
  key: string;
  width?: number;
  currency?: boolean;
  align?: "left" | "center" | "right";
  italic?: boolean;
}

export interface MultiSheetExportSheet {
  name: string;
  columns: MultiSheetExportColumn[];
  rows: any[];
  dataCount?: number;
}

export interface MultiSheetExportOptions {
  title: string;
  filenamePrefix: string;
  sheets: MultiSheetExportSheet[];
}

const sanitizeSheetName = (name: string): string => {
  const sanitized = name
    .trim()
    .replace(/[\\/*?[\]:]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 31)
    .replace(/^'+|'+$/g, "");

  return sanitized || "sheet";
};

const createUniqueSheetNames = (names: string[]): string[] => {
  const usedNames = new Set<string>();

  return names.map((name) => {
    const baseName = sanitizeSheetName(name);
    let sheetName = baseName;
    let sequence = 2;

    while (usedNames.has(sheetName.toLocaleLowerCase())) {
      const suffix = `-${sequence}`;
      sheetName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
      sequence += 1;
    }

    usedNames.add(sheetName.toLocaleLowerCase());
    return sheetName;
  });
};

export const exportToMultiSheetExcel = async ({
  title,
  filenamePrefix,
  sheets,
}: MultiSheetExportOptions) => {
  if (sheets.length === 0) {
    throw new Error("Tidak ada sheet yang dapat diekspor.");
  }

  const workbook = new ExcelJS.Workbook();
  const sheetNames = createUniqueSheetNames(sheets.map((sheet) => sheet.name));

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D32" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };

  sheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(sheetNames[index]);
    worksheet.columns = sheet.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 18,
    }));

    worksheet.mergeCells(1, 1, 1, sheet.columns.length);
    worksheet.getCell("A1").value =
      `${title} (${sheet.dataCount ?? sheet.rows.length} data)`;
    worksheet.getCell("A1").font = { bold: true, size: 12 };
    worksheet.getCell("A1").alignment = { vertical: "middle" };
    worksheet.getRow(1).height = 22;

    const headerRow = worksheet.addRow(
      sheet.columns.map((column) => column.header)
    );
    headerRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.border = borderAll;
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });
    headerRow.height = 20;

    sheet.rows.forEach((item) => {
      const rowData: Record<string, unknown> = {};
      sheet.columns.forEach((column) => {
        rowData[column.key] =
          item[column.key] ?? (column.currency ? 0 : "-");
      });

      const row = worksheet.addRow(rowData);
      row.eachCell((cell, columnNumber) => {
        cell.border = borderAll;
        const column = sheet.columns[columnNumber - 1];
        cell.font = { size: 10, italic: column?.italic ?? false };

        if (column?.currency) {
          cell.numFmt = '"Rp" #,##0';
          cell.alignment = { horizontal: "right" };
        } else if (column?.align) {
          cell.alignment = { horizontal: column.align };
        }
      });
      row.height = 16;
    });

    worksheet.views = [{ state: "frozen", ySplit: 2 }];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(
    blob,
    `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};
