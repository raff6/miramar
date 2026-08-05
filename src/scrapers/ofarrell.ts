/**
 * Scraper para O'Farrell Propiedades (sitio propio, corre sobre Tokko Broker,
 * un CRM inmobiliario muy usado en Argentina).
 *
 * Funcionamiento:
 *  1) Lee la página de listado de "Departamentos en Venta" (server-rendered,
 *     no necesita JS) y saca los links a cada ficha (con "/p/")
 *  2) Entra a cada ficha de detalle y extrae los datos estructurados
 *
 * LIMITACIÓN CONOCIDA: la página de listado muestra ~20 de los 48 avisos
 * totales; el resto se carga con "cargar más" por JavaScript, que este
 * scraper no ejecuta. Trae menos del 100%, pero sin depender de un browser.
 */

import * as cheerio from "cheerio";
import { Property, Scraper } from "../shared/types";
import { idFromUrl, parsePrice, firstNumber, sleep } from "../shared/utils";

const BASE = "https://www.ofarrellpropiedades.com.ar";
const LIST_URL = `${BASE}/Departamentos-en-Venta`;
const DELAY_MS = 800;
const MAX_RETRIES = 3;

async function fetchHtml(url: string): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MiramarDeptosBot/1.0)" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) await sleep(1500 * attempt);
    }
  }
  throw lastError ?? new Error(`No se pudo obtener ${url}`);
}

function extractDetailLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href*="/p/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = href.startsWith("http") ? href : `${BASE}${href}`;
    links.add(abs.split("?")[0]);
  });
  return Array.from(links);
}

function parseDetail(html: string, url: string): Property | null {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "Departamento en venta";

  const priceMatch = text.match(/USD\s?[\d.,]+|U\$S\s?[\d.,]+|\$\s?[\d.,]+/i);
  const { price, currency } = parsePrice(priceMatch ? priceMatch[0] : null);

  const roomsMatch = text.match(/Ambientes\s*:?\s*(\d+)/i);
  const bedroomsMatch = text.match(/Dormitorios\s*:?\s*(\d+)/i);
  const bathroomsMatch = text.match(/Baños\s*:?\s*(\d+)/i);
  const areaMatch = text.match(/Total Construido:\s*([\d.,]+)\s*m/i);
  const zoneMatch = text.match(/Zona\s+([IVX]+)/i);

  const isMiramar = /miramar/i.test(text);
  if (!isMiramar) return null;

  const images: string[] = [];
  $('img[src*="static.tokkobroker.com/w_pics"]').each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src);
  });

  const description =
    $('meta[name="description"]').attr("content")?.trim()?.slice(0, 400) || null;

  return {
    id: idFromUrl("ofarrell", url),
    source: "O'Farrell Propiedades",
    sourceUrl: url,
    title,
    price,
    currency,
    operation: "venta",
    propertyType: "Departamento",
    rooms: roomsMatch ? firstNumber(roomsMatch[1]) : null,
    bedrooms: bedroomsMatch ? firstNumber(bedroomsMatch[1]) : null,
    bathrooms: bathroomsMatch ? firstNumber(bathroomsMatch[1]) : null,
    coveredArea: areaMatch ? firstNumber(areaMatch[1]) : null,
    totalArea: areaMatch ? firstNumber(areaMatch[1]) : null,
    zone: zoneMatch ? `Zona ${zoneMatch[1]}` : null,
    address: null,
    description,
    images,
    scrapedAt: new Date().toISOString(),
  };
}

export const ofarrellScraper: Scraper = {
  name: "O'Farrell Propiedades",

  async run(): Promise<Property[]> {
    const listHtml = await fetchHtml(LIST_URL);
    const detailLinks = extractDetailLinks(listHtml);
    console.log(`[ofarrell] ${detailLinks.length} publicaciones encontradas en el listado`);

    const properties: Property[] = [];
    for (const url of detailLinks) {
      try {
        await sleep(DELAY_MS);
        const html = await fetchHtml(url);
        const prop = parseDetail(html, url);
        if (prop) properties.push(prop);
      } catch (err) {
        console.warn(`[ofarrell] error en ${url}:`, (err as Error).message);
      }
    }

    return properties;
  },
};
