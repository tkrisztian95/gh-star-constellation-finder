/** Unit-normalize a vector so cosine similarity reduces to a dot product. A
 * zero vector stays zero (cosine against it is 0). */
export function normalize(vec: number[]): Float32Array {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  const out = new Float32Array(vec.length);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) out[i] = vec[i]! / norm;
  }
  return out;
}

/** Dot product of two equal-length vectors. With unit-normalized inputs this is
 * cosine similarity. */
export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}
