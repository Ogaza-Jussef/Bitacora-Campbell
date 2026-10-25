import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { Soporte } from './soporte';

const MARGIN = 22;
const LOGO_WIDTH = 78;
const META_WIDTH = 168;
const HEADER_BODY = 76;
const COLUMN_HEADER = 28;

const COLUMNAS = [
  { titulo: 'NOMBRE DE USUARIO', peso: 0.154 },
  { titulo: 'AREA', peso: 0.15 },
  { titulo: 'SOLICITUD', peso: 0.192 },
  { titulo: 'FECHA DE SOLICITUD', peso: 0.127 },
  { titulo: 'FECHA DE ENTREGA', peso: 0.122 },
  { titulo: 'TIEMPO DE SOPORTE', peso: 0.128 },
  { titulo: 'REALIZADO POR', peso: 0.127 },
] as const;

export async function renderListaPdf(items: Soporte[], filtros: string[]): Promise<Buffer> {
  return renderFormulario(items, filtros, false);
}

export async function renderSoportePdf(item: Soporte): Promise<Buffer> {
  return renderFormulario([item], [], true);
}

async function renderFormulario(items: Soporte[], filtros: string[], completo: boolean): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGIN });
  const regular = requiredAsset('fonts/NotoSans-Regular.ttf');
  const bold = requiredAsset('fonts/NotoSans-Bold.ttf');
  const logo = optionalAsset('logo-campbell.png');
  const widths = anchos(doc.page.width - MARGIN * 2);
  let pagina = 1;
  let y = dibujarEncabezado(doc, regular, bold, logo, pagina, filtros, widths);

  doc.font(regular).fontSize(8);
  if (items.length === 0) {
    const alto = 22;
    dibujarFila(doc, regular, ['Sin registros para el filtro seleccionado', '', '', '', '', '', ''], y, widths, alto, false);
  }

  for (const item of items) {
    const valores = [
      item.solicitante,
      item.area,
      solicitud(item, completo),
      formatoFecha(item.fechaSolicitud),
      formatoFecha(item.fechaEntrega),
      item.tiempoSoporte ?? '',
      item.tecnico ?? '',
    ];
    doc.font(regular).fontSize(8);
    const alto = Math.max(
      18,
      ...valores.map((valor, indice) => doc.heightOfString(valor || ' ', { width: widths[indice] - 6 }) + 8),
    );
    if (y + alto > doc.page.height - MARGIN) {
      doc.addPage();
      pagina += 1;
      y = dibujarEncabezado(doc, regular, bold, logo, pagina, filtros, widths);
      doc.font(regular).fontSize(8);
    }
    dibujarFila(doc, regular, valores, y, widths, alto, false);
    y += alto;
  }

  return finish(doc);
}

function dibujarEncabezado(
  doc: PDFKit.PDFDocument,
  regular: string,
  bold: string,
  logo: string | null,
  pagina: number,
  filtros: string[],
  widths: number[],
): number {
  const x = MARGIN;
  const y = MARGIN;
  const total = widths.reduce((suma, ancho) => suma + ancho, 0);
  const centro = total - LOGO_WIDTH - META_WIDTH;
  doc.lineWidth(0.7).strokeColor('#000000');

  celda(doc, '', x, y, LOGO_WIDTH, HEADER_BODY);
  if (logo) {
    doc.image(logo, x + 12, y + 12, { fit: [54, 52], align: 'center', valign: 'center' });
  }

  celda(doc, '', x + LOGO_WIDTH, y, centro, HEADER_BODY);
  doc.font(bold).fontSize(12).fillColor('#000000');
  doc.text('BITÁCORA DE SOPORTES', x + LOGO_WIDTH + 8, y + 16, { width: centro - 16, align: 'center' });
  doc.font(bold).fontSize(9);
  doc.text('PROCESO: SOPORTE PARA LA PRESTACION DE SERVICIOS', x + LOGO_WIDTH + 8, y + 36, {
    width: centro - 16,
    align: 'center',
  });
  if (filtros.length > 0) {
    doc.font(regular).fontSize(8);
    doc.text(filtros.join('  ·  '), x + LOGO_WIDTH + 8, y + 54, { width: centro - 16, align: 'center' });
  }

  const metaX = x + LOGO_WIDTH + centro;
  const etiqueta = 92;
  const filas: [string, string][] = [
    ['Código:', 'FO-AF-034'],
    ['Versión:', '01'],
    ['Vigencia desde:', '2023-01-17'],
    ['Página:', String(pagina)],
  ];
  filas.forEach(([nombre, valor], indice) => {
    const filaY = y + indice * (HEADER_BODY / 4);
    const alto = HEADER_BODY / 4;
    celda(doc, nombre, metaX, filaY, etiqueta, alto, { font: regular, size: 8, align: 'left' });
    celda(doc, valor, metaX + etiqueta, filaY, META_WIDTH - etiqueta, alto, { font: bold, size: 8, align: 'left' });
  });

  let columnaX = x;
  const encabezadoY = y + HEADER_BODY;
  widths.forEach((ancho, indice) => {
    celda(doc, COLUMNAS[indice].titulo, columnaX, encabezadoY, ancho, COLUMN_HEADER, {
      font: bold,
      size: 7,
      align: 'center',
    });
    columnaX += ancho;
  });
  return encabezadoY + COLUMN_HEADER;
}

function dibujarFila(
  doc: PDFKit.PDFDocument,
  font: string,
  valores: string[],
  y: number,
  widths: number[],
  alto: number,
  centrado: boolean,
): void {
  let x = MARGIN;
  valores.forEach((valor, indice) => {
    celda(doc, valor, x, y, widths[indice], alto, {
      font,
      size: 8,
      align: centrado ? 'center' : 'left',
    });
    x += widths[indice];
  });
}

function celda(
  doc: PDFKit.PDFDocument,
  texto: string,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  opciones?: { font?: string; size?: number; align?: 'left' | 'center' },
): void {
  doc.rect(x, y, ancho, alto).stroke();
  if (!texto || !opciones?.font) {
    return;
  }
  doc.font(opciones.font).fontSize(opciones.size ?? 8).fillColor('#000000');
  const padding = 3;
  doc.text(texto, x + padding, y + padding, {
    width: ancho - padding * 2,
    height: alto - padding * 2,
    align: opciones.align ?? 'left',
  });
}

function anchos(total: number): number[] {
  const crudos = COLUMNAS.map((columna) => Math.floor(total * columna.peso));
  const diferencia = total - crudos.reduce((suma, ancho) => suma + ancho, 0);
  crudos[crudos.length - 1] += diferencia;
  return crudos;
}

function solicitud(item: Soporte, completo: boolean): string {
  const tipo = etiquetaTipo(item.tipo);
  const descripcion = (item.descripcion ?? '').replace(/\s+/g, ' ').trim();
  const texto = tipo && descripcion ? `${tipo}. ${descripcion}` : tipo || descripcion;
  if (completo || texto.length <= 180) {
    return texto;
  }
  return `${texto.slice(0, 179)}…`;
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
