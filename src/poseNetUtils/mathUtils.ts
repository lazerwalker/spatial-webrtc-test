/**
 * @license
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

interface Point {
  x: number;
  y: number;
}

function getDistance(p0: Point, p1: Point) {
  return Math.sqrt(
    (p0.x - p1.x) * (p0.x - p1.x) + (p0.y - p1.y) * (p0.y - p1.y)
  );
}

export class MathUtils {
  // Generate a transform function of p in the coordinate system defined by p0 and p1.
  static getTransformFunc(
    p0: paper.Point,
    p1: paper.Point,
    p: paper.Point
  ): (p0: paper.Point, p1: paper.Point) => void {
    let d = p1.subtract(p0);
    let dir = d.normalize();
    let l0 = d.length;
    let n = dir.clone();
    n.angle += 90;
    let v = p.subtract(p0);
    let x = v.dot(dir);
    let y = v.dot(n);
    return (p0New, p1New) => {
      let d = p1New.subtract(p0New);
      if (d.length === 0) {
        return p0New.clone();
      }
      let scale = d.length / l0;
      let dirNew = d.normalize();
      let nNew = dirNew.clone();
      nNew.angle += 90;
      return p0New
        .add(dirNew.multiply(x * scale))
        .add(nNew.multiply(y * scale));
    };
  }

  static getClosestPointOnSegment(
    p0: paper.Point,
    p1: paper.Point,
    p: paper.Point
  ): paper.Point {
    let d = p1.subtract(p0);
    let c = p.subtract(p0).dot(d) / d.dot(d);
    if (c >= 1) {
      return p1.clone();
    } else if (c <= 0) {
      return p0.clone();
    } else {
      return p0.add(d.multiply(c));
    }
  }

  // Check if v0 and v1 are collinear.
  // Returns true if cosine of the angle between v0 and v1 is within threshold to 1.
  static isCollinear(v0: paper.Point, v1: paper.Point, threshold = 0.01) {
    let colinear = false;
    if (v0 && v1) {
      let n0 = v0.normalize();
      let n1 = v1.normalize();
      colinear = Math.abs(n0.dot(n1)) > 1 - threshold;
    }
    return colinear;
  }

  static gaussian(mean: number, variance: number) {
    var u = 0,
      v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let value = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return value * variance + mean;
  }
}
