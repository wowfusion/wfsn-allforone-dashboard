/**
 * Generiert ein Cover-Bild für Discord Scheduled Events.
 * Nutzt @napi-rs/canvas für echtes Font-Rendering mit Outfit-Bold.
 * Schriftgröße wird dynamisch an die Titellänge angepasst.
 */

import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';

const BANNER_PATH = path.join(process.cwd(), 'public', 'images', 'allforone_banner_discordevent.png');
const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'Outfit-Bold.ttf');

/** Gilden-Gold (#CEB788) */
const TEXT_COLOR = '#CEB788';
const SHADOW_COLOR = 'rgba(0,0,0,0.6)';

/** Maximale Breite die der Text belegen darf (% der Canvas-Breite) */
const MAX_TEXT_WIDTH_RATIO = 0.85;

/** Schriftgrößen-Grenzen in px */
const MAX_FONT_SIZE = 58;
const MIN_FONT_SIZE = 18;

let fontRegistered = false;

/** Registriert den Outfit-Font einmalig global */
function ensureFont() {
  if (!fontRegistered && fs.existsSync(FONT_PATH)) {
    GlobalFonts.registerFromPath(FONT_PATH, 'Outfit');
    fontRegistered = true;
  }
}

/**
 * Bricht Text in Zeilen auf damit keine Zeile breiter als maxWidth ist.
 * Nutzt Canvas-measureText für pixelgenaue Messung.
 */
function wrapText(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
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
 * Findet die größtmögliche Schriftgröße bei der der Text noch in
 * maxWidth passt (mit maximal `maxLines` Zeilen).
 */
function calcFontSize(
  ctx: SKRSContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): { fontSize: number; lines: string[] } {
  for (let size = MAX_FONT_SIZE; size >= MIN_FONT_SIZE; size -= 2) {
    ctx.font = `700 ${size}px Outfit`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { fontSize: size, lines };
    }
  }
  // Fallback: Mindestgröße, egal wie viele Zeilen
  ctx.font = `700 ${MIN_FONT_SIZE}px Outfit`;
  return { fontSize: MIN_FONT_SIZE, lines: wrapText(ctx, text, maxWidth) };
}

/**
 * Erstellt ein Base64-kodiertes PNG mit dem Banner-Hintergrundbild
 * und dem zentrierten Titel in der Gilden-Akzentfarbe (#CEB788).
 * Die Schriftgröße wird dynamisch so gewählt dass der Text gut passt.
 *
 * @param title - Der Titel des Events/Raids
 * @returns Base64 Data-URI (image/png) für die Discord API
 */
export async function generateEventCover(title: string): Promise<string> {
  ensureFont();

  const bannerBuffer = fs.readFileSync(BANNER_PATH);
  const bannerImage = await loadImage(bannerBuffer);

  const width = bannerImage.width;
  const height = bannerImage.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Hintergrundbild zeichnen
  ctx.drawImage(bannerImage, 0, 0, width, height);

  const maxTextWidth = Math.round(width * MAX_TEXT_WIDTH_RATIO);

  // Dynamische Schriftgröße: bis zu 3 Zeilen erlaubt
  const { fontSize, lines } = calcFontSize(ctx, title, maxTextWidth, 3);

  ctx.font = `700 ${fontSize}px Outfit`;
  const lineHeight = Math.round(fontSize * 1.45);
  const totalTextHeight = lines.length * lineHeight;
  const startY = Math.round((height - totalTextHeight) / 2) + fontSize;

  // Jede Zeile zentriert mit Schlagschatten rendern
  for (let i = 0; i < lines.length; i++) {
    const x = width / 2;
    const y = startY + i * lineHeight;

    // Schatten (leicht versetzt)
    ctx.fillStyle = SHADOW_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(lines[i], x + 2, y + 2);

    // Haupttext in Gilden-Gold
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(lines[i], x, y);
  }

  const buffer = canvas.toBuffer('image/png');
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
