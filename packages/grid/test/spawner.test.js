import { describe, it, expect } from "vitest";
import { createSpawner, SPAWNER_STRATEGIES } from "../src/spawner.js";

describe("SPAWNER_STRATEGIES", () => {
  it("lists every strategy name createSpawner accepts", () => {
    expect(SPAWNER_STRATEGIES).toContain("random");
    for (const strategy of SPAWNER_STRATEGIES) {
      expect(() => createSpawner({ candidates: ["a"], strategy })).not.toThrow();
    }
  });
});

describe("createSpawner", () => {
  it("only ever returns candidates from the given set", () => {
    const spawner = createSpawner({ candidates: ["a", "b", "c"] });
    for (let i = 0; i < 50; i++) {
      expect(["a", "b", "c"]).toContain(spawner.next());
    }
  });

  it("peek() shows exactly what the following next() call returns", () => {
    const spawner = createSpawner({ candidates: ["a", "b", "c"] });
    for (let i = 0; i < 20; i++) {
      const previewed = spawner.peek();
      expect(spawner.next()).toBe(previewed);
    }
  });

  it("works with a single candidate", () => {
    const spawner = createSpawner({ candidates: ["only"] });
    expect(spawner.peek()).toBe("only");
    expect(spawner.next()).toBe("only");
    expect(spawner.next()).toBe("only");
  });

  it("throws on an unknown strategy", () => {
    expect(() => createSpawner({ candidates: ["a"], strategy: "bogus" })).toThrow(/Unknown spawner strategy/);
  });

  it("throws when given no candidates", () => {
    expect(() => createSpawner({ candidates: [] })).toThrow(/at least one candidate/);
  });

  it("is not shared state across separate spawner instances", () => {
    const a = createSpawner({ candidates: ["x"] });
    const b = createSpawner({ candidates: ["y"] });
    expect(a.next()).toBe("x");
    expect(b.next()).toBe("y");
  });
});
