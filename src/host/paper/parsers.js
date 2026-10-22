import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { unzipSync } from '../../../vendor/fflate/esm/index.mjs';

const anchor = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);

function segment(id, text, location) {
  const cleaned = text.trim();
  return cleaned ? { id, text: cleaned, location: { ...location, anchor: anchor(cleaned) } } : null;
}

export function parseMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  const headings = [];
  let pending = [];
  let start = 0;
  let paragraphIndex = 0;
  function flush() {
    if (!pending.length) return;
    paragraphIndex += 1;
    const item = segment(`md-${paragraphIndex}`, pending.join('\n'), {
      format: 'md', heading: headings.map((part) => part.text).join(' / ') || null,
      paragraphIndex, lineStart: start, lineEnd: start + pending.length - 1,
    });
    if (item) segments.push(item);
    pending = [];
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      while (headings.length && headings.at(-1).level >= heading[1].length) headings.pop();
      headings.push({ level: heading[1].length, text: heading[2].trim() });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (!pending.length) start = index + 1;
    pending.push(line);
  }
  flush();
  return { segments, warnings: [] };
}

export function parseLatex(content) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  let section = null;
  let environment = null;
  let pending = [];
  let start = 0;
  let paragraphIndex = 0;
  function flush() {
    if (!pending.length) return;
    paragraphIndex += 1;
    const item = segment(`tex-${paragraphIndex}`, pending.join('\n'), {
      format: 'tex', section, environment, paragraphIndex,
      lineStart: start, lineEnd: start + pending.length - 1,
    });
    if (item) segments.push(item);
    pending = [];
  }
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/\\(?:sub)*section\*?(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (match) { flush(); section = match[1]; }
    const begin = line.match(/\\begin\{([^}]+)\}/);
    if (begin) { flush(); environment = begin[1]; }
    if (!line.trim()) { flush(); continue; }
    if (!pending.length) start = index + 1;
    pending.push(line);
    if (/\\end\{[^}]+\}/.test(line)) { flush(); environment = null; }
  }
  flush();
  return { segments, warnings: [] };
}

function decodeXml(value) {
  return value.replace(/&#x([\da-f]+);|&#(\d+);|&(amp|lt|gt|quot|apos);/gi,
    (_match, hex, dec, named) => {
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      if (dec) return String.fromCodePoint(parseInt(dec, 10));
      return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[named.toLowerCase()];
    });
}

function wordText(xml) {
  return decodeXml([...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g)]
    .map((match) => match[1] ?? (match[0].startsWith('<w:tab') ? '\t' : '\n')).join(''));
}

export function parseDocx(buffer) {
  if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('DOCX exceeds 20 MiB');
  const files = unzipSync(buffer, { filter: (entry) =>
    entry.name === 'word/document.xml' && entry.originalSize <= 8 * 1024 * 1024 });
  const xmlBytes = files['word/document.xml'];
  if (!xmlBytes) throw new Error('DOCX has no readable word/document.xml');
  const xml = new TextDecoder().decode(xmlBytes);
  const body = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)?.[1] ?? xml;
  const blocks = body.match(/<w:tbl[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  const segments = [];
  const headings = [];
  let paragraphIndex = 0;
  let tableIndex = 0;
  function paragraph(xmlPart, table = null) {
    paragraphIndex += 1;
    const text = wordText(xmlPart).trim();
    const style = xmlPart.match(/<w:pStyle[^>]*w:val="([^"]+)"/i)?.[1] ?? null;
    const heading = style?.match(/^Heading([1-9])$/i);
    if (heading) {
      const level = Number(heading[1]);
      headings.length = level - 1;
      headings[level - 1] = text;
    }
    const location = { format: 'docx', heading: headings.filter(Boolean).join(' / ') || null,
      paragraphIndex, ...(table ? { table } : {}) };
    const item = segment(`docx-${paragraphIndex}`, text, location);
    if (item && !heading) segments.push(item);
  }
  for (const block of blocks) {
    if (!block.startsWith('<w:tbl')) { paragraph(block); continue; }
    tableIndex += 1;
    const rows = block.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) ?? [];
    let headers = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const cells = rows[rowIndex].match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) ?? [];
      const cellTexts = cells.map((cell) => wordText(cell).trim());
      if (rowIndex === 0) headers = cellTexts;
      for (let colIndex = 0; colIndex < cells.length; colIndex += 1) {
        const paragraphs = cells[colIndex].match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
        for (const part of paragraphs) paragraph(part,
          { index: tableIndex, row: rowIndex + 1, column: colIndex + 1 });
      }
      if (rowIndex > 0 && cellTexts.some(Boolean)) {
        const rowText = cellTexts.map((value, index) =>
          `${headers[index] || `Column ${index + 1}`}: ${value}`).join('; ');
        const item = segment(`docx-table-${tableIndex}-row-${rowIndex + 1}`, rowText, {
          format: 'docx', heading: headings.filter(Boolean).join(' / ') || null,
          table: { index: tableIndex, row: rowIndex + 1,
            columns: cellTexts.map((_value, index) => index + 1) },
        });
        if (item) segments.push(item);
      }
    }
  }
  return { segments, warnings: ['Complex DOCX charts, drawings, and embedded objects are not parsed.'] };
}

export function parsePaper(path, content) {
  const extension = extname(path).toLowerCase();
  if (extension === '.md') return { type: 'md', ...parseMarkdown(content.toString('utf8')) };
  if (extension === '.tex') return { type: 'tex', ...parseLatex(content.toString('utf8')) };
  if (extension === '.docx') return { type: 'docx', ...parseDocx(content) };
  throw new Error(`Unsupported paper format: ${extension}`);
}
