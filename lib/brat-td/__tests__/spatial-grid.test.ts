import { describe, it, expect } from 'vitest';
import { SpatialGrid } from '../spatial-grid';

interface TestEntity {
  x: number;
  y: number;
  id: number;
}

describe('SpatialGrid', () => {
  it('can insert and query entities within radius', () => {
    const grid = new SpatialGrid<TestEntity>(80);

    const entities: TestEntity[] = [
      { x: 100, y: 100, id: 1 },
      { x: 120, y: 120, id: 2 },
      { x: 400, y: 400, id: 3 },
      { x: 700, y: 100, id: 4 },
    ];

    grid.insertAll(entities);

    const nearby = grid.queryRadius(100, 100, 50);
    expect(nearby.map((e) => e.id).sort()).toEqual([1, 2]);
  });

  it('returns empty for queries outside all entities', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    grid.insert({ x: 100, y: 100, id: 1 });
    expect(grid.queryRadius(700, 400, 10)).toEqual([]);
  });

  it('clear removes all entities', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    grid.insert({ x: 100, y: 100, id: 1 });
    grid.clear();
    expect(grid.queryRadius(100, 100, 500)).toEqual([]);
  });

  it('insertAll adds all entities', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    const items: TestEntity[] = Array.from({ length: 100 }, (_, i) => ({
      x: Math.random() * 800,
      y: Math.random() * 500,
      id: i,
    }));
    grid.insertAll(items);

    // Query the entire field and count
    const all = grid.queryRadius(400, 250, 1000);
    expect(all.length).toBe(100);
  });

  it('exposes column and row counts', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    expect(grid.columnCount).toBe(10); // 800 / 80
    expect(grid.rowCount).toBe(7); // ceil(500 / 80)
  });

  it('excludes out-of-bounds entities', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    grid.insert({ x: -100, y: -100, id: 1 });
    grid.insert({ x: 900, y: 600, id: 2 });
    grid.insert({ x: 400, y: 250, id: 3 });

    const all = grid.queryRadius(400, 250, 1000);
    expect(all.map((e) => e.id)).toEqual([3]);
  });

  it('handles empty grid gracefully', () => {
    const grid = new SpatialGrid<TestEntity>(80);
    expect(grid.queryRadius(400, 250, 500)).toEqual([]);
  });
});
