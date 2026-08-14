import type { FoodItem } from "./types";

export class SpatialGrid {
  private cellSize: number;
  // Map keyed by 32-bit integer hash to avoid string allocations
  private grid: Map<number, FoodItem[]> = new Map();
  private pool: FoodItem[][] = [];

  constructor(cellSize = 140) {
    this.cellSize = cellSize;
  }

  // Integer hash combining cx and cy (-16384 to 16383 range supported)
  private getHash(cx: number, cy: number): number {
    return ((cx + 16384) << 16) | ((cy + 16384) & 0xffff);
  }

  public clear() {
    for (const cell of this.grid.values()) {
      cell.length = 0;
      if (this.pool.length < 500) {
        this.pool.push(cell);
      }
    }
    this.grid.clear();
  }

  public insert(food: FoodItem) {
    const cx = Math.floor(food.x / this.cellSize);
    const cy = Math.floor(food.y / this.cellSize);
    const hash = this.getHash(cx, cy);

    let cell = this.grid.get(hash);
    if (!cell) {
      cell = this.pool.pop() || [];
      this.grid.set(hash, cell);
    }
    cell.push(food);
  }

  public rebuild(foods: FoodItem[]) {
    this.clear();
    const len = foods.length;
    for (let i = 0; i < len; i++) {
      this.insert(foods[i]);
    }
  }

  public queryNearby(x: number, y: number, radius: number, outArray?: FoodItem[]): FoodItem[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const result = outArray || [];
    result.length = 0;
    const radSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.grid.get(this.getHash(cx, cy));
        if (cell) {
          const cellLen = cell.length;
          for (let i = 0; i < cellLen; i++) {
            const f = cell[i];
            const dx = f.x - x;
            const dy = f.y - y;
            const distSq = dx * dx + dy * dy;
            const maxHit = radius + f.radius;
            if (distSq <= maxHit * maxHit) {
              result.push(f);
            }
          }
        }
      }
    }

    return result;
  }
}
