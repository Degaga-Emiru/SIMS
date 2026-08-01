import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  key: string;
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => String(row[col.key] ?? "")));

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
) {
  const sheetData = [
    columns.map((col) => col.header),
    ...data.map((row) => columns.map((col) => row[col.key] ?? "")),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  title?: string
) {
  const doc = new jsPDF();

  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 20);
  }

  autoTable(doc, {
    startY: title ? 28 : 20,
    head: [columns.map((col) => col.header)],
    body: data.map((row) => columns.map((col) => String(row[col.key] ?? ""))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
