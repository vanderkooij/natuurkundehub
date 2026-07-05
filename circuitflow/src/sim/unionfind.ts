/**
 * Union-find (disjoint set) over knoopsleutels. Gebruikt om alle vertices die
 * via weerstandsloze draden of gesloten schakelaars verbonden zijn samen te
 * voegen tot één elektrische knoop (stap 1 van de solver).
 */
export class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  /** Zorgt dat `x` bestaat en geeft de wortel terug (met padcompressie). */
  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }

  /** Registreer een knoop zonder iets samen te voegen. */
  add(x: string): void {
    this.find(x);
  }

  /** Voeg de klassen van `a` en `b` samen (union by rank). */
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }
}
