# Benchmark of various implementations of the geospatial `contains` function

This simple benchmark tests whether a point is contained by the small scale [Natural Earth 1:110m](https://www.naturalearthdata.com/downloads/110m-physical-vectors/) land dataset for a set of 1000 random points (point-in-polygon test). The test is implemented in various languages (JS, Python, C, Rust) and libraries ([GEOS](https://libgeos.org/), [Turf.js](https://turfjs.org/), [geo](https://github.com/georust/geo)).

## Results

| Implementation of<br>point-in-polygon test | Time (ms, lower is better)  |
|------------------ |---------------------------- |
| [GEOS-WASM (JS)](./src/contains.mjs)    | 2074                        |
| [Shapely (Python)](./src/contains.py)  | 1814                        |
| [GEOS (C-API)](./src/contains.c)      | 1784                        |
| [Turf.js (JS)](./src/contains.turf.mjs)      | 29                          |
| [geo (Rust)](./src/contains.rs)        | 3                           |

(Tested on a 2021 14" MacBook Pro M1)

## Background & Discussion

While working on the [GEOS-WASM](https://github.com/chrispahm/geos-wasm) package, I was wondering how the performance of the WebAssembly build compares to Shapely (Python).

Shapely links to the native GEOS library using the C-API and allows to use a [vectorized ufunc interface](https://shapely.readthedocs.io/en/stable/#what-is-a-ufunc) to improve performance. The GEOS-WASM package on the other hand is a pure WebAssembly build of GEOS using [Emscripten](https://emscripten.org/), which is called from JS without any additional optimisations.

As a (first) simple benchmark, I chose a point-in-polygon test that I found in [this blog post](https://github.com/guidorice/devblog/blob/master/src/pages/points-within-polygons/index.md) by Guido Rice. The test is simple: a set of 1000 random points is tested against the small scale [Natural Earth 1:110m](https://www.naturalearthdata.com/downloads/110m-physical-vectors/) land dataset. Note that the test only measures the time to perform the point-in-polygon test, not the time to load the dataset and create the geometries.

Running this test, I find GEOS-WASM to be taking around ~2074 ms to complete on my machine, which is about 17% slower than native GEOS (1784 ms), and about 15% slower than the vectorised Shapely implementation (1814 ms). That's quite good, considering that other benchmarks found WebAssembly to be 50%-250% slower than native code (see [here](https://00f.net/2023/01/04/webassembly-benchmark-2023/) and [here](https://www.usenix.org/conference/atc19/presentation/jangda))!

Apart from [optimizing the Emscripten build](https://emscripten.org/docs/optimizing/Optimizing-Code.html), I don't see any obvious performance improvements that could be applied to the JS side of things though. One could argue that vectorizing the code, aka moving the loops from JS to WASM, would improve performance. However, since most JS engines JIT compile and optimize hot loops, the performance gain is likely to be marginal compared to doing the same thing in (standard) interpreted Python (see [here for more info on recent JIT developments in V8](https://v8.dev/blog/maglev)).

Since GEOS-WASM is targeted for use in web browsers, I was also wondering how its performance compares to the de-facto standard web geospatial library [Turf.js](https://turfjs.org/). While at it, I also gave [GeoRust](https://github.com/georust/geo) a shot. GeoRust is an up and coming Rust library which can be compiled to WebAssembly as well (see [geoarrow-rs](https://github.com/geoarrow/geoarrow-rs) by Kyle Barron), and using it has been on my todo list for a while now!

As you can see, Rusts geo is *super* fast performing this task ([not that I hadn't been told so before](https://kylebarron.dev/blog/geos-wasm) 🙂)! What suprises me most about the results is that Turfs [`booleanContains`](https://github.com/Turfjs/turf/blob/master/packages/turf-boolean-contains/index.ts) seems to complete the task almost 62x faster than [GEOSPreparedContains](https://libgeos.org/doxygen/geos__c_8h.html#a57229f3a88bf13809ea369f403dc9855) from the C-API, though.

I tried to look through the GEOS source code, but so far can't really tell which algorithm is used for the point-in-polygon test or what might be a bottleneck for this particular test case. From a first glance, it seems that in the [`contains`](https://github.com/libgeos/geos/blob/0aef713ac930e7247c50a1ae720c36f0f0bf790a/src/geom/Geometry.cpp#L375) method GEOS internally creates an [IntersectionMatrix](https://github.com/libgeos/geos/blob/0aef713ac930e7247c50a1ae720c36f0f0bf790a/src/geom/Geometry.cpp#L406), which is then used to determine if it fulfills the "contains" criteria (see [`isContains()`](https://github.com/libgeos/geos/blob/main/src/geom/IntersectionMatrix.cpp#L279)). There's an [issue in the PDAL library](https://github.com/PDAL/PDAL/issues/1735) that discusses the performance of the GEOS `contains` method, however the suggested solution (using `GEOSPreparedContainsXY` instead of `GEOSPreparedContains`) didn't seem to improve the performance in my case. Also, it feels kind of strange to hit such a bottleneck with this relatively small test (127 polygons against 1000 points)...

Turf.js uses the [point-in-polygon-hao](https://github.com/rowanwins/point-in-polygon-hao) package for the actual point-in-polygon test, which is based on [this paper](https://www.researchgate.net/publication/328261365_Optimal_Reliable_Point-in-Polygon_Test_and_Differential_Coding_Boolean_Operations_on_Polygons). It's important to note that there are [some open issues](https://github.com/Turfjs/turf/labels/%40turf%2Fboolean-contains) with Turfs `booleanContains` implementation though, e.g. returning wrong results in some edge cases.

GeoRust seems to be using the [Winding number algorithm](https://en.wikipedia.org/wiki/Point_in_polygon#Winding_number_algorithm) as noted in the [source code](https://github.com/georust/geo/blob/47fadf1d507fd18a40921be28ee52e1ada6def04/geo/src/algorithm/coordinate_position.rs#L366C13-L366C84). It seems there are no open issues with regards to the `contains` method, yet GeoRust is still a relatively young project and not as battle tested as GEOS with its widespread use in PostGIS and Shapely.

Closing this, I'd like to note that this benchmark is by no means a comprehensive comparison of the various libraries. It's just a simple test that I ran out of curiosity. I'm certainly happy that the WebAssembly build of GEOS performs better than expected, yet I'll probably open an issue in the GEOS repo to see if there's anything that can be done to improve the performance of the `contains` method for this kind of test!

If you have any comments or suggestions, please feel free to open an issue or PR, or send me a mail!

## Running the benchmark yourself

### Prerequisites

- Python > 3.7
- Bun >= 1.0.0
- Rust >= 1.31.0
- CLANG >= 7.0.0

### Setup

1. Install dependencies (only needed once)

```bash
make install
```

2. Run the benchmark

```bash
make run
```

If you want to run the benchmark with different datasets, you can adapt the relevant path strings in the `benchmark.mjs` 
or run the single implementations directly. The datasets are passed as arguments as shown in the following examples:

```bash
# JS -> GEOS-WASM
bun ./out/contains.mjs ./data/1000_random_points.geojson ./data/ne_110m_land.geojson
# C -> GEOS
./out/contains.outc ./data/10000_random_points.geojson ./data/ne_10m_land.geojson
# Python -> Shapely
python ./out/contains.py ./data/10000_random_points.geojson ./data/ne_10m_land.geojson
# Rust -> geo
./out/contains.outrs ./data/10000_random_points.geojson ./data/ne_10m_land.geojson
# JS -> Turf.js
bun ./out/contains.turf.mjs ./data/10000_random_points.geojson ./data/ne_10m_land.geojson
```