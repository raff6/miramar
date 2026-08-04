import fs from "fs";
import path from "path";
import { Scraper, Property } from "./shared/types";
import { inmueblesEnMiramarScraper } from "./scrapers/inmueblesenmiramar";
// Estos 4 todavía son borradores (selectores sin terminar) — quedan comentados
// para que el scraper automático no falle. Se pueden sumar cuando estén listos:
// import { remaxScraper } from "./scrapers/remax";
// import { ofarrellScraper } from "./scrapers/ofarrell";
// import { gabarainScraper } from "./scrapers/gabarain";
// import { analiaVergaScraper } from "./scrapers/analiaverga";

// El del portal ya cubre 11 de las 15 inmobiliarias por sí solo.
const scrapers: Scraper[] = [
  inmueblesEnMiramarScraper,
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
