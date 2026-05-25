import backendAPI from '../services/backendAPI';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const wrapText = (text: string, font: any, fontSize: number, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach(paragraph => {
    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    lines.push('');
  });

  return lines;
};

export const createPdfBlob = async (content: string): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const lineHeight = fontSize + 4;

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  let y = height - margin;
  const maxWidth = width - margin * 2;

  const lines = wrapText(content, font, fontSize, maxWidth);
  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      y = height - margin;
    }

    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const saveAndDownloadReport = async (
  title: string,
  reportType: string,
  content: string,
  filename: string
) => {
  const blob = await createPdfBlob(content);
  downloadBlob(blob, `${filename}.pdf`);

  try {
    await backendAPI.saveReport(title, reportType, content, `${filename}.pdf`);
  } catch (error) {
    console.error('Failed to save report to backend:', error);
  }
};
