import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { Soporte } from './soporte';

const MARGIN = 36;

export async function renderListaPdf(items: Soporte[], filtros: string[]): Promise<Buffer> {
  const doc = createDocument('landscape');
  const regular = requiredAsset('fonts/NotoSans-Regular.ttf');
  const bold = requiredAsset('fonts/NotoSans-Bold.ttf');
  const logo = optionalAsset('logo-campbell.png');
  let y = drawHeader(doc, regular, bold, logo, 'Bitácora de Soportes', filtros.join(' · ') || 'Todos los registros');

  const columns = [
    { title: 'Solicitante', width: 100 },
    { title: 'Área', width: 95 },
    { title: 'Descripción', width: 210 },
    { title: 'Tipo', width: 78 },
    { title: 'Solicitud', width: 68 },
    { title: 'Entrega', width: 68 },
    { title: 'Tiempo', width: 58 },
    { title: 'Realizado por', width: 90 },
  ];

  const drawTableHeader = () => {
    doc.font(bold).fontSize(8).fillColor('#0f6b3c');
    let x = MARGIN;
    for (const column of columns) {
      doc.text(column.title, x, y, { width: column.width, lineBreak: false });
      x += column.width;
    }
    y += 16;
    doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).strokeColor('#d7e4dc').stroke();
    y += 6;
  };

  drawTableHeader();
  doc.font(regular).fontSize(8).fillColor('#1c2b24');

  if (items.length === 0) {
    doc.text('No hay soportes con el filtro seleccionado.', MARGIN, y);
  }

  for (const item of items) {
    const values = [
      item.solicitante,
      item.area,
      recortar(item.descripcion ?? '', 110),
      etiquetaTipo(item.tipo),
      formatoFecha(item.fechaSolicitud),
      formatoFecha(item.fechaEntrega),
      item.tiempoSoporte ?? '',
      item.tecnico ?? '',
    ];
    const height = Math.max(...values.map((value, index) => doc.heightOfString(value, { width: columns[index].width }))) + 6;
    if (y + height > doc.page.height - MARGIN) {
      doc.addPage();
      y = drawHeader(doc, regular, bold, logo, 'Bitácora de Soportes', filtros.join(' · ') || 'Todos los registros');
      drawTableHeader();
      doc.font(regular).fontSize(8).fillColor('#1c2b24');
    }
    let x = MARGIN;
    values.forEach((value, index) => {
      doc.text(value, x, y, { width: columns[index].width });
      x += columns[index].width;
    });
    y += height;
  }

  doc.font(regular).fontSize(8).fillColor('#52685c').text(`${items.length} soportes`, MARGIN, doc.page.height - 28, { lineBreak: false });
  return finish(doc);
}

export async function renderSoportePdf(item: Soporte): Promise<Buffer> {
  const doc = createDocument('portrait');
  const regular = requiredAsset('fonts/NotoSans-Regular.ttf');
  const bold = requiredAsset('fonts/NotoSans-Bold.ttf');
  const logo = optionalAsset('logo-campbell.png');
  let y = drawHeader(doc, regular, bold, logo, 'Soporte individual', `Registro ${item.id}`);
  const fields: [string, string][] = [
    ['Solicitante', item.solicitante],
    ['Área', item.area],
    ['Tipo de soporte', etiquetaTipo(item.tipo)],
    ['Descripción', item.descripcion ?? ''],
    ['Fecha de solicitud', formatoFecha(item.fechaSolicitud)],
    ['Fecha de entrega', formatoFecha(item.fechaEntrega)],
    ['Tiempo de soporte', item.tiempoSoporte ?? ''],
    ['Realizado por', item.tecnico ?? ''],
  ];
  for (const [label, value] of fields) {
    doc.font(bold).fontSize(10).fillColor('#0f6b3c').text(label, MARGIN, y);
    y = doc.y + 2;
    doc.font(regular).fontSize(12).fillColor('#1c2b24').text(value || '—', MARGIN, y, { width: doc.page.width - MARGIN * 2 });
    y = doc.y + 12;
  }
  return finish(doc);
}

function createDocument(layout: 'portrait' | 'landscape'): PDFKit.PDFDocument {
  return new PDFDocument({ size: 'A4', layout, margin: MARGIN });
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  regular: string,
  bold: string,
  logo: string | null,
  title: string,
  subtitle: string,
): number {
  if (logo) {
    doc.image(logo, MARGIN, 24, { height: 34 });
  }
  doc.font(bold).fontSize(16).fillColor('#1c2b24').text(title, MARGIN + 48, 26, { lineBreak: false });
  doc.font(regular).fontSize(9).fillColor('#52685c').text(subtitle, MARGIN + 48, 48, { width: doc.page.width - MARGIN * 2 - 48 });
  doc.moveTo(MARGIN, 68).lineTo(doc.page.width - MARGIN, 68).strokeColor('#0f6b3c').stroke();
  return 80;
}

function finish(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function optionalAsset(name: string): string | null {
  const candidates = [
    join(__dirname, '../../assets', name),
    join(process.cwd(), 'assets', name),
    join(process.cwd(), 'api/assets', name),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function requiredAsset(name: string): string {
  const found = optionalAsset(name);
  if (!found) {
    throw new Error(`No se encontró el archivo ${name}`);
  }
  return found;
}

function recortar(value: string, max: number): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function formatoFecha(value: string | null): string {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function etiquetaTipo(tipo: Soporte['tipo']): string {
  if (tipo === 'Chequeo') return 'Asesoría, visita, chequeo';
  return tipo ?? '';
}
