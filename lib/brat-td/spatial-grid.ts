/**
 * Uniform spatial grid for O(n²) → O(n log n) spatial queries.
 *
 * Divides the game field into fixed-size cells. Each frame we rebuild the
 * grid with current entity positions, then answer radius queries in roughly
 * O(entities in nearby cells) instead of O(all entities).
 *
 * Used by the engine to accelerate:
 *  - Tower → enemy targeting
 *  - Projectile → enemy collision
 *  - Mine → enemy proximity checks
 *  - AoE effects
 */

const DEFAULT_CELL_SIZE = 80;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;

export class SpatialGrid<T extends { x: number; y: number }> {
  private cells: (T[] | undefined)[];
  private cellSize: number;
  private cols: number;
  private rows: number;

  constructor(cellSize = DEFAULT_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(GAME_WIDTH / cellSize);
    this.rows = Math.ceil(GAME_HEIGHT / cellSize);
    this.cells = new Array(this.cols * this.rows);
  }

  /** Remove all entries. Call before re-populating. */
  clear(): void {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = undefined;
    }
  }

  /** Insert one item into its containing cell. */
  insert(item: T): void {
    const col = Math.floor(item.x / this.cellSize);
    const row = Math.floor(item.y / this.cellSize);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    const idx = row * this.cols + col;
    const cell = this.cells[idx];
    if (cell) {
      cell.push(item);
    } else {
      this.cells[idx] = [item];
    }
  }

  /** Insert all items from an iterable. */
  insertAll(items: Iterable<T>): void {
    for (const item of items) this.insert(item);
  }

  /**
   * Return every item whose cell overlaps a circle centered at (x,y) with
   * the given radius.  Callers MUST still post-filter with an exact
   * distance check; this is a broad-phase query.
   */
  queryRadius(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      const base = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[base + col];
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          result.push(cell[i]);
        }
      }
    }
    return result;
  }

  /**
   * Returns the first item within the circle, or `undefined`.
   * Useful for single-target queries where we only need the nearest hit.
   */
  queryFirstInRadius(
    x: number,
    y: number,
    radius: number,
    predicate?: (item: T) => boolean,
  ): T | undefined {
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    const r2 = radius * radius;

    for (let row = minRow; row <= maxRow; row++) {
      const base = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[base + col];
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const item = cell[i];
          if (predicate && !predicate(item)) continue;
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) return item;
        }
      }
    }
    return undefined;
  }

  /** Number of columns in the grid (exposed for tests). */
  get columnCount(): number {
    return this.cols;
  }

  /** Number of rows in the grid (exposed for tests). */
  get rowCount(): number {
    return this.rows;
  }
}
