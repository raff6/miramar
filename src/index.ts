import fs from "fs";
import path from "path";
import { Scraper, Property } from "./shared/types";
import { shortenAgencyName } from "./shared/utils";
import { inmueblesEnMiramarScraper } from "./scrapers/inmueblesenmiramar";
import { ofarrellScraper } from "./scrapers/ofarrell";
import { gabarainScraper } from "./scrapers/gabarain";

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

  // Leer la corrida anterior (si existe) para saber qué avisos ya conocíamos,
  // y así poder marcar como "nuevos" a los que no estaban antes.
  const previousFirstSeen = new Map<string, string>();
  if (fs.existsSync(outFile)) {
    try {
      const previous: Property[] = JSON.parse(fs.readFileSync(outFile, "utf-8"));
      for (const p of previous) {
        previousFirstSeen.set(p.id, p.firstSeenAt || p.scrapedAt);
      }
    } catch {
      console.warn("No se pudo leer la corrida anterior, se trata todo como nuevo.");
    }
  }

  const now = new Date().toISOString();
  const finalResults: Property[] = results.map((p) => ({
    ...p,
    source: shortenAgencyName(p.source),
    firstSeenAt: previousFirstSeen.get(p.id) || now,
  }));

  const newCount = finalResults.filter((p) => p.firstSeenAt === now).length;

  fs.writeFileSync(outFile, JSON.stringify(finalResults, null, 2), "utf-8");

  console.log("\n=== Resumen ===");
  console.table(summary);
  console.log(`\nTotal: ${finalResults.length} propiedades guardadas en ${outFile}`);
  console.log(`Nuevas desde la última corrida: ${newCount}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
