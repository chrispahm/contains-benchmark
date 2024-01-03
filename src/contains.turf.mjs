import { readFile } from 'fs/promises';
import { booleanContains, pointsWithinPolygon } from '@turf/turf';

const points = JSON.parse(await readFile(process.argv[2]));
const polygon = JSON.parse(await readFile(process.argv[3]));

const start = performance.now();
// pointsWithinPolygon(points, polygon);
points.features.map(f => polygon.features.some(p => {
  // booleanContains does not work with MultiPolygons
  if (p.geometry.type === 'MultiPolygon') {
    return p.geometry.coordinates.some(c => booleanContains({
      type: 'Polygon',
      coordinates: c
    }, f));
  }
  return booleanContains(p, f);
}));
const end = performance.now();

// write time in ms to stdout
console.log(~~(end - start));