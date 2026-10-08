// Signed distance functions for prop collision primitives (brief §4.G.6). Pure arithmetic, no allocation.
// Exact SDFs for capsule, capped cone (axis +y) and rounded box; ellipsoid uses Inigo Quilez's "improved"
// approximation k0·(k0−1)/k1 (first-order exact at the surface, which is where collision decisions are made).
//
// Box yaw follows three.js Object3D.rotation.y: world = R_y(yaw)·local, i.e. local +x maps to (cos yaw, 0, −sin yaw).

export function sdCapsule(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  r: number,
): number {
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const bb = bax * bax + bay * bay + baz * baz;
  let h = bb > 0 ? (pax * bax + pay * bay + paz * baz) / bb : 0;
  if (h < 0) h = 0;
  else if (h > 1) h = 1;
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

/**
 * Exact capped (truncated) cone, axis +y.
 * (bx, by, bz) = center of the BASE disk, h = full height, r0 = base radius, r1 = top radius.
 */
export function sdCone(
  px: number, py: number, pz: number,
  bx: number, by: number, bz: number,
  h: number, r0: number, r1: number,
): number {
  const hh = 0.5 * h;
  const dx = px - bx;
  const dz = pz - bz;
  const qx = Math.sqrt(dx * dx + dz * dz);
  const qy = py - (by + hh);
  // IQ sdCappedCone(p, h=hh, r1=r0 (bottom), r2=r1 (top))
  const k1x = r1;
  const k1y = hh;
  const k2x = r1 - r0;
  const k2y = 2 * hh;
  const rr = qy < 0 ? r0 : r1;
  const cax = qx - (qx < rr ? qx : rr);
  const cay = (qy < 0 ? -qy : qy) - hh;
  const k2d = k2x * k2x + k2y * k2y;
  let t = k2d > 0 ? ((k1x - qx) * k2x + (k1y - qy) * k2y) / k2d : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cbx = qx - k1x + k2x * t;
  const cby = qy - k1y + k2y * t;
  const s = cbx < 0 && cay < 0 ? -1 : 1;
  const da = cax * cax + cay * cay;
  const db = cbx * cbx + cby * cby;
  return s * Math.sqrt(da < db ? da : db);
}

/** Ellipsoid centered at c with semi-axes (rx, ry, rz) (IQ approximation). */
export function sdEllipsoid(
  px: number, py: number, pz: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
): number {
  const x = px - cx;
  const y = py - cy;
  const z = pz - cz;
  const ax = x / rx;
  const ay = y / ry;
  const az = z / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / rx;
  const by = ay / ry;
  const bz = az / rz;
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  if (k1 < 1e-12) {
    let m = rx < ry ? rx : ry;
    if (rz < m) m = rz;
    return -m;
  }
  return (k0 * (k0 - 1)) / k1;
}

/** Rounded box: center c, half extents h (including rounding), yaw (precomputed cos/sin), corner radius rnd. */
export function sdBox(
  px: number, py: number, pz: number,
  cx: number, cy: number, cz: number,
  hx: number, hy: number, hz: number,
  cosY: number, sinY: number, rnd: number,
): number {
  const wx = px - cx;
  const wy = py - cy;
  const wz = pz - cz;
  // world → local (inverse of R_y(yaw))
  const lx = wx * cosY - wz * sinY;
  const lz = wx * sinY + wz * cosY;
  const qx = (lx < 0 ? -lx : lx) - hx + rnd;
  const qy = (wy < 0 ? -wy : wy) - hy + rnd;
  const qz = (lz < 0 ? -lz : lz) - hz + rnd;
  const mx = qx > 0 ? qx : 0;
  const my = qy > 0 ? qy : 0;
  const mz = qz > 0 ? qz : 0;
  let inner = qx > qy ? qx : qy;
  if (qz > inner) inner = qz;
  if (inner > 0) inner = 0;
  return Math.sqrt(mx * mx + my * my + mz * mz) + inner - rnd;
}
