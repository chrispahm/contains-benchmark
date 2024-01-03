// Contains benchmark using JS and GEOS-WASM

import { readFile } from 'fs/promises';
import initGeosJs from 'geos-wasm';
import { geojsonToGeosGeom } from 'geos-wasm/helpers';

const geos = await initGeosJs();

const points = JSON.parse(await readFile(process.argv[2])).features.map(f => geojsonToGeosGeom(f, geos));
const polygon = geojsonToGeosGeom(JSON.parse(await readFile(process.argv[3])), geos)
const prepared_polygon = geos.GEOSPrepare(polygon);

const start = performance.now();
points.map(p => geos.GEOSPreparedContains(prepared_polygon, p));
const end = performance.now();

// Free memory
geos.GEOSPreparedGeom_destroy(prepared_polygon);
geos.GEOSGeom_destroy(polygon);
geos.finishGEOS();

// write time in ms to stdout
console.log(~~(end - start));