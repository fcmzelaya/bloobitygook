import { describe, it, expect } from "vitest";
import { MAZE_ROWS, ROWS, COLS, TUNNEL_ROW, isWallAt, cellKindAt } from "../src/maze.js";

describe("MAZE_ROWS shape", () => {
  it("every row is the same width", () => {
    for (const row of MAZE_ROWS) {
      expect(row).toHaveLength(COLS);
    }
  });

  it("the tunnel row has no boundary walls", () => {
    expect(MAZE_ROWS[TUNNEL_ROW][0]).not.toBe("#");
    expect(MAZE_ROWS[TUNNEL_ROW][COLS - 1]).not.toBe("#");
  });

  it("every other row is walled at both edges", () => {
    for (let row = 0; row < ROWS; row++) {
      if (row === TUNNEL_ROW) continue;
      expect(MAZE_ROWS[row][0]).toBe("#");
      expect(MAZE_ROWS[row][COLS - 1]).toBe("#");
    }
  });
});

describe("isWallAt", () => {
  it("treats anything outside the vertical bounds as a wall", () => {
    expect(isWallAt(0, -1)).toBe(true);
    expect(isWallAt(0, ROWS)).toBe(true);
  });

  it("treats outside the horizontal bounds as open only on the tunnel row", () => {
    expect(isWallAt(-1, TUNNEL_ROW)).toBe(false);
    expect(isWallAt(COLS, TUNNEL_ROW)).toBe(false);
    expect(isWallAt(-1, 0)).toBe(true);
    expect(isWallAt(COLS, 0)).toBe(true);
  });

  it("matches the '#' characters in the maze data", () => {
    expect(isWallAt(0, 0)).toBe(true); // corner
    expect(isWallAt(1, 1)).toBe(false); // just inside
  });
});

// The real safety net: a hand-authored maze is exactly the kind of thing
// that's easy to get subtly wrong (an isolated pocket a pellet could get
// stranded in, unreachable and uncollectable). Flood-fill from a known
// open cell and confirm it reaches every non-wall cell, rather than
// trusting the by-hand walkthrough alone.
describe("connectivity", () => {
  it("every open cell is reachable from the player's spawn point", () => {
    const start = { col: 5, row: 4 }; // tunnel row, center
    expect(isWallAt(start.col, start.row)).toBe(false);

    const visited = new Set([`${start.col},${start.row}`]);
    const queue = [start];
    while (queue.length > 0) {
      const { col, row } = queue.shift();
      for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nc = col + dc;
        const nr = row + dr;
        if (nr < 0 || nr >= ROWS) continue;
        if (nc < 0 || nc >= COLS) continue; // don't chase the tunnel off into infinity
        const key = `${nc},${nr}`;
        if (visited.has(key) || isWallAt(nc, nr)) continue;
        visited.add(key);
        queue.push({ col: nc, row: nr });
      }
    }

    const unreachable = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!isWallAt(col, row) && !visited.has(`${col},${row}`)) unreachable.push([col, row]);
      }
    }
    expect(unreachable).toEqual([]);
  });
});

describe("cellKindAt", () => {
  it("finds power pellets at the four corners", () => {
    expect(cellKindAt(1, 1)).toBe("power");
    expect(cellKindAt(9, 1)).toBe("power");
    expect(cellKindAt(1, 7)).toBe("power");
    expect(cellKindAt(9, 7)).toBe("power");
  });

  it("finds regular pellets on other open cells", () => {
    expect(cellKindAt(2, 1)).toBe("pellet");
  });

  it("returns null on walls", () => {
    expect(cellKindAt(0, 0)).toBeNull();
  });

  it("returns null on skipped cells (spawn points)", () => {
    const skip = new Set(["5,4"]);
    expect(cellKindAt(5, 4, skip)).toBeNull();
  });

  it("returns null out of bounds rather than throwing", () => {
    expect(() => cellKindAt(-1, TUNNEL_ROW)).not.toThrow();
    expect(cellKindAt(-1, TUNNEL_ROW)).toBeNull();
  });
});
