import Table from 'cli-table3';
import fs from 'fs';
import { execSync } from 'child_process';

// Get a list of uniqe file names in the benchmark directory
const files = [... new Set(
  fs.readdirSync('./src')
    .map(file => file.split('.')[0]))
].filter(f => f);

const pointsFilePath = './data/1000_random_points.geojson';
const polygonFilePath = './data/ne_110m_land.geojson';
// const polygonFilePath = './data/ne_110m_admin_0_countries.geojson';

// Run each benchmark using Python, Node.js and Bun
// -> each benchmark logs the time required to run to stdout (1 line)
const tests = [{
    name: 'GEOS-WASM (JS)',
    command: (file) => `bun ./out/${file}.mjs ${pointsFilePath} ${polygonFilePath}`
  },
  {
    name: 'Shapely (Py)',
    command: (file) => `python ./out/${file}.py ${pointsFilePath} ${polygonFilePath}`
  },
  {
    name: 'GEOS (C)',
    command: (file) => `./out/${file}.outc ${pointsFilePath} ${polygonFilePath}`
  },
  {
    name: 'Turf.js (JS)',
    command: (file) => `node ./out/${file}.turf.mjs ${pointsFilePath} ${polygonFilePath}`
  },
  {
    name: 'Geo (Rust)',
    command: (file) => `./out/${file}.outrs ${pointsFilePath} ${polygonFilePath}`
  }
];

// -> we capture this output and store it in a table
const table = new Table({
  head: ['Benchmark (time required in ms)', ...tests.map(t => t.name)],
  colWidths: [20, 20, 20, 20, 20, 20, 20],
  wordWrap: true
});

for (const file of files) {
  const row = [file];
  for (const test of tests) {
    const command = test.command(file);
    const time = execSync(command).toString()
    row.push(time);
  }
  table.push(row);
}

console.log(table.toString());