import { Platform, Alert } from "react-native";
import { ensureEcoFolders, getEcoFolderPath, getExportFileName, EcoFolder } from "./fileSystem";

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "documento";
}

function downloadBlobWeb(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPdfFromHtml(
  html: string,
  baseName: string,
  folder: EcoFolder = "planos",
): Promise<void> {
  const filename = getExportFileName(baseName, "pdf");

  if (Platform.OS === "web") {
    try {
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        downloadBlobWeb(blob, `${sanitizeFileName(baseName)}.html`);
        Alert.alert(
          "Pop-up bloqueado",
          "Permita pop-ups para imprimir em PDF, ou abra o ficheiro HTML descarregado e use Imprimir → Guardar como PDF.",
        );
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try { win.print(); } catch {}
      }, 400);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível gerar o PDF.");
    }
    return;
  }

  try {
    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");
    const FS = await import("expo-file-system");

    const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });

    await ensureEcoFolders();
    const folderPath = await getEcoFolderPath(folder);
    let finalUri = tempUri;

    if (folderPath) {
      const destUri = `${folderPath}${filename}`;
      try {
        await (FS as any).copyAsync({ from: tempUri, to: destUri });
        finalUri = destUri;
      } catch {
        finalUri = tempUri;
      }
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(finalUri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle: filename,
      });
    } else {
      Alert.alert("PDF guardado", `Ficheiro: ${finalUri}`);
    }
  } catch (e: any) {
    Alert.alert("Erro", e.message || "Não foi possível gerar o PDF.");
  }
}

export interface ExcelSheetSpec {
  name: string;
  rows: (string | number | null)[][];
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
  colWidths?: number[];
}

export async function exportExcelMultiSheet(
  sheets: ExcelSheetSpec[],
  baseName: string,
  folder: EcoFolder = "pautas",
): Promise<void> {
  const filename = getExportFileName(baseName, "xlsx");
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    for (const s of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      if (s.merges && s.merges.length) (ws as any)["!merges"] = s.merges;
      if (s.colWidths) (ws as any)["!cols"] = s.colWidths.map((w) => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31) || "Folha1");
    }

    if (Platform.OS === "web") {
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      downloadBlobWeb(blob, filename);
      return;
    }

    const FS = await import("expo-file-system");
    const Sharing = await import("expo-sharing");
    const b64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" }) as string;

    await ensureEcoFolders();
    const folderPath = await getEcoFolderPath(folder);
    const dir = folderPath || (FS as any).documentDirectory || (FS as any).cacheDirectory || "";
    const fileUri = `${dir}${filename}`;

    await (FS as any).writeAsStringAsync(fileUri, b64, {
      encoding: (FS as any).EncodingType?.Base64 ?? "base64",
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: filename,
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } else {
      Alert.alert("Excel guardado", `Ficheiro: ${fileUri}`);
    }
  } catch (e: any) {
    Alert.alert("Erro", e.message || "Não foi possível gerar o Excel.");
  }
}

export async function exportExcel(
  rows: (string | number | null)[][],
  baseName: string,
  sheetName: string = "Folha1",
  opts?: { merges?: ExcelSheetSpec["merges"]; colWidths?: number[]; folder?: EcoFolder },
): Promise<void> {
  await exportExcelMultiSheet(
    [{ name: sheetName, rows, merges: opts?.merges, colWidths: opts?.colWidths }],
    baseName,
    opts?.folder,
  );
}
