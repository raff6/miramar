import fs from "fs";
import path from "path";
import { Scraper, Property } from "./shared/types";
import { inmueblesEnMiramarScraper } from "./scrapers/inmueblesenmiramar";
import { ofarrellScraper } from "./scrapers/ofarrell";
import { gabarainScraper } from "./scrapers/gabarain";
// Remax y Analía Verga son sitios que cargan todo con JavaScript (SPA),
// necesitan un navegador headless (Playwright) o su API interna. Quedan
// pendientes — ver README para el detalle de por qué.
// import { remaxScraper } from "./scrapers/remax";
// import { analiaVergaScraper } from "./scrapers/analiaverga";

const scrapers: Scraper[] = [
  inmueblesEnMiramarScraper, // 11 inmobiliarias
  ofarrellScraper,
  gabarainScraper,
];

async function main() {
  const results: Property[] = [];
  const summary: Record<string, number | string> = {};

  for (const scraper of scrapers) {
    console.log(`\n=== Corriendo scraper: ${scraper.name} ===`);
    try {
      const props = await scraper.run();
      results.push(...props);
      summary[scraper.name] = props.length;
      console.log(`✓ ${scraper.name}: ${props.length} propiedades`);
    } catch (err) {
      summary[scraper.name] = `ERROR: ${(err as Error).message}`;
      console.error(`✗ ${scraper.name} falló:`, err);
    }
  }

  const outDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, "departamentos.json");
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n=== Resumen ===");
  console.table(summary);
  console.log(`\nTotal: ${results.length} propiedades guardadas en ${outFile}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
