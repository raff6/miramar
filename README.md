# Miramar Deptos

Scraper de departamentos en venta en Miramar (Buenos Aires) de varias inmobiliarias, con web para filtrar y comparar.

## Estado del proyecto

| Inmobiliaria | Fuente | Estado |
|---|---|---|
| Murga | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Caraballo | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Zamorano | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Isaia | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Natalia Boggio | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Demsar | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Olga Alvarez Barrios | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Sastre | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Cano | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Barroso | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Ballarre ("Ballarde") | Portal inmueblesenmiramar.com | ✅ Cubierta por `inmueblesenmiramar.ts` |
| Remax | remax.com.ar (propio) | 🚧 Esqueleto en `remax.ts`, necesita Playwright (sitio con JS) |
| O'Farrell | ofarrellpropiedades.com.ar (propio) | 🚧 Esqueleto en `ofarrell.ts`, faltan selectores reales |
| "Cabaraian" → **Gabarain** Inmobiliaria | inmobiliariagabarain.com.ar (propio) | 🚧 Esqueleto en `gabarain.ts`, faltan selectores reales |
| Analía Verga | analiavergapropiedades.com (propio) | 🚧 Esqueleto en `analiaverga.ts`, faltan selectores reales |

**Nota sobre "Cabaraian":** no encontré ninguna inmobiliaria con ese nombre exacto en Miramar.
Lo más cercano por fonética/ortografía es **Gabarain Inmobiliaria** (Otamendi / Miramar / Mar del Plata).
Si te referías a otra, avisame el nombre correcto o el sitio.

### Por qué el portal es tan valioso

`inmueblesenmiramar.com` agrupa las publicaciones de 11 martilleros distintos bajo el mismo
sistema, con URLs y estructura de HTML consistentes. Con **un solo scraper** cubrís el 73% de
tu lista, en vez de mantener 11 scrapers distintos.

## Cómo correrlo

```bash
npm install
npx playwright install chromium   # solo necesario para el scraper de Remax

npm run scrape                     # corre todos los scrapers, guarda data/departamentos.json
```

El resultado queda en `data/departamentos.json`, con este esquema por propiedad
(ver `src/shared/types.ts`):

```json
{
  "id": "iem-a1b2c3d4e5",
  "source": "Isaia Inmobiliaria",
  "sourceUrl": "https://inmueblesenmiramar.com/ver-propiedad-venta.asp?...",
  "title": "...",
  "price": 55000,
  "currency": "USD",
  "rooms": 2,
  "bedrooms": 1,
  "zone": "Zona I",
  ...
}
```

## Web

Está en `web/index.html` — sin build step, HTML+CSS+JS plano. Lee `data/departamentos.json`
(el archivo que genera `npm run scrape`) y muestra tarjetas filtrables por inmobiliaria, zona,
ambientes y precio, ordenables por precio.

Como abrir el HTML directo con `file://` bloquea el `fetch` del JSON por CORS, hace falta un
servidor estático simple:

```bash
npm run scrape          # genera data/departamentos.json
npx serve .              # o: python3 -m http.server
# abrí http://localhost:3000/web/  (o el puerto que indique)
```

Si todavía no corriste los scrapers, la web se ve igual con datos de ejemplo (`DEMO_DATA` en
el script) para que puedas revisar el diseño sin esperar.

### Diseño

Estética basada en las placas de directorio y carteles de los edificios de Miramar de los 60/70
(los mismos "Edificio Sur", "Edificio Playa" que aparecen en las publicaciones): tarjetas tipo
placa esmaltada, tipografía condensada de cartelería costera (Archivo Expanded) + mono para
precios y specs (IBM Plex Mono), paleta de estuco/atlántico/terracota en vez del beige+serif
genérico. El borde ondulado del header hace de guiño a la Costanera.

## Próximos pasos sugeridos

1. **Verificar el scraper del portal en tu máquina** (`npm run scrape`) y ajustar los
   regex/selectores de `parseDetail` en `src/scrapers/inmueblesenmiramar.ts` si algo
   no matchea bien contra el HTML real (yo lo armé mirando el contenido pero sin poder
   ejecutar código contra el sitio desde este entorno).
2. **Completar los 4 scrapers individuales** (Remax, O'Farrell, Gabarain, Analía Verga):
   abrir cada sitio, inspeccionar con devtools el HTML de una card de resultado, y
   completar los selectores marcados con `TODO`.
3. **Automatizar**: el workflow en `.github/workflows/scrape.yml` ya está listo para
   correr todos los días vía GitHub Actions y commitear el JSON actualizado.
4. **Frontend**: una vez que `data/departamentos.json` tenga datos reales, armamos la
   web con filtros (precio, ambientes, inmobiliaria, zona) — puede ser Next.js leyendo
   directo ese JSON, o con una API + base de datos si querés histórico de precios.

## Buenas prácticas de scraping usadas acá

- Delay entre requests (no golpear los sitios seguido)
- User-Agent identificable
- Manejo de errores por scraper individual (si uno falla, no tira abajo a los demás)
- IDs estables por URL (para poder detectar duplicados/cambios de precio en el futuro)

Antes de scrapear en serio, revisá el `robots.txt` de cada sitio propio (el portal y los
sitios de las inmobiliarias) para respetar cualquier restricción.
