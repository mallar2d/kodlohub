import type { FoodItem } from "./types";

export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, FoodItem[]> = new Map();

  constructor(cellSize = 120) {
    this.cellSize = cellSize;
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  public clear() {
    this.grid.clear();
  }

  public insert(food: FoodItem) {
    const cx = Math.floor(food.x / this.cellSize);
    const cy = Math.floor(food.y / this.cellSize);
    const key = this.getKey(cx, cy);

    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(food);
  }

  public rebuild(foods: FoodItem[]) {
    this.clear();
    for (let i = 0; i < foods.length; i++) {
      this.insert(foods[i]);
    }
  }

  public queryNearby(x: number, y: number, radius: number): FoodItem[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    const result: FoodItem[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.grid.get(this.getKey(cx, cy));
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const f = cell[i];
            const dx = f.x - x;
            const dy = f.y - y;
            const distSq = dx * dx + dy * dy;
            const maxDist = radius + f.radius;
            if (distSq <= maxDist * maxDist) {
              result.push(f);
            }
          }
        }
      }
    }

    return result;
  }
}
