import crypto from "crypto";

// Genera un id estable a partir de la URL de la publicación
export function idFromUrl(prefix: string, url: string): string {
  const hash = crypto.createHash("md5").update(url).digest("hex").slice(0, 10);
  return `${prefix}-${hash}`;
}

// Parsea strings de precio tipo "u$s 85000", "USD 85.000", "$ 12.500.000"
export function parsePrice(raw: string | null | undefined): {
  price: number | null;
  currency: "USD" | "ARS" | null;
} {
  if (!raw) return { price: null, currency: null };
  const text = raw.toLowerCase();
  const currency: "USD" | "ARS" | null = /u\$s|usd|dolar|dólar/.test(text)
    ? "USD"
    : /\$/.test(text)
    ? "ARS"
    : null;

  const numMatch = text.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const price = numMatch ? Math.round(parseFloat(numMatch)) : null;

  return { price: Number.isFinite(price as number) ? price : null, currency };
}

// Extrae el primer número de un string tipo "3 ambientes", "85 m²"
export function firstNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/[\d.,]+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Simple delay para no golpear los sitios con requests seguidos
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
