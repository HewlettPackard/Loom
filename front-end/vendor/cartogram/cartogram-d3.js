/*******************************************************************************
 * (c) Copyright 2017 Hewlett Packard Enterprise Development LP Licensed under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in compliance with the License. You
 * may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 *******************************************************************************/
define(['d3','q'], function (d3, Q) {

  var topojson = (function() {

    function merge(topology, arcs) {
      var arcsByEnd = {},
        fragmentByStart = {},
        fragmentByEnd = {};

      arcs.forEach(function(i) {
        var e = ends(i);
        (arcsByEnd[e[0]] || (arcsByEnd[e[0]] = [])).push(i);
        (arcsByEnd[e[1]] || (arcsByEnd[e[1]] = [])).push(~i);
      });

      arcs.forEach(function(i) {
        var e = ends(i),
          start = e[0],
          end = e[1],
          f, g;

        if (f = fragmentByEnd[start]) {
          delete fragmentByEnd[f.end];
          f.push(i);
          f.end = end;
          if (g = fragmentByStart[end]) {
            delete fragmentByStart[g.start];
            var fg = g === f ? f : f.concat(g);
            fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
          } else if (g = fragmentByEnd[end]) {
            delete fragmentByStart[g.start];
            delete fragmentByEnd[g.end];
            var fg = f.concat(g.map(function(i) {
              return~ i;
            }).reverse());
            fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.start] = fg;
          } else {
            fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
          }
        } else if (f = fragmentByStart[end]) {
          delete fragmentByStart[f.start];
          f.unshift(i);
          f.start = start;
          if (g = fragmentByEnd[start]) {
            delete fragmentByEnd[g.end];
            var gf = g === f ? f : g.concat(f);
            fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
          } else if (g = fragmentByStart[start]) {
            delete fragmentByStart[g.start];
            delete fragmentByEnd[g.end];
            var gf = g.map(function(i) {
              return~ i;
            }).reverse().concat(f);
            fragmentByStart[gf.start = g.end] = fragmentByEnd[gf.end = f.end] = gf;
          } else {
            fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
          }
        } else if (f = fragmentByStart[start]) {
          delete fragmentByStart[f.start];
          f.unshift(~i);
          f.start = end;
          if (g = fragmentByEnd[end]) {
            delete fragmentByEnd[g.end];
            var gf = g === f ? f : g.concat(f);
            fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
          } else if (g = fragmentByStart[end]) {
            delete fragmentByStart[g.start];
            delete fragmentByEnd[g.end];
            var gf = g.map(function(i) {
              return~ i;
            }).reverse().concat(f);
            fragmentByStart[gf.start = g.end] = fragmentByEnd[gf.end = f.end] = gf;
          } else {
            fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
          }
        } else if (f = fragmentByEnd[end]) {
          delete fragmentByEnd[f.end];
          f.push(~i);
          f.end = start;
          if (g = fragmentByEnd[start]) {
            delete fragmentByStart[g.start];
            var fg = g === f ? f : f.concat(g);
            fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
          } else if (g = fragmentByStart[start]) {
            delete fragmentByStart[g.start];
            delete fragmentByEnd[g.end];
            var fg = f.concat(g.map(function(i) {
              return~ i;
            }).reverse());
            fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.start] = fg;
          } else {
            fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
          }
        } else {
          f = [i];
          fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
        }
      });

      function ends(i) {
        var arc = topology.arcs[i],
          p0 = arc[0],
          p1 = [0, 0];
        arc.forEach(function(dp) {
          p1[0] += dp[0], p1[1] += dp[1];
        });
        return [p0, p1];
      }

      var fragments = [];
      for (var k in fragmentByEnd) fragments.push(fragmentByEnd[k]);
      return fragments;
    }

    function mesh(topology, o, filter) {
      var arcs = [];

      if (arguments.length > 1) {
        var geomsByArc = [],
          geom;

        function arc(i) {
          if (i < 0) i = ~i;
          (geomsByArc[i] || (geomsByArc[i] = [])).push(geom);
        }

        function line(arcs) {
          arcs.forEach(arc);
        }

        function polygon(arcs) {
          arcs.forEach(line);
        }

        function geometry(o) {
          geom = o;
          geometryType[o.type](o.arcs);
        }

        var geometryType = {
          LineString: line,
          MultiLineString: polygon,
          Polygon: polygon,
          MultiPolygon: function(arcs) {
            arcs.forEach(polygon);
          }
        };

        o.type === "GeometryCollection" ? o.geometries.forEach(geometry) : geometry(o);

        if (arguments.length < 3)
          for (var i in geomsByArc) arcs.push([i]);
        else
          for (var i in geomsByArc)
            if (filter((geom = geomsByArc[i])[0], geom[geom.length - 1])) arcs.push([i]);
      } else {
        for (var i = 0, n = topology.arcs.length; i < n; ++i) arcs.push([i]);
      }

      return object(topology, {
        type: "MultiLineString",
        arcs: merge(topology, arcs)
      });
    }

    function object(topology, o) {
      var tf = topology.transform,
        kx = tf.scale[0],
        ky = tf.scale[1],
        dx = tf.translate[0],
        dy = tf.translate[1],
        arcs = topology.arcs;

      function arc(i, points) {
        if (points.length) points.pop();
        for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length, x = 0, y = 0, p; k < n; ++k) points.push([
          (x += (p = a[k])[0]) * kx + dx, (y += p[1]) * ky + dy
        ]);
        if (i < 0) reverse(points, n);
      }

      function line(arcs) {
        var points = [];
        for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
        return points;
      }

      function polygon(arcs) {
        return arcs.map(line);
      }

      function geometry(o) {
        o = Object.create(o);
        o.coordinates = geometryType[o.type](o.arcs);
        return o;
      }

      var geometryType = {
        LineString: line,
        MultiLineString: polygon,
        Polygon: polygon,
        MultiPolygon: function(arcs) {
          return arcs.map(polygon);
        }
      };

      return o.type === "GeometryCollection" ? (o = Object.create(o), o.geometries = o.geometries.map(geometry), o) : geometry(o);
    }

    function reverse(array, n) {
      var t, j = array.length,
        i = j - n;
      while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
    }

    return {
      version: "0.0.3",
      mesh: mesh,
      object: object
    };
  })();

  /*
   * d3.cartogram is a d3-friendly implementation of An Algorithm to Construct
   * Continuous Area Cartograms:
   *
   * <http://chrisman.scg.ulaval.ca/G360/dougenik.pdf>
   *
   * It requires topojson to decode TopoJSON-encoded topologies:
   *
   * <http://github.com/mbostock/topojson/>
   *
   * Usage:
   *
   * var cartogram = d3.cartogram()
   *  .projection(d3.geo.albersUsa())
   *  .value(function(d) {
   *    return Math.random() * 100;
   *  });
   * d3.json("path/to/topology.json", function(topology) {
   *  var features = cartogram(topology);
   *  d3.select("svg").selectAll("path")
   *    .data(features)
   *    .enter()
   *    .append("path")
   *      .attr("d", cartogram.path);
   * });
   */
  d3.cartogram = function() {

    function carto(topology, geometries, points) {
      // copy it first
      topology = copy(topology);

      // objects are projected into screen coordinates

      // project the arcs into screen space
      var tf = transformer(topology.transform),
        x, y, len1, i1, out1, len2 = topology.arcs.length,
        i2 = 0,
        projectedArcs = new Array(len2);
      while (i2 < len2) {
        x = 0;
        y = 0;
        len1 = topology.arcs[i2].length;
        i1 = 0;
        out1 = new Array(len1);
        while (i1 < len1) {
          topology.arcs[i2][i1][0] = (x += topology.arcs[i2][i1][0]);
          topology.arcs[i2][i1][1] = (y += topology.arcs[i2][i1][1]);
          out1[i1] = projection(tf(topology.arcs[i2][i1]));
          i1++;
        }
        projectedArcs[i2++] = out1;
      }

      if(points) {
        var projectedPoints = new Array(points.length);
        i2 = 0;

        while(i2 < points.length) {
          projectedPoints[i2] = projection(points[i2]);
          ++i2;
        }
      }

      // path with identity projection
      var path = d3.geo.path()
        .projection(null);

      var objects = object(projectedArcs, {
        type: "GeometryCollection",
        geometries: geometries
      })
        .geometries.map(function(geom) {
          return {
            type: "Feature",
            id: geom.id,
            properties: properties.call(null, geom, topology),
            geometry: geom
          };
        });

      var values = objects.map(value),
        totalValue = d3.sum(values);

      var deferred = Q.defer();

      // no iterations; just return the features
      if (iterations <= 0) {
        deferred.resolve({
            features: objects,
            arcs: projectedArcs,
            points: projectedPoints
        });
        return deferred.promise;
      }

      var i = 0;

      function iter() {
        if (i++ < iterations) {
          var areas = objects.map(path.area);
          var totalArea = d3.sum(areas),
            sizeErrorsTot = 0,
            sizeErrorsNum = 0,
            meta = objects.map(function(o, j) {
              var area = Math.abs(areas[j]), // XXX: why do we have negative areas?
                v = +values[j],
                desired = totalArea * v / totalValue,
                radius = Math.sqrt(area / Math.PI),
                mass = Math.sqrt(desired / Math.PI) - radius,
                sizeError = Math.max(area, desired) / Math.min(area, desired);
              sizeErrorsTot += sizeError;
              sizeErrorsNum++;
              // console.log(o.id, "@", j, "area:", area, "value:", v, "->", desired, radius, mass, sizeError);
              return {
                id: o.id,
                area: area,
                centroid: path.centroid(o),
                value: v,
                desired: desired,
                radius: radius,
                mass: mass,
                sizeError: sizeError
              };
            });

          var sizeError = sizeErrorsTot / sizeErrorsNum,
            forceReductionFactor = 1 / (1 + sizeError);

          // console.log("meta:", meta);
          // console.log("  total area:", totalArea);
          // console.log("  force reduction factor:", forceReductionFactor, "mean error:", sizeError);

          var len1, i1, delta, len2 = projectedArcs.length,
            i2 = 0;
          while (i2 < len2) {
            len1 = projectedArcs[i2].length;
            i1 = 0;
            while (i1 < len1) {
              // create an array of vectors: [x, y]
              delta = compute_delta(meta, projectedArcs[i2][i1]);

              projectedArcs[i2][i1][0] += (delta[0] * forceReductionFactor);
              projectedArcs[i2][i1][1] += (delta[1] * forceReductionFactor);

              i1++;
            }
            i2++;
          }


          if(projectedPoints) {

            len2 = projectedPoints.length;
            i2 = 0;
            while(i2 < len2) {

              delta = compute_delta(meta, projectedPoints[i2]);

              projectedPoints[i2][0] += (delta[0] * forceReductionFactor);
              projectedPoints[i2][1] += (delta[1] * forceReductionFactor);

              i2++;
            }
            
          }

          // break if we hit the target size error
          if (sizeError <= 1) {
            //break;
            i = iterations;
          }

          setImmediate(iter);
        } else {
          deferred.resolve({
            features: objects,
            arcs: projectedArcs,
            points: projectedPoints
          });
        }
      }

      iter();

      return deferred.promise;
    }

    var iterations = 8,
      projection = d3.geo.albers(),
      properties = function(id) {
        return {};
      },
      value = function(d) {
        return 1;
      };

    var compute_delta = function(meta, vector) {
      var delta, len3, i3, centroid, mass, radius, rSquared, dx, dy, distSquared, dist, Fij;
      delta = [0, 0];
      len3 = meta.length;
      i3 = 0;
      while (i3 < len3) {
        centroid = meta[i3].centroid;
        mass = meta[i3].mass;
        radius = meta[i3].radius;
        rSquared = (radius * radius);
        dx = vector[0] - centroid[0];
        dy = vector[1] - centroid[1];
        distSquared = dx * dx + dy * dy;
        dist = Math.sqrt(distSquared);
        Fij = (dist > radius) ? mass * radius / dist : mass *
          (distSquared / rSquared) *
          (4 - 3 * dist / radius);
        delta[0] += (Fij * cosArctan(dy, dx));
        delta[1] += (Fij * sinArctan(dy, dx));
        i3++;
      }

      return delta;
    };

    // for convenience
    carto.path = d3.geo.path()
      .projection(null);

    carto.iterations = function(i) {
      if (arguments.length) {
        iterations = i;
        return carto;
      } else {
        return iterations;
      }
    };

    carto.value = function(v) {
      if (arguments.length) {
        value = d3.functor(v);
        return carto;
      } else {
        return value;
      }
    };

    carto.projection = function(p) {
      if (arguments.length) {
        projection = p;
        return carto;
      } else {
        return projection;
      }
    };

    carto.feature = function(topology, geom) {
      return {
        type: "Feature",
        id: geom.id,
        properties: properties.call(null, geom, topology),
        geometry: {
          type: geom.type,
          coordinates: topojson.object(topology, geom).coordinates
        }
      };
    };

    carto.features = function(topo, geometries) {
      return geometries.map(function(f) {
        return carto.feature(topo, f);
      });
    };

    carto.properties = function(props) {
      if (arguments.length) {
        properties = d3.functor(props);
        return carto;
      } else {
        return properties;
      }
    };

    return carto;
  };

  var transformer = d3.cartogram.transformer = function(tf) {
    var kx = tf.scale[0],
      ky = tf.scale[1],
      dx = tf.translate[0],
      dy = tf.translate[1];

    function transform(c) {
      return [c[0] * kx + dx, c[1] * ky + dy];
    }

    transform.invert = function(c) {
      return [(c[0] - dx) / kx, (c[1] - dy) / ky];
    };

    return transform;
  };

  function angle(a, b) {
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }

  function distance(a, b) {
    var dx = b[0] - a[0],
      dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function projector(proj) {
    var types = {
      Point: proj,
      LineString: function(coords) {
        return coords.map(proj);
      },
      MultiLineString: function(arcs) {
        return arcs.map(types.LineString);
      },
      Polygon: function(rings) {
        return rings.map(types.LineString);
      },
      MultiPolygon: function(rings) {
        return rings.map(types.Polygon);
      }
    };
    return function(geom) {
      return types[geom.type](geom.coordinates);
    };
  }

  function cosArctan(dx, dy) {
    var div = dx / dy;
    return (dy > 0) ?
      (1 / Math.sqrt(1 + (div * div))) :
      (-1 / Math.sqrt(1 + (div * div)));
  }

  function sinArctan(dx, dy) {
    var div = dx / dy;
    return (dy > 0) ?
      (div / Math.sqrt(1 + (div * div))) :
      (-div / Math.sqrt(1 + (div * div)));
  }

  function copy(o) {
    return (o instanceof Array) ? o.map(copy) : (typeof o === "string" || typeof o === "number") ? o : copyObject(o);
  }

  function copyObject(o) {
    var obj = {};
    for (var k in o) obj[k] = copy(o[k]);
    return obj;
  }

  function object(arcs, o) {
    function arc(i, points) {
      if (points.length) points.pop();
      for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
        points.push(a[k]);
      }
      if (i < 0) reverse(points, n);
    }

    function line(arcs) {
      var points = [];
      for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
      return points;
    }

    function polygon(arcs) {
      return arcs.map(line);
    }

    function geometry(o) {
      o = Object.create(o);
      o.coordinates = geometryType[o.type](o.arcs);
      return o;
    }
    var geometryType = {
      LineString: line,
      MultiLineString: polygon,
      Polygon: polygon,
      MultiPolygon: function(arcs) {
        return arcs.map(polygon);
      }
    };

    return o.type === "GeometryCollection" ? (o = Object.create(o), o.geometries = o.geometries.map(geometry), o) : geometry(o);
  }

  function reverse(array, n) {
    var t, j = array.length,
      i = j - n;
    while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
  }

  // if (typeof define === "function" && define.amd) {
  //   define(['d3'], function (d3) {
  //     d3.cartogram = cartogram;
  //   });
  // } else {
  //   this.d3.cartogram = cartogram;
  // }
}); //();