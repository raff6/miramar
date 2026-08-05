/**
 * Scraper para https://inmueblesenmiramar.com
 *
 * Este portal agrupa publicaciones de VARIAS inmobiliarias de tu lista:
 * Murga, Caraballo, Zamorano, Isaia, Natalia Boggio (Boggio Estudio Inmobiliario),
 * Demsar, Alvarez Barrios, Sastre, Cano (Cano Administración), Barroso, Ballarre.
 *
 * Con este único scraper cubrís 11 de las 15 inmobiliarias que pediste.
 *
 * Funcionamiento:
 *  1) Recorre la lista paginada de "Departamento en Venta" (x_Tipo=7)
 *  2) De cada card saca el link a la ficha de detalle (contiene "codigo=NNNN")
 *  3) Entra a cada ficha de detalle y extrae los datos estructurados
 *
 * IMPORTANTE: el sitio también incluye propiedades de Mar del Plata y otras
 * ciudades de la red (mismo template). Filtramos por ciudad al final.
 *
 * NOTA: este sitio (ASP viejo) tira error 500 de forma intermitente incluso
 * con URLs válidas, por eso `fetchHtml` reintenta varias veces antes de fallar.
 */

import * as cheerio from "cheerio";
import { Property, Scraper } from "../shared/types";
import { idFromUrl, parsePrice, firstNumber, sleep } from "../shared/utils";

const BASE = "https://inmueblesenmiramar.com";
const LIST_URL = (start: number) =>
  `${BASE}/venta-de-propiedades.asp?start=${start}&x_Tipo=7&z_Tipo=%3D%2C%2C&orden=0&t=0`;

const PAGE_SIZE = 10;
const DELAY_MS = 800; // no golpear el sitio con requests seguidos
const MAX_RETRIES = 4; // este sitio tira error 500 intermitente, reintentamos

async function fetchHtml(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; MiramarDeptosBot/1.0; +https://github.com/tu-usuario/miramar-deptos)",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`);
      return await res.text();
    } catch (err) {
      lastError = err as Error;
      console.warn(`  intento ${attempt}/${MAX_RETRIES} falló para ${url}: ${lastError.message}`);
      if (attempt < MAX_RETRIES) await sleep(1500 * attempt); // espera creciente
    }
  }

  throw lastError ?? new Error(`No se pudo obtener ${url}`);
}

// Saca todos los links de detalle (con "codigo=") de una página de listado
function extractDetailLinks(html: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href*="codigo="]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const abs = href.startsWith("http") ? href : `${BASE}/${href.replace(/^\//, "")}`;
    links.add(abs);
  });
  return Array.from(links);
}

// Detecta cuántas páginas hay en total mirando el bloque de paginación
function extractTotalCount(html: string): number {
  const m = html.match(/Propiedades en Venta Encontradas:\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

function parseDetail(html: string, url: string): Property | null {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();

  const agencyMatch = text.match(/ofrecido por ([^.|]+?)(?:\s*\||\.|$)/i);
  const source = agencyMatch ? agencyMatch[1].trim() : "Desconocida (portal)";

  const titleEl = $("h1").first().text().trim() || $("title").text().trim();

  const priceMatch = text.match(/u\$s\s?[\d.,]+|\$\s?[\d.,]+/i);
  const { price, currency } = parsePrice(priceMatch ? priceMatch[0] : null);

  const roomsMatch = text.match(/(\d+)\s*ambiente/i);
  const bedroomsMatch = text.match(/(\d+)\s*(dormitorio|habitaci[oó]n)/i);
  const bathroomsMatch = text.match(/(\d+)\s*ba[ñn]o/i);
  const totalAreaMatch = text.match(/superficie total\s*([\d.,]+)\s*m/i);
  const coveredAreaMatch = text.match(/superficie cubierta\s*([\d.,]+)\s*m/i);
  const zoneMatch = text.match(/en (Zona [IVX]+|[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ ]+) de Miramar/);

  const isMiramar = /miramar/i.test(text) && !/mar del plata/i.test(titleEl);

  const images: string[] = [];
  $('img[src*="/fotos/ventas/"]').each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src.startsWith("http") ? src : `${BASE}/${src.replace(/^\//, "")}`);
  });

  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    text.slice(0, 400);

  if (!isMiramar) return null;

  return {
    id: idFromUrl("iem", url),
    source,
    sourceUrl: url,
    title: titleEl,
    price,
    currency,
    operation: "venta",
    propertyType: "Departamento",
    rooms: roomsMatch ? firstNumber(roomsMatch[0]) : null,
    bedrooms: bedroomsMatch ? firstNumber(bedroomsMatch[0]) : null,
    bathrooms: bathroomsMatch ? firstNumber(bathroomsMatch[0]) : null,
    coveredArea: coveredAreaMatch ? firstNumber(coveredAreaMatch[1]) : null,
    totalArea: totalAreaMatch ? firstNumber(totalAreaMatch[1]) : null,
    zone: zoneMatch ? zoneMatch[1] : null,
    address: null,
    description,
    images,
    scrapedAt: new Date().toISOString(),
  };
}

export const inmueblesEnMiramarScraper: Scraper = {
  name: "Portal - inmueblesenmiramar.com (11 inmobiliarias)",

  async run(): Promise<Property[]> {
    const firstPageHtml = await fetchHtml(LIST_URL(0));
    const total = extractTotalCount(firstPageHtml);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    console.log(`[inmueblesenmiramar] ${total} deptos encontrados, ${totalPages} páginas`);

    const allDetailLinks = new Set<string>(extractDetailLinks(firstPageHtml));

    for (let page = 1; page < totalPages; page++) {
      await sleep(DELAY_MS);
      const html = await fetchHtml(LIST_URL(page * PAGE_SIZE));
      extractDetailLinks(html).forEach((l) => allDetailLinks.add(l));
    }

    console.log(`[inmueblesenmiramar] ${allDetailLinks.size} publicaciones únicas a visitar`);

    const properties: Property[] = [];
    for (const url of allDetailLinks) {
      try {
        await sleep(DELAY_MS);
        const html = await fetchHtml(url);
        const prop = parseDetail(html, url);
        if (prop) properties.push(prop);
      } catch (err) {
        console.warn(`[inmueblesenmiramar] error en ${url}:`, (err as Error).message);
      }
    }

    return properties;
  },
};
