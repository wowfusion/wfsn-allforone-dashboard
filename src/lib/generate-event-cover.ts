/**
 * Generiert ein Cover-Bild für Discord Scheduled Events.
 * Lädt das statische Banner-Bild und rendert den Event-Titel
 * zentriert darüber in der Gilden-Akzentfarbe (#CEB788).
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const BANNER_PATH = path.join(process.cwd(), 'public', 'images', 'allforone_banner_discordevent.png');

/** Gilden-Gold (#CEB788) als RGBA */
const TEXT_COLOR = { r: 206, g: 183, b: 136, alpha: 1 };

/** Schriftgröße relativ zur Bildbreite, damit lange Titel passen */
const FONT_SIZE_RATIO = 0.065;
const MIN_FONT_SIZE = 28;
const MAX_FONT_SIZE = 72;

/** Bricht einen langen Titel bei ~20 Zeichen in mehrere Zeilen auf */
function wrapTitle(title: string, maxCharsPerLine = 22): string[] {
  const words = title.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/**
 * Erstellt ein Base64-kodiertes PNG mit dem Banner-Hintergrundbild
 * und dem zentrierten Titel in Amber-400 Schriftfarbe.
 *
 * @param title - Der Titel des Events/Raids
 * @returns Base64 Data-URI (image/png) für die Discord API
 */
export async function generateEventCover(title: string): Promise<string> {
  const bannerBuffer = fs.readFileSync(BANNER_PATH);
  const meta = await sharp(bannerBuffer).metadata();

  const width = meta.width ?? 800;
  const height = meta.height ?? 300;

  const fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(width * FONT_SIZE_RATIO)));
  const lineHeight = Math.round(fontSize * 1.35);

  const lines = wrapTitle(title);
  const totalTextHeight = lines.length * lineHeight;
  const startY = Math.round((height - totalTextHeight) / 2) + fontSize;

  // SVG-Overlay mit zentriertem Text und leichtem Schatten für Lesbarkeit
  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      return `
        <text
          x="50%"
          y="${y}"
          text-anchor="middle"
          dominant-baseline="auto"
          font-family="'Arial Black', 'Impact', sans-serif"
          font-size="${fontSize}"
          font-weight="900"
          fill="#000000"
          fill-opacity="0.6"
          dx="2"
          dy="2"
        >${escapedLine}</text>
        <text
          x="50%"
          y="${y}"
          text-anchor="middle"
          dominant-baseline="auto"
          font-family="'Arial Black', 'Impact', sans-serif"
          font-size="${fontSize}"
          font-weight="900"
          fill="rgb(${TEXT_COLOR.r}, ${TEXT_COLOR.g}, ${TEXT_COLOR.b})"
        >${escapedLine}</text>`;
    })
    .join('');

  const svgOverlay = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      ${textElements}
    </svg>`;

  const resultBuffer = await sharp(bannerBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        blend: 'over',
      },
    ])
    .png()
    .toBuffer();

  return `data:image/png;base64,${resultBuffer.toString('base64')}`;
}
