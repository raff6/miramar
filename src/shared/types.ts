// Esquema común al que todos los scrapers deben normalizar sus resultados.
// Cada scraper puede extraer datos distintos de cada sitio, pero siempre
// tiene que devolver objetos con esta forma.

export interface Property {
  // Identificador único y estable (para detectar duplicados / cambios de precio)
  id: string;                // ej: "murga-7347" o hash(url)
  source: string;            // nombre de la inmobiliaria, ej: "Oscar Murga"
  sourceUrl: string;         // URL a la publicación original
  title: string;
  price: number | null;      // valor numérico, sin símbolo
  currency: "USD" | "ARS" | null;
  operation: "venta";        // por ahora solo nos interesa venta
  propertyType: string;      // "Departamento", "PH", etc (tal cual lo reporta el sitio)
  rooms: number | null;      // ambientes
  bedrooms: number | null;
  bathrooms: number | null;
  coveredArea: number | null;  // m2 cubiertos
  totalArea: number | null;    // m2 totales
  zone: string | null;         // "Zona I", "Zona II", barrio, etc
  address: string | null;
  description: string | null;
  images: string[];
  scrapedAt: string;          // ISO timestamp de esta corrida
  firstSeenAt: string;        // ISO timestamp de la primera vez que se vio este aviso
}

export interface Scraper {
  name: string;               // nombre de la inmobiliaria (o "Portal - X" si agrupa varias)
  run(): Promise<Property[]>;
}
