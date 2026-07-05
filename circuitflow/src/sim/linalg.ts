/**
 * Dichte lineaire oplosser via Gauss-eliminatie met partieel pivoteren.
 * Lost A·x = b op. Retourneert `null` als de matrix (bijna) singulier is —
 * de solver vangt dat op en laat dat eiland op 0 staan i.p.v. te ontploffen.
 */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];

  // Augmented matrix [A | b], op kopieën zodat de invoer onaangetast blijft.
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partieel pivoteren: rij met de grootste |waarde| in deze kolom naar boven.
    let pivot = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(M[r][col]);
      if (v > maxAbs) {
        maxAbs = v;
        pivot = r;
      }
    }
    if (maxAbs < 1e-12) return null; // singulier

    if (pivot !== col) {
      const tmp = M[pivot];
      M[pivot] = M[col];
      M[col] = tmp;
    }

    // Elimineer onder de pivot.
    const pivVal = M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / pivVal;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  // Terugsubstitutie.
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * x[c];
    x[r] = s / M[r][r];
  }
  return x;
}
