// Contains benchmark using Rust and geo
use geo::Contains;
use geo_types::GeometryCollection;
use geojson::{quick_collection, GeoJson};
use arrow::array::BooleanBuilder;
use std::fs;
use std::time::Instant;
use std::env;

fn main() {
  let args: Vec<String> = env::args().collect();
  // read the geojson files as GeoJson structs
  let points_str = fs::read_to_string(&args[1])
      .expect("Unable to read file");
  let points_fc = points_str.parse::<GeoJson>().unwrap();
  // let points = geojson::FeatureCollection::try_from(pointsFC).unwrap();
  let points: GeometryCollection<f64> = quick_collection(&points_fc).unwrap();

  let polygon_str = fs::read_to_string(&args[2])
      .expect("Unable to read file");
  let polygon_fc = polygon_str.parse::<GeoJson>().unwrap();  
  let polygon: GeometryCollection<f64> = quick_collection(&polygon_fc).unwrap();

  // create an empty vector of booleans to store the results
  let mut builder = BooleanBuilder::new();

  // measure the time of the contains operation
  let start = Instant::now();
  for point in &points {
      // polygon is a GeometryCollection, we can't use contains directly as it's not implemented
      builder.append_value(polygon.iter().any(|p| p.contains(point)));
  }
  let end = start.elapsed();  
  let result = builder.finish();
  
  let _values: Vec<_> = result.iter().collect();
  // println!("{:?}", _values);
  // write time in ms to stdout
  println!("{}", end.as_millis());
}