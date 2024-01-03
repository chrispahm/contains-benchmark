#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <geos_c.h>

/* A function that reads a text file and returns its contents as a string */
char *read_text_file(const char *filename)
{
  /* Declare and initialize a file pointer */
  FILE *fp = fopen(filename, "r");
  /* Check if the file was opened successfully */
  if (fp == NULL)
  {
    printf("Error: could not open file %s\n", filename);
    exit(1);
  }
  /* Get the size of the file in bytes */
  fseek(fp, 0, SEEK_END); /* move the file pointer to the end of the file */
  long size = ftell(fp);  /* get the current position of the file pointer */
  /* Allocate memory for the string */
  char *str = (char *)malloc(size + 1); /* add one byte for the null terminator */
  /* Check if the memory allocation was successful */
  if (str == NULL)
  {
    printf("Error: could not allocate memory for the string\n");
    exit(1);
  }
  /* Read the file into the string */
  rewind(fp);              /* move the file pointer back to the beginning of the file */
  fread(str, size, 1, fp); /* read the entire file into the string */
  str[size] = '\0';        /* add the null terminator at the end of the string */
  /* Close the file */
  fclose(fp);
  /* Return the string */
  return str;
}

int main(int argc, char *argv[])
{
  initGEOS(NULL, NULL);

  char *points_str = read_text_file(argv[1]);
  char *polygon_str = read_text_file(argv[2]);

  GEOSGeoJSONReader *reader = GEOSGeoJSONReader_create();
  GEOSGeometry *polygon = GEOSGeoJSONReader_readGeometry(reader, polygon_str);
  GEOSGeometry *points = GEOSGeoJSONReader_readGeometry(reader, points_str);

  free(points_str);
  free(polygon_str);
  GEOSGeoJSONReader_destroy(reader);

  // prepare the polygon geometry
  GEOSPreparedGeometry *prepared_polygon = GEOSPrepare(polygon);

  // create an array of points from the points geometry
  int length = GEOSGetNumGeometries(points);
  GEOSGeometry *points_arr[length];
  for (int i = 0; i < length; i++)
  {
    GEOSGeometry *point = GEOSGetGeometryN(points, i);
    points_arr[i] = point;
  }

  // run the benchmark
  clock_t start = clock();
  for (int i = 0; i < length; i++)
  {
    // GEOSContains(polygon, points_arr[i]);
    GEOSPreparedContains(prepared_polygon, points_arr[i]);
  }
  clock_t end = clock();

  double time_spent = (double)(end - start) / CLOCKS_PER_SEC * 1000;
  printf("%.f\n", time_spent);

  // Destroy all points
  GEOSPreparedGeom_destroy(prepared_polygon);
  GEOSGeom_destroy(points);
  GEOSGeom_destroy(polygon);
  finishGEOS();

  return 0;
}