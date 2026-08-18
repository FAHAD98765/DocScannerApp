import RNPrint from 'react-native-print';

interface ScanPage {
  imageUri: string;
  text: string;
}

export async function exportSearchablePDF(pages: ScanPage[]): Promise<string> {
  let bodyHtml = '';
  pages.forEach((page) => {
    bodyHtml += `
      <div style="position:relative; width:100%; page-break-after:always;">
        <img src="${page.imageUri}" style="width:100%; display:block;" />
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; color:transparent; font-size:1px; overflow:hidden;">
          ${page.text.replace(/\n/g, '<br/>')}
        </div>
      </div>
    `;
  });

  const html = `<html><body style="margin:0;">${bodyHtml}</body></html>`;

  const filePath = await RNPrint.print({
    html,
    fileName: `searchable_scan_${Date.now()}`,
    isLandscape: false,
  });

  return filePath ?? '';
}