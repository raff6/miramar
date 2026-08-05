/**
 * Scraper para Inmobiliaria Gabarain (la que mencionaste como "Cabaraian").
 *
 * Esta inmobiliaria opera en Miramar, Otamendi y Mar del Plata, y mezcla en
 * el mismo listado casas, departamentos, locales y lotes. Filtramos por tipo
 * (usando el patrón de la URL, que siempre arranca con "departamentos-en-")
 * y por ciudad (Miramar).
 *
 * Funcionamiento:
 *  1) Recorre las páginas del listado de ventas (11 páginas al momento de escribir esto)
 *  2) Saca los links a cada ficha ("/propiedad/...")
 *  3) Entra a cada ficha y extrae los datos
 */

import * as cheerio from "cheerio";
import { Property, Scraper } from "../shared/types";
import { idFromUrl, parsePrice, firstNumber, sleep } from "../shared/utils";

const BASE = "https://www.inmobiliariagabarain.com.ar";
const LIST_URL = (page: number) =>
  page === 1 ? `${BASE}/propiedades/venta/` : `${BASE}/propiedades/venta/${page}`;

const MAX_PAGES = 11; // ajustar si la inmobiliaria suma más propiedades en el futuro
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
  $('a[href*="/propiedad/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = href.startsWith("http") ? href : `${BASE}${href}`;
    // Solo departamentos: la URL siempre arranca con "departamentos-en-venta-"
    if (/\/propiedad\/departamentos-en-venta-/.test(abs)) {
      links.add(abs);
    }
  });
  return Array.from(links);
}

function parseDetail(html: string, url: string): Property | null {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  // Excluir otras ciudades donde también opera esta inmobiliaria
  const isOtraCiudad = /mar del plata|otamendi|loberia|lober[ií]a/i.test(text.slice(0, 500));
  const isMiramar = /miramar/i.test(text);
  if (!isMiramar || isOtraCiudad) return null;

  const title =
    $("h4, h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "Departamento en venta";

  const priceMatch = text.match(/(\d[\d.,]{3,})\s*USD/);
  const { price, currency } = parsePrice(priceMatch ? priceMatch[0] : null);

  const areaMatch = text.match(/(\d+)\s*m2/i);
  const addressMatch = text.match(/(Calle|Avenida|Diagonal)[^,-]+[,-]\s*Miramar/i);

  const images: string[] = [];
  $('img[src*="/img/global/properties"]').each((_, el) => {
    const src = $(el).attr("src");
    if (src && !images.includes(src)) images.push(src);
  });

  const description =
    $('meta[name="description"]').attr("content")?.trim()?.slice(0, 400) || null;

  return {
    id: idFromUrl("gabarain", url),
    source: "Gabarain Inmobiliaria",
    sourceUrl: url,
    title,
    price,
    currency,
    operation: "venta",
    propertyType: "Departamento",
    rooms: null,
    bedrooms: null,
    bathrooms: null,
    coveredArea: areaMatch ? firstNumber(areaMatch[1]) : null,
    totalArea: areaMatch ? firstNumber(areaMatch[1]) : null,
    zone: null,
    address: addressMatch ? addressMatch[0] : null,
    description,
    images,
    scrapedAt: new Date().toISOString(),
  };
}

export const gabarainScraper: Scraper = {
  name: "Gabarain Inmobiliaria",

  async run(): Promise<Property[]> {
    const allDetailLinks = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        if (page > 1) await sleep(DELAY_MS);
        const html = await fetchHtml(LIST_URL(page));
        extractDetailLinks(html).forEach((l) => allDetailLinks.add(l));
      } catch (err) {
        console.warn(`[gabarain] no se pudo leer la página ${page}, la salteamos:`, (err as Error).message);
      }
    }

    console.log(`[gabarain] ${allDetailLinks.size} departamentos encontrados en el listado`);

    const properties: Property[] = [];
    for (const url of allDetailLinks) {
      try {
        await sleep(DELAY_MS);
        const html = await fetchHtml(url);
        const prop = parseDetail(html, url);
        if (prop) properties.push(prop);
      } catch (err) {
        console.warn(`[gabarain] error en ${url}:`, (err as Error).message);
      }
    }

    return properties;
  },
};
