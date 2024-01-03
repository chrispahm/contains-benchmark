# Contains benchmark using Python and Shapely
import numpy as np
import shapely
from shapely.geometry import shape
import time
import json
import sys

# read the geojson files as Python dicts
with open(sys.argv[1]) as f:
  pointsFC = json.load(f)
with open(sys.argv[2]) as f:
  polygon = f.read()

# convert the dicts to shapely geometries
points = np.array([shape(f["geometry"]) for f in pointsFC['features']])
polygon = shapely.from_geojson(polygon)

# measure the time of the contains operation
start = time.time()
shapely.contains(polygon, points) # use the vectorized ufunc interface
end = time.time()

# write time in ms to stdout
print(int((end - start) * 1000))
